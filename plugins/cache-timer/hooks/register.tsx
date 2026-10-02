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
// Set once this idle stretch has auto-compacted (or tried to); only a new prompt clears it.
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

async function autoCompact($: EngineInterface) {
  // Claim the one shot before any await, so the next tick can't start a second compaction.
  await update($, compacted, () => true)

  const { context } = await $.session.usage()
  if ((context.tokens ?? 0) < MIN_COMPACT_TOKENS) return

  try {
    const { skip } = await $.session.compact({
      instructions: 'Session went idle; keep open tasks, decisions, file paths and the current plan.',
    })
    $.ui.toast(skip ? `Auto-compact skipped: ${skip}` : 'Cache about to expire: compacted the conversation once')
  } catch {
    // Rejects while a turn runs; that turn re-warms the cache anyway, so give the shot back.
    await update($, compacted, () => false)
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
        $.ui.toast('Prompt cache: auto-compacting in 2m unless you send something')
      }
      if (hit > 0 && left > 0 && left <= COMPACT_MS && !(await read($, compacted))) {
        await autoCompact($)
      }
      await show($)
    })
    return r
  })

  // A real prompt starts a new stretch of work, so the next idle stretch may compact once again.
  on('prompt.submit', async ($, e, next) => {
    await update($, compacted, () => false)
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const r = yield* next(e)
    // Subagents and the compaction fork run on their own cache prefix; only main-thread requests count.
    if (e.agentId === undefined && r.stopReason !== null) {
      const t = await $.clock.now()
      await update($, lastHit, () => t)
      await update($, now, () => t)
      await update($, warned, () => false)
      await show($)
    }
    return r
  })
}
