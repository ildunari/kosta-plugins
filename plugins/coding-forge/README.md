# Agentic Build Loop

Phased build orchestration with sub-agents for research, TDD, implementation, and dual code review. Each phase goes through a gated build cycle before committing.

## How It Works

You describe what to build. The orchestrator breaks it into phases, then for each phase runs a disciplined cycle:

1. **Research** — agent reads the codebase scope
2. **Test First** — agent writes failing tests
3. **Implement** — agent writes code to pass tests
4. **Build Gate** — orchestrator verifies the build
5. **Test Gate** — orchestrator verifies all tests pass
6. **Dual Review** — two agents review in parallel (code quality + domain-specific)
7. **Fix** — orchestrator fixes critical findings
8. **Commit** — phase complete, move to next

## Components

### Skill
- `build-loop` — The orchestrator's playbook. Plans phases, runs the build cycle, gates between phases.

### Agents
- `phase-researcher` — Reads codebase before each phase (read-only, Haiku)
- `test-writer` — Writes failing tests before implementation (Sonnet)
- `phase-implementer` — Writes minimal code to pass tests (Sonnet)
- `code-reviewer` — General code quality review (read-only, Sonnet)

### Reference Files
- `review-dimensions.md` — Severity scale and review checklist
- `reviewer-selection.md` — Domain-specific reviewer mapping
- `error-recovery.md` — Agent failures, gate loops, context overflow
- `platform-commands.md` — Build/test command detection by project type

## Usage

Trigger naturally: "Build this feature phase by phase", "Implement this spec using the build loop", or "Use the build loop to add X".

The orchestrator will:
1. Interview you if requirements are unclear
2. Write a phased plan and get your confirmation
3. Execute each phase through the full build cycle
4. Commit after each phase passes all gates

## Setup

No environment variables or external services required. The plugin uses only Claude Code's built-in tools.
