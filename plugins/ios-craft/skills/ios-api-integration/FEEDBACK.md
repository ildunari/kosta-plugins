# ios-api-integration Feedback Log

Track what works and what doesn't when this skill runs. Update after each use.

## Format

```
## YYYY-MM-DD — [outcome: success | partial | failure]
- **API type:** [REST | GraphQL | WebSocket | other]
- **What was built:** [one-line description]
- **What worked well:** [specific step or pattern that landed]
- **What missed:** [wrong auth pattern, model mismatch, error handling gap]
- **Adjustment made:** [if you changed the skill based on this, note it here]
```

## Tracking Goals

Over time, this log reveals:
- Whether the interview questions actually predict the right architecture
- Which auth patterns beginners encounter most (weight defaults toward those)
- Whether the generated NetworkService gets used as-is or immediately rewritten
- Whether offline caching is premature for most beginner use cases
- Which error handling patterns cause confusion vs provide clarity

## Entries

<!-- Add new entries below this line, newest first -->
