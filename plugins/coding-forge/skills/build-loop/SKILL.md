---
name: build-loop
description: >
  Orchestrate phased software implementation using sub-agents for research,
  TDD, coding, and dual code review — with hard gates between phases. Use when
  the user asks to "build this", "implement this feature", "build it phase by
  phase", "use the build loop", or has a spec/plan to execute incrementally.
  Do not use for single-file edits, quick bug fixes, or tasks with no build step.
---

You are the **master orchestrator**. You coordinate, delegate, gate, and fix.
Sub-agents execute. Never write implementation code directly — dispatch agents.
Only fix P0/P1 review findings yourself (you have both review reports in context).

## Routing

| Signal | Action |
|--------|--------|
| No clear requirements yet | Offer to interview the user, then write a spec |
| Has requirements, no phase plan | Go to **Plan** |
| Has a phase plan ready | Go to **Execute** |
| Mid-execution, phase failed a gate | Go to **Error Recovery** in `references/error-recovery.md` |

## Plan

Break the work into sequential phases. Each phase is a coherent unit of work
that can be built, tested, and reviewed independently.

Write a phase plan document with this structure per phase:

```
Phase N: [name]
Goal: [one sentence — what "done" looks like]
Build: [exact shell command]
Test: [exact shell command]
Scope: [files to create or modify]
Dependencies: [phases that must complete first]
```

Rules for good phases:
- Each phase produces a buildable, testable increment.
- Scope is small enough that one agent can implement it (3-8 files max).
- Later phases build on earlier ones — no circular dependencies.
- The plan is a living document. Update it when reality diverges.

Save the plan to a file. Get user confirmation before executing.

## Execute

For each phase, run the build cycle. Before starting a phase, declare:

```
--- Phase N: [name] ---
Goal: [from plan]
Build: [command]
Test: [command]
Scope: [files]
```

### Build Cycle

Run steps 1-5 sequentially. Run steps 6-7 in parallel. Then gate.

**1. Research** — Dispatch `phase-researcher` agent to read files in scope and
report what exists, what's broken, what's missing. Always run this — agents
start with zero context.

**2. Test First** — Dispatch `test-writer` agent with research findings. It
writes failing tests BEFORE implementation. Tests must fail. If they pass, the
behavior already exists (skip to step 6) or the tests are wrong.

**3. Implement** — Dispatch `phase-implementer` agent with failing test paths,
allowed file scope, and the build command. Agent writes minimal code to pass
tests and runs the build before returning.

**4. Build Gate** — Run the build command yourself. Do not trust the agent's
report alone. If it fails, send error output back to step 3. Pre-existing
failures in unrelated files can be noted and skipped.

**5. Test Gate** — Run the test command. All tests must pass — new and
pre-existing. If failures occur, send output back to step 3.

**6-7. Dual Review** (parallel) — Dispatch two read-only review agents:

- `code-reviewer` — correctness, error handling, security, concurrency,
  performance. Read `references/review-dimensions.md` for the full checklist.
- A domain-specific reviewer chosen per project. Read
  `references/reviewer-selection.md` for the mapping.

Both use severity scale P0-P3:
- **P0 Critical** — crashes, security holes, data loss
- **P1 High** — concurrency bugs, architectural violations, missing error handling
- **P2 Medium** — maintainability, test gaps, style
- **P3 Low** — naming, polish

**8. Fix** — Read both review reports. Fix P0 and P1 yourself. Do not delegate
fixes — only you have both reports and full phase context. After fixing, loop
back to step 4 (build gate). P2/P3 do not block the phase.

**9. Commit** — Build passes, tests pass, no P0/P1 remaining. Commit with a
descriptive message, update task tracking, move to next phase.

### Sub-Agent Prompt Contract

Every agent dispatch must include all five:

1. **Task** — one sentence
2. **Files** — exact paths to read/modify
3. **Context** — specs, types, or reference sections needed
4. **Success criterion** — how the agent knows it's done
5. **Constraints** — what NOT to touch

## Red Flags — Stop and Reassess

- Writing implementation code instead of dispatching an agent
- Skipping tests because "it's just config"
- Skipping review because "it's just networking"
- Fixing P2 issues before moving on (scope creep)
- Agent says "build succeeded" without showing output (verify yourself)
- Review agent making changes instead of reporting (reviewers are read-only)
- More than 3 fix cycles on the same phase (split the phase)
- More than 2 failed agent dispatches on the same step (do it yourself)

## Reference Files

| File | Read when... |
|------|-------------|
| `references/review-dimensions.md` | Dispatching or reading review reports |
| `references/reviewer-selection.md` | Choosing the domain-specific reviewer for step 6 |
| `references/error-recovery.md` | Agent fails, gate loops exceed 3, or phase scope is too large |
| `references/platform-commands.md` | Determining build/test commands for the project type |
