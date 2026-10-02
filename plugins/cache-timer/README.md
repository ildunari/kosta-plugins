# cache-timer

A Claude Code mod (function-hook plugin) that tracks the prompt-cache window of the main conversation.

- **Status line:** `🟢 ▰▰▰▰▰▰▰▰▱▱ 47:12` beside the model name. The dot goes 🟢 above half the window, 🟡 down to 15%, 🔴 below, ⚪ `cold` once it has expired. The window restarts from when a main-thread request is sent, once the model has answered it (an interrupted answer counts); subagent and compaction requests run on their own cache prefix and are ignored.
- **Warning:** at 12 minutes left, a toast says an auto-compact is coming in 2 minutes unless you send something. It's skipped when the context is too small to compact, or when the clock has already jumped past the 10-minute mark (after a sleep).
- **Auto-compact, once:** at 10 minutes left, while the cache is still warm, it runs the same compaction as `/compact`. Each cache generation (named by its request time) gets one shot: it's spent before the call, a skip or a mid-turn refusal leaves it spent, and only a new request that reaches the model starts a generation with a fresh shot. It skips contexts under 40k tokens and calls the compaction off if a request re-warmed the cache while it was getting ready. 📦 marks a generation where a compaction actually stood.

The window is assumed to be the 1-hour TTL (`TTL_MS`). Sessions on the 5-minute TTL (usage overage, some API-key setups) will see the wrong countdown. The thresholds are constants at the top of `hooks/register.tsx`.

Install: `claude plugin install cache-timer@kosta-plugins`. Check: `claude plugin validate plugins/cache-timer`.
