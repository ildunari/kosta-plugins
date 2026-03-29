---
name: review-paper
description: Multi-dimensional review of a scientific paper or manuscript without editing
---

# Review Paper

Review-only mode. Read and evaluate a scientific paper or manuscript without making any edits to the document.

## Constraints

- **Do NOT edit the document.** This command produces a review report only.
- **Do NOT apply changes.** Skip drafting, Apply Gate, and Fix steps entirely.

## Workflow

### 1. Read Document

Read the full document. Build a structural map of sections, figures, tables, and references.

### 2. Build Claim Ledger

Extract every quantitative statement from the document — numbers, percentages, fold-changes, p-values, sample sizes, date claims, rankings. Build a Claim Ledger entry for each.

### 3. Source Verification

If source data files are provided or referenced, verify each Claim Ledger entry against the source. For claims without accessible sources, mark as `unverifiable` in the ledger with a note explaining why.

### 4. Dispatch All 13 Reviewers

Use the **reviewer-gate** skill to dispatch ALL 13 reviewer agents in parallel:

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
13. source-verifier

Each reviewer evaluates the document independently against its dimension.

### 5. Merge Reports

Use `scripts/reviewer_report_merger.py` to merge all 13 reports. Deduplicate findings that overlap across reviewers, calibrate severity, and produce a single consolidated report.

### 6. Produce Consolidated Review

Output a structured review document containing:

- **Executive summary** — overall assessment in 2-3 paragraphs
- **Claim Ledger** — full ledger with verification status per claim
- **Findings by severity** — P0 (critical), P1 (important), P2 (medium), P3 (minor)
- **Findings by dimension** — grouped by reviewer category
- **Recommendations** — prioritized list of suggested improvements
