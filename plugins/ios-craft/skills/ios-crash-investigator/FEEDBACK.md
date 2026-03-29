# ios-crash-investigator Feedback Log

Track what works and what doesn't when this skill runs. Update after each use.

## Format

```
## YYYY-MM-DD — [outcome: success | partial | failure]
- **Crash category:** [hard crash | hang | logic error | launch crash | memory | release-only]
- **Root cause found:** [yes/no, what it was]
- **Triage accuracy:** [did Step 1 classify correctly?]
- **What missed:** [wrong hypothesis, misleading checklist item, missing crash pattern]
- **Adjustment made:** [if you changed the skill based on this, note it here]
```

## Tracking Goals

Over time, this log reveals:
- Which crash categories are most common for beginners (weight the skill toward those)
- Whether the "Top 10 SwiftUI Crashes" list matches real-world frequency
- Whether the triage table routes to the right step on first try
- Which LLDB commands users actually find useful vs confusing
- Whether the "Preventive Measures" section changes behavior or gets ignored

## Entries

<!-- Add new entries below this line, newest first -->
