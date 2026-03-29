---
name: reviewer-gate
description: >
  Orchestrate the 13-reviewer quality gate. Use during step 7 of the agentic loop.
  Selects relevant reviewers based on document domain, dispatches them in parallel,
  merges reports, enforces P0 blocking, and produces a consolidated review.
---

# Reviewer Gate — Multi-Reviewer Quality Orchestration

This skill manages the review phase of the verification loop. It selects which of the 12 reviewer agents to dispatch based on the document domain, sends them all simultaneously, collects their reports, merges findings, and enforces severity-based gates.

## Domain-to-Reviewer Mapping

Use this table to determine which reviewers to dispatch. Numbers correspond to reviewer agents:

1. review-completeness
2. review-scientific
3. review-methodology
4. review-code
5. review-writing
6. review-data-figures
7. review-accuracy
8. review-citation
9. review-logic
10. review-ethics
11. review-quantitative
12. review-domain-expert

| Domain | Always Include | Add If Relevant |
|--------|---------------|-----------------|
| Scientific | 1, 2, 3, 5, 7, 8, 9, 11 | 4, 6, 10 |
| Legal | 1, 5, 7, 8, 9, 10, 12 | 4 |
| Financial | 1, 4, 5, 7, 9, 11, 12 | 6 |
| Medical | 1, 2, 3, 5, 7, 8, 9, 10, 11 | 6, 12 |
| Engineering | 1, 4, 5, 7, 9, 11, 12 | 3 |
| Policy | 1, 5, 7, 8, 9, 10, 12 | -- |
| Education | 1, 5, 7, 8, 9, 12 | 10 |
| Journalism | 1, 5, 7, 8, 9, 10, 12 | -- |

"Add if relevant" means: include the reviewer when the document contains content in that reviewer's area. For example, add review-code (4) to a Legal document only if it contains computational exhibits. Add review-data-figures (6) to a Financial document only if it contains charts or visualizations.

When the domain is ambiguous or spans multiple categories, take the union of all applicable rows and deduplicate.

## Parallel Dispatch Protocol

1. **Determine domain.** The orchestrator provides the document domain when invoking this gate. If not specified, infer from document content and state your inference.

2. **Select reviewers.** Use the mapping table. Include all "Always" reviewers for the domain. Evaluate "Add if relevant" reviewers and include them with a one-line justification for each inclusion or exclusion.

3. **Prepare reviewer inputs.** Each reviewer receives the same package:
   - Edited text (the current draft)
   - Original text (the pre-edit version, if available)
   - Claim Ledger JSON
   - Source file paths
   - Domain context string (document type, audience, conventions)

4. **Dispatch all selected reviewers simultaneously.** Do not wait for one to finish before sending the next. Use parallel agent dispatch. Every reviewer works independently with no cross-talk.

5. **Set a collection deadline.** All reviewers should return within a reasonable window. If a reviewer has not returned by the time all others have, wait briefly, then proceed without it and note the missing report.

## Report Collection and Merging

When all reviewer reports are in:

1. **Collect all findings.** Gather every P0, P1, P2, and P3 finding from every reviewer into a single list.

2. **Deduplicate.** If two reviewers flag the same issue (same location, same problem), keep the one with the more specific fix recommendation and note which reviewers both caught it.

3. **Cross-reference conflicts.** If two reviewers disagree (one says PASS, another flags an issue on the same content), escalate the conflict to the orchestrator with both positions quoted.

4. **Produce the consolidated report.** Use this format:

```
## Consolidated Review Report

### Reviewers Dispatched
[List of reviewer names and their verdicts]

### P0 Findings (Blocking)
| # | Finding | Reviewer(s) | Location | Fix Recommendation |
|---|---------|------------|----------|-------------------|

### P1 Findings (Important)
| # | Finding | Reviewer(s) | Location | Fix Recommendation |
|---|---------|------------|----------|-------------------|

### P2 Findings (Medium)
| # | Finding | Reviewer(s) | Location | Fix Recommendation |
|---|---------|------------|----------|-------------------|

### P3 Findings (Minor)
| # | Finding | Reviewer(s) | Location | Fix Recommendation |
|---|---------|------------|----------|-------------------|

### Conflicts
[Any reviewer disagreements, with both positions]

### Gate Decision
- P0 count: X
- P1 count: X
- Gate status: PASS | BLOCKED
- Reason: [if blocked, list the P0s that must be resolved]
```

## P0 Blocking Gate

This is the hard rule: **if any reviewer returns one or more P0 findings, the review phase cannot complete.** The gate status is BLOCKED and the orchestrator must fix every P0 before proceeding.

There are no exceptions. P0 means the document has a critical error that would be harmful, misleading, or fundamentally wrong if published. The orchestrator fixes P0 issues directly (it has full context from all reports) and then triggers a re-review.

## P1 Handling

P1 findings should be fixed unless doing so would cause unreasonable delay. The orchestrator makes this call. For every P1 that is not fixed, the orchestrator must document:
- The finding
- Why it was deferred
- The assessed risk of publishing without the fix

This documentation becomes part of the final deliverable metadata.

## Re-Review Protocol

After P0 fixes are applied:

1. **Identify affected reviewers.** Only the reviewers whose P0 findings were addressed need to re-review. Do not re-dispatch reviewers who returned clean reports or only P2/P3 findings.

2. **Re-dispatch affected reviewers only.** Send them the updated text with a note indicating which P0 findings were addressed and how.

3. **Collect re-review reports.** If all previously-P0 reviewers now return without P0 findings, the gate passes. If new P0s emerge, repeat the cycle.

4. **Limit re-review cycles.** After 3 cycles of P0 fixes and re-reviews, escalate to the orchestrator for a manual decision. Something structural may be wrong that incremental fixes cannot resolve.

## Integration with the Orchestrator

## Calibration Examples

Each of the six key reviewer agents (review-accuracy, review-writing, review-citation, review-scientific, review-quantitative, review-logic) includes a "Calibration Examples" section with one realistic finding per severity level (P0 through P3). These examples anchor what each severity level looks like for that specific dimension. When dispatching reviewers, their calibration examples are part of their prompt contract and should be loaded alongside the rest of the agent definition to ensure consistent severity grading across all reviewers.

## Integration with the Orchestrator

The orchestrator invokes this skill at step 7 of the verification loop by providing:
- `domain`: the document domain (Scientific, Legal, Financial, Medical, Engineering, Policy, Education, Journalism)
- `edited_text`: the current draft content
- `original_text`: the pre-edit version (optional)
- `claim_ledger`: the Claim Ledger JSON
- `source_paths`: list of source file paths
- `context`: audience, conventions, and any special instructions

The skill returns the consolidated report and gate decision. The orchestrator then handles P0 fixes (step 8) and re-triggers this skill for re-review if needed.
