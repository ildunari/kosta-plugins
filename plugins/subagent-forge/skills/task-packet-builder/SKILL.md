---
name: task-packet-builder
description: Build compact, high-quality task packets for subagents with objective, scope, ranking criteria, stop rules, red flags, and expected report style.
---

Use this skill when you want to hand a subagent a task that is precise enough to succeed without bloating the prompt.

## Good packet shape

Every packet should include:

1. **objective** — what the worker is trying to decide or discover
2. **scope** — what is in and out
3. **inputs** — files, URLs, repos, product names, constraints, or prior findings
4. **ranking criteria** — what matters most
5. **source priorities** — what to trust first
6. **report style** — quick / normal / deep / adversarial
7. **stop rules** — when enough evidence has been gathered
8. **red flags** — hype, stale docs, setup nightmares, weak evidence, etc.

## Packet rules

- Keep the objective singular when possible.
- Do not mix discovery, implementation, and final writing unless that is truly the task.
- Tell the worker how much breadth is enough.
- Tell the worker what to exclude.
- Tell the worker what kind of answer the parent needs back.

## Output

Produce a packet in the format from template.md, filled for the current task.
