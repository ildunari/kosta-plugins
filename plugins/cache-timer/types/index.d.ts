/** Milliseconds since the epoch. */
export type CacheClock = number

declare module 'claude-code' {
  interface PluginState {
    'cache-timer': {
      /** When the last main-thread request that reached the model was sent; it names the cache generation. */
      lastHit: CacheClock
      now: CacheClock
      /** The generation the 12-minute warning was shown for. */
      warnedFor: CacheClock
      /** The generation whose one auto-compact shot is spent. */
      attemptedFor: CacheClock
      /** The generation a compaction actually stood for (drives 📦). */
      compactedFor: CacheClock
    }
  }
}
