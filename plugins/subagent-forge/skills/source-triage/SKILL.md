---
name: source-triage
description: >
  Rank sources by credibility, freshness, firsthand evidence, maintenance health,
  and shill risk. Use when the user says "are these sources good", "rank these",
  "which sources should I trust", or when separating signal from SEO sludge.
---

Use this skill when the task involves evaluating the quality of sources, not just collecting them.

## Source hierarchy

Prefer, in order:

1. official docs, changelogs, releases, repo metadata, papers
2. maintainer or employee statements tied to a concrete artifact
3. GitHub issues, PRs, commit history, discussions
4. detailed community reports from actual users
5. everything else

## Downrank aggressively

- SEO listicles
- affiliate review farms
- scraped "best X" pages with no firsthand evidence
- AI-slop blogs
- stale tutorials that predate major version shifts
- repositories with inflated stars but weak maintenance or setup quality

## GitHub-specific rubric

For repos, do not stop at stars. Check:

- commit recency
- release recency
- unresolved issue patterns
- maintainer responsiveness
- README quality
- examples / demos
- install friction
- license

## Output shape

Return a ranked source stack:

- source
- why it deserves trust or skepticism
- what it is good for
- whether it is safe to cite as a primary basis

If sources disagree, keep both and explain which one is carrying more weight.
