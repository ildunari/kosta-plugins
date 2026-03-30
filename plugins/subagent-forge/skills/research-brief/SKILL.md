---
name: research-brief
description: >
  Turn a vague topic into an execution-ready research brief. Use when the user says
  "research this", "look into this", "what should we find out about", or provides
  an ambiguous topic that needs sharpening before subagents can work on it.
---

Build a compact but execution-ready research brief for the topic or decision the user provided.

Sharpen the request without overcomplicating it.

## What to produce

Return a structured brief with these sections:

1. **Objective**
   - Restate the real question or decision.

2. **Decision frame**
   - What choice is actually being made?
   - What counts as a good answer?

3. **Constraints and assumptions**
   - Explicit constraints from the request
   - Reasonable assumptions you are making so work can start now

4. **Search plan**
   - Broad-first search path
   - Targeted follow-up path
   - Official sources to prioritize
   - Community or repo sources to verify against

5. **Recommended worker lineup**
   - Which subagents from this plugin to use
   - Which report mode each should use
   - What each worker should answer

6. **Deliverable shape**
   - What the final synthesis should contain
   - What to exclude to keep it tight

7. **Failure modes to watch**
   - Where this research could go wrong, stale, or fluffy

## Rules

- Keep it practical.
- Do not ask clarifying questions unless the request is truly blocked.
- Prefer strong assumptions over paralysis, but label them.
- This skill prepares the work; it does not do the full research report itself.
