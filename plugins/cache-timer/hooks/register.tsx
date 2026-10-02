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

// Each flag records the generation (the lastHit it was set for) rather than a boolean, so a
// stale tick writing for an old generation can never block or mark a newer one.
const lastHit = atom({ plugin: 'cache-timer', key: 'lastHit' } as const, 0)
const now = atom({ plugin: 'cache-timer', key: 'now' } as const, 0)
const warnedFor = atom({ plugin: 'cache-timer', key: 'warnedFor' } as const, 0)
const attemptedFor = atom({ plugin: 'cache-timer', key: 'attemptedFor' } as const, 0)
const compactedFor = atom({ plugin: 'cache-timer', key: 'compactedFor' } as const, 0)

// Set synchronously, so two ticks can't both pass the state read before either writes it.
let compacting = false

// The status line is plain text, so the dot carries the color.
function dotFor(fraction: number) {
  if (fraction > 0.5) return '🟢'
  if (fraction > 0.15) return '🟡'
  return '🔴'
}

async function show($: EngineInterface) {
  const hit = await read($, lastHit)
  if (hit === 0) return $.ui.status(undefined)
  const isCompacted = (await read($, compactedFor)) === hit
  const left = Math.max(0, TTL_MS - ((await read($, now)) - hit))
  if (left === 0) return $.ui.status(`⚪ ${'▱'.repeat(BAR)} ${isCompacted ? 'cold · compacted' : 'cold'}`)

  const fraction = left / TTL_MS
  const filled = Math.max(1, Math.round(fraction * BAR))
  const m = Math.floor(left / 60000)
  const s = Math.floor((left % 60000) / 1000)
  $.ui.status(`${dotFor(fraction)} ${'▰'.repeat(filled)}${'▱'.repeat(BAR - filled)} ${m}:${String(s).padStart(2, '0')}${isCompacted ? ' 📦' : ''}`)
}

async function isWorthCompacting($: EngineInterface) {
  const { context } = await $.session.usage()
  return (context.tokens ?? 0) >= MIN_COMPACT_TOKENS
}

// `hit` is the generation the tick saw; a request reaching the model meanwhile moves lastHit and calls it off.
async function autoCompact($: EngineInterface, hit: number) {
  if (compacting) return
  compacting = true
  try {
    await update($, attemptedFor, () => hit)
    if (!(await isWorthCompacting($))) return
    // Recheck right before compacting: a request that just reached the model re-warmed the cache.
    if ((await read($, lastHit)) !== hit) return

    const { skip } = await $.session.compact({
      instructions: 'Session went idle; keep open tasks, decisions, file paths and the current plan.',
    })
    if (skip) {
      $.ui.toast(`Auto-compact skipped: ${skip}`)
    } else {
      await update($, compactedFor, () => hit)
      $.ui.toast('Cache about to expire: compacted the conversation once')
    }
  } catch {
    // Rejects while a turn runs. Keep this generation's shot spent: that turn's request starts a
    // new generation with a fresh shot. Giving it back here would retry every tick.
  } finally {
    compacting = false
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

      // Only while the two minutes are still ahead: after a sleep that jumps past them, warning now
      // would announce a compaction that is already starting.
      if (hit > 0 && left > COMPACT_MS && left <= WARN_MS && (await read($, warnedFor)) !== hit) {
        await update($, warnedFor, () => hit)
        if (await isWorthCompacting($)) {
          $.ui.toast('Prompt cache: auto-compacting in 2m unless you send something')
        }
      }
      if (hit > 0 && left > 0 && left <= COMPACT_MS && (await read($, attemptedFor)) !== hit) {
        await autoCompact($, hit)
      }
      await show($)
    })
    return r
  })

  on('turn.step', async function* ($, e, next) {
    // The cache is read and written when the request is sent, so the window starts here,
    // not when a long response finishes streaming.
    let sentAt = await $.clock.now()
    // A content chunk means the model answered, so the request touched the cache, even if the
    // stream is then interrupted or fails. Engine chunks don't count: a retry marker can come
    // before any response.
    let reachedModel = false
    const stream = next(e)
    try {
      // `for await` closes the stream if this hook is cancelled mid-stream, as `yield*` would,
      // so the request's own cleanup still runs; `stream.result` hands the step's result up.
      for await (const chunk of stream) {
        if (chunk.kind !== 'engine') {
          reachedModel = true
        } else if (!reachedModel) {
          // Before any answer an engine item may mark a retry, which sends the request again;
          // restarting here keeps the window from starting early by the retry's backoff.
          sentAt = await $.clock.now()
        }
        yield chunk
      }
      return await stream.result
    } finally {
      // Subagents and the compaction fork run on their own cache prefix; only main-thread requests count.
      if (e.agentId === undefined && reachedModel) {
        await update($, lastHit, () => sentAt)
        const t = await $.clock.now()
        await update($, now, () => t)
        await show($)
      }
    }
  })
}
