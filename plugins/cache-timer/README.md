# cache-timer

A Claude Code mod (function-hook plugin) that tracks the prompt-cache window of the main conversation.

- **Status line:** `🟢 ▰▰▰▰▰▰▰▰▱▱ 47:12` beside the model name. The dot goes 🟢 above half the window, 🟡 down to 15%, 🔴 below, ⚪ `cold` once it has expired. The clock restarts from the moment a main-thread model request is sent (counted once it completes); subagent and compaction requests run on their own cache prefix and are ignored.
- **Warning:** at 12 minutes left, a toast says an auto-compact is coming in 2 minutes unless you send something.
- **Auto-compact, once:** at 10 minutes left, while the cache is still warm, it runs the same compaction as `/compact`. A flag claimed before the call means it fires at most once per idle stretch; only the next completed main-thread request clears it, and a compaction refused mid-turn stays spent instead of retrying. It skips contexts under 40k tokens and gives the shot back if a turn is running. 📦 marks a stretch that compacted.

The window is assumed to be the 1-hour TTL (`TTL_MS`). Sessions on the 5-minute TTL (usage overage, some API-key setups) will see the wrong countdown. The thresholds are constants at the top of `hooks/register.tsx`.

Install: `claude plugin install cache-timer@kosta-plugins`. Check: `claude plugin validate plugins/cache-timer`.
