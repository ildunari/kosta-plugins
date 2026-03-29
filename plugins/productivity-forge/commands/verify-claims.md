---
name: verify-claims
description: Verify all quantitative claims in a document against source data without editing
---

# Verify Claims

Verification-only mode. Extract and verify every quantitative claim in a document against source data. No editing is performed.

## Constraints

- **Do NOT edit the document.** This command produces a verification report only.
- **Do NOT draft or apply changes.** Skip drafting, Apply Gate, and Fix steps entirely.

## Workflow

### 1. Read Document

Read the full document. Identify every quantitative statement — numbers, percentages, ratios, fold-changes, p-values, sample sizes, dates, rankings, totals, averages, and unit-bearing values.

### 2. Build Claim Ledger

Create a Claim Ledger entry for each quantitative claim using the extended schema:

- Claim ID, Claim Text, Raw Value, Display Value
- Source File, Source Location, Citation(s)
- Unit, Condition/Timepoint, Formula/Transform, Rounding Rule
- Claim Type (direct, derived, inferential, editorial)
- Dependent Locations, Notes

### 3. Verify Against Sources

For each claim in the ledger:

- **Direct claims** — locate the exact value in the source file; confirm match
- **Derived claims** — run `scripts/derived_calc_verifier.py` to independently recompute the value from its inputs; compare against the document's stated value
- **Inferential claims** — flag for manual review with the reasoning chain documented
- **Editorial claims** — mark as non-verifiable

### 4. Cross-Document Consistency

If the user declares dependent files (other documents that reference the same values), run `scripts/cross_doc_consistency_checker.py` to check that the same claim appears identically in all locations.

### 5. Produce Verification Report

Output a structured report containing:

- **Summary** — total claims found, verified, flagged, unverifiable
- **Claim Ledger** — full ledger with PASS/FAIL/UNVERIFIABLE status per claim
- **Failed claims** — each with: exact quote from document, expected value from source, actual value in document, source location, recommended fix
- **Derived calculation audit** — recomputation results for every derived claim
- **Cross-document findings** — inconsistencies across dependent files (if applicable)

### 6. Save Ledger

Save the Claim Ledger as a JSON file alongside the document for future reference and incremental re-verification.
