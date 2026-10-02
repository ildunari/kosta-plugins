export type CacheClock = number

declare module 'claude-code' {
  interface PluginState {
    'cache-timer': { lastHit: CacheClock; now: CacheClock; warned: boolean; attempted: boolean; compacted: boolean }
  }
}
