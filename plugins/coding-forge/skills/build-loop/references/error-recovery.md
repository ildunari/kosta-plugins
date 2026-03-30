# Error Recovery

When things go wrong in the build cycle, classify the failure before acting.

## Agent Failure

If a sub-agent fails (context overflow, can't fix build, returns garbage):

1. **Read partial output** — it often contains useful diagnostics even on failure.
2. **Reduce scope** — split the step into fewer files or a single file at a time.
3. **Re-dispatch with tighter prompt** — explicit types, concrete examples,
   fewer responsibilities. Include the error from the failed attempt.
4. **After 2 failed dispatches on the same step** — do it yourself. Debugging
   the agent now costs more than direct implementation.

## Gate Loop Exceeded

If build or test gates fail more than 3 times on the same phase:

1. **The phase scope is too large.** Split it into two smaller phases.
2. Move completed work into a "Phase N-a" commit.
3. Create "Phase N-b" for the remaining work.
4. Restart the build cycle on the smaller phase.

## Pre-existing Failures

Build or test failures that predate the current phase:

- **If unrelated to phase scope** — note them, skip them, continue. Document
  in the commit message: "Pre-existing: [test name] failing before this phase."
- **If related to phase scope** — fix them as part of the phase. They're now
  in scope.

## Review Disagreement

If the two reviewers disagree (one says P0, the other says fine):

1. Read the specific code both are commenting on.
2. Determine which reviewer has the stronger technical argument.
3. If genuinely ambiguous, ask the user for a judgment call.
4. Document the decision in the commit message.

## Context Overflow

If the orchestrator's context is getting heavy (many phases completed):

1. Compact at the phase boundary — summarize completed phases.
2. Keep only: current phase plan, current phase state, review findings in progress.
3. The plan document on disk is the source of truth, not in-context memory.
