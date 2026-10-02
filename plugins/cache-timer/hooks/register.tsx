import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

// This session's requests use the 1-hour prompt-cache TTL; it drops to 5m in usage overage.
const TTL_MS = 60 * 60 * 1000
// Warn two minutes ahead of the compaction, so there's time to send something instead.
const WARN_MS = 12 * 60 * 1000
// Compact while the cache is still warm, so the summarizer's request reads the
// prefix from cache and the next prompt re-caches only the short summary.
const COMPACT_MS = 10 * 60 * 1000
// Below this the context is cheap to re-cache anyway; not worth losing detail.
const MIN_COMPACT_TOKENS = 40_000
const BAR = 10

const lastHit = atom({ plugin: 'cache-timer', key: 'lastHit' } as const, 0)
const now = atom({ plugin: 'cache-timer', key: 'now' } as const, 0)
const warned = atom({ plugin: 'cache-timer', key: 'warned' } as const, false)
// The one shot: set once this idle stretch has tried to compact; only a completed main-thread request clears it.
const attempted = atom({ plugin: 'cache-timer', key: 'attempted' } as const, false)
// Display only: set when a compaction actually stood, so 📦 never marks a skip or a refusal.
const compacted = atom({ plugin: 'cache-timer', key: 'compacted' } as const, false)

// The status line is plain text, so the dot carries the color.
function dotFor(fraction: number) {
  if (fraction > 0.5) return '🟢'
  if (fraction > 0.15) return '🟡'
  return '🔴'
}

async function show($: EngineInterface) {
  const hit = await read($, lastHit)
  if (hit === 0) return $.ui.status(undefined)
  const left = Math.max(0, TTL_MS - ((await read($, now)) - hit))
  if (left === 0) {
    const tail = (await read($, compacted)) ? 'cold · compacted' : 'cold'
    return $.ui.status(`⚪ ${'▱'.repeat(BAR)} ${tail}`)
  }

  const fraction = left / TTL_MS
  const filled = Math.max(1, Math.round(fraction * BAR))
  const m = Math.floor(left / 60000)
  const s = Math.floor((left % 60000) / 1000)
  const mark = (await read($, compacted)) ? ' 📦' : ''
  $.ui.status(`${dotFor(fraction)} ${'▰'.repeat(filled)}${'▱'.repeat(BAR - filled)} ${m}:${String(s).padStart(2, '0')}${mark}`)
}

// Set synchronously, so two ticks can't both pass the state read before either writes it.
let compacting = false

async function isWorthCompacting($: EngineInterface) {
  const { context } = await $.session.usage()
  return (context.tokens ?? 0) >= MIN_COMPACT_TOKENS
}

// `hit` is the request time the tick saw; a turn finishing meanwhile moves lastHit and calls it off.
async function autoCompact($: EngineInterface, hit: number) {
  if (compacting) return
  compacting = true
  try {
    await update($, attempted, () => true)
    await compactOnce($, hit)
  } finally {
    compacting = false
  }
}

async function compactOnce($: EngineInterface, hit: number) {
  if (!(await isWorthCompacting($))) return
  // Recheck right before compacting: a turn that just completed re-warmed the cache.
  if ((await read($, lastHit)) !== hit) return

  try {
    const { skip } = await $.session.compact({
      instructions: 'Session went idle; keep open tasks, decisions, file paths and the current plan.',
    })
    if (skip) {
      $.ui.toast(`Auto-compact skipped: ${skip}`)
    } else {
      await update($, compacted, () => true)
      $.ui.toast('Cache about to expire: compacted the conversation once')
    }
  } catch {
    // Rejects while a turn runs. Keep the shot spent: that turn re-warms the cache, and its
    // completed request re-arms the shot below. Giving it back here would retry every tick.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    $.clock.every(1000, async () => {
      const t = await $.clock.now()
      await update($, now, () => t)
      const hit = await read($, lastHit)
      const left = TTL_MS - (t - hit)

      if (hit > 0 && left > 0 && left <= WARN_MS && !(await read($, warned))) {
        await update($, warned, () => true)
        if (await isWorthCompacting($)) {
          $.ui.toast('Prompt cache: auto-compacting in 2m unless you send something')
        }
      }
      if (hit > 0 && left > 0 && left <= COMPACT_MS && !(await read($, attempted))) {
        await autoCompact($, hit)
      }
      await show($)
    })
    return r
  })

  on('turn.step', async function* ($, e, next) {
    // The cache is read and written when the request is sent, so the window starts here,
    // not when a long response finishes streaming.
    const sentAt = await $.clock.now()
    const r = yield* next(e)
    // Subagents and the compaction fork run on their own cache prefix; only main-thread requests count.
    if (e.agentId === undefined && r.stopReason !== null) {
      await update($, lastHit, () => sentAt)
      const t = await $.clock.now()
      await update($, now, () => t)
      await update($, warned, () => false)
      // A completed main-thread request starts a new stretch, so the next idle stretch may compact once again.
      await update($, attempted, () => false)
      await update($, compacted, () => false)
      await show($)
    }
    return r
  })
}
