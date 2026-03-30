# Review Dimensions

Both reviewers should cover relevant dimensions from this list. Not every
dimension applies to every phase — pick what's relevant.

## Code Dimensions

| Dimension | What to check |
|-----------|---------------|
| Correctness | Logic errors, protocol mismatches, wrong behavior |
| Security | Credential handling, injection, auth bypass |
| Concurrency | Data races, actor isolation, Sendable compliance, thread safety |
| Performance | N+1 queries, unnecessary allocations, blocking main thread |
| Error handling | Missing catches, silent failures, crash paths |
| Memory | Retain cycles, leaks, unbounded growth |
| Platform idioms | Native patterns vs fighting the framework |

## UI/Design Dimensions

Apply when the phase touches views, layouts, or styling.

| Dimension | What to check |
|-----------|---------------|
| Visual hierarchy | Focal points, information flow, heading/body/meta distinction |
| Interaction states | Default, hover, active, focus, disabled — all present |
| Accessibility | VoiceOver/screen reader labels, touch targets (44pt min), WCAG AA contrast, dynamic type |
| Responsiveness | Phone/tablet layouts, safe areas, keyboard handling |
| Loading/empty/error | Every async view has all three states |
| Design tokens | Colors from theme not hardcoded hex; spacing from scale not magic numbers |

## Severity Scale

| Level | Meaning | Action |
|-------|---------|--------|
| P0 Critical | Crashes, security holes, data loss, protocol violations | Must fix before commit |
| P1 High | Concurrency bugs, retain cycles, architectural boundary breaks, missing error handling | Must fix before commit |
| P2 Medium | Maintainability, test gaps, style deviations, missing states | Note but do not block |
| P3 Low | Naming, minor improvements, polish | Note but do not block |

## Review Report Format

Each reviewer should return findings in this structure:

```
## [Reviewer Name] Review — Phase N: [name]

### P0 Critical
- [file:line] Description. Suggested fix.

### P1 High
- [file:line] Description. Suggested fix.

### P2 Medium
- [file:line] Description.

### P3 Low
- [file:line] Description.

### Summary
[1-2 sentences: overall assessment, biggest risk]
```
