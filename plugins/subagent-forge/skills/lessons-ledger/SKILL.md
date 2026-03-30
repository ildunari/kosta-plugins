---
name: lessons-ledger
description: >
  Save compact project-local lessons, prompt improvements, source blacklists/whitelists,
  and recurring failure modes after a task. Use when wrapping up a research task,
  "save what we learned", "log this lesson", or when a useful pattern emerges.
---

Use this skill after finishing a task when there is something worth retaining in the current project.

## Files to maintain

- `.claude/subagent-forge/LESSONS.md`
- `.claude/subagent-forge/KNOWN_SOURCES.md`

Create them if they do not exist.

## What belongs in LESSONS.md

Keep entries compact and high-signal:

- prompt patterns that worked
- failure modes to avoid next time
- coordination rules that prevented waste
- file / repo patterns worth remembering
- recurring edge cases

## What belongs in KNOWN_SOURCES.md

Track:

- high-trust sources worth reusing
- low-trust or blacklisted sources to avoid
- maintainer pages, issue threads, release feeds, or docs hubs that proved useful

## Rules

- append or refine; do not rewrite history gratuitously
- keep each lesson short
- remove stale or duplicated notes when obvious
- do not store secrets, credentials, or sensitive data
