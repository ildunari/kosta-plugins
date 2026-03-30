---
name: rank-and-prune
description: Score candidate tools, plugins, agents, products, or repos, keep the high-signal subset, and cut overlap, abandonment, or low-value options.
---

Use this skill when the problem is not "find everything," but "find what survives a harsh cut."

## Pruning logic

Keep candidates that:
- solve a real use case cleanly
- are maintained or clearly still alive
- have evidence beyond surface popularity
- do not duplicate a stronger option already in the set
- are not bloated relative to the job they do

Cut candidates that:
- overlap heavily with a better option
- are abandoned or quietly stale
- look impressive but are weak in actual use
- are mostly enterprise / marketing / SEO fluff for this use case
- add token cost without adding meaningful capability

## Output

Return:
- keep
- cut
- merge / adapt
- uncertain

For each item, state the reason in one or two sharp sentences.
