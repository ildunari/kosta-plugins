# Claim Ledger -- Standard Schema

## Overview

The standard schema is the default for moderate-stakes work: single-section edits with fewer than 10 claims, no cross-document dependencies, and no compliance-sensitive content. It captures the essential traceability chain -- what value, from where, verified how -- without the overhead of derived calculation tracking or dependency mapping.

Use the extended schema instead when: the document has more than 10 claims, derived calculations are central to the content, multiple documents share the same values, or the document is compliance-sensitive (regulatory, legal, audit).

## Schema Definition

```json
{
  "ledger_version": "1.0",
  "document": "<string>",
  "created": "<ISO 8601 datetime>",
  "updated": "<ISO 8601 datetime>",
  "verification_tier": "<string: exploratory | standard | high-stakes>",
  "phase": "<string>",
  "claims": [
    {
      "id": "<string>",
      "claim_text": "<string>",
      "raw_value": "<string>",
      "display_value": "<string>",
      "source_file": "<string>",
      "source_location": "<string>",
      "citations": ["<string>"],
      "verification_status": "<string: verified | flagged | pending | conflict>",
      "notes": "<string>"
    }
  ]
}
```

## Field-by-Field Documentation

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ledger_version` | string | yes | Schema version. Currently `"1.0"`. |
| `document` | string | yes | Relative or absolute path to the document this ledger tracks. |
| `created` | string | yes | ISO 8601 timestamp of ledger creation. |
| `updated` | string | yes | ISO 8601 timestamp of last modification. Updated automatically by the tool. |
| `verification_tier` | string | yes | The tier declared for this phase: `"exploratory"`, `"standard"`, or `"high-stakes"`. Determines verification depth requirements. |
| `phase` | string | no | Name of the current phase. Useful when the same ledger spans multiple phases. |
| `claims` | array | yes | Array of claim objects. |

### Claim Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier. Format: `C-NN` where NN is zero-padded sequential (e.g., `C-01`, `C-02`). Once assigned, an ID is never reused, even if the claim is deleted. |
| `claim_text` | string | yes | The exact statement as it appears (or will appear) in the document. This is the rendered prose, not a summary. Must be updated if the document text changes. |
| `raw_value` | string | yes | The original value as it exists in the source file, before any formatting, rounding, or unit conversion. Store as a string to preserve precision (e.g., `"41432187"` not `41432187`). |
| `display_value` | string | yes | The value as it appears in the document, with rounding, units, and formatting applied (e.g., `"41.4M particles"`). The gap between `raw_value` and `display_value` must be explainable by a known rounding rule. |
| `source_file` | string | yes | Path to the canonical source file. Use the same path format consistently across the ledger. |
| `source_location` | string | yes | Where in the source file to find this value. Format depends on source type: `"Sheet1!B14"` for spreadsheets, `"Table 2, row 3"` for documents, `"Figure 1 legend"` for figures, `"page 4, paragraph 2"` for unstructured text. Be specific enough that someone unfamiliar with the file can find the value. |
| `citations` | array | no | Array of citation keys (e.g., `["[14]", "[15]"]`). These are the formal references that support this claim. Empty array if the claim is self-evident or based solely on the source data. |
| `verification_status` | string | yes | Current verification state. See status transitions below. |
| `notes` | string | no | Free-text field for discrepancies, caveats, reviewer flags, or verification evidence. When changing status, record the evidence here. |

### Verification Status Values

| Status | Meaning | When to use |
|--------|---------|-------------|
| `pending` | Not yet verified against source | Default for newly added claims. Work in progress. |
| `verified` | Confirmed correct against source | The raw value was read directly from the source file and matches. The display value is a correct transformation of the raw value. |
| `flagged` | Possible error or ambiguity | The value doesn't match the source, the source is ambiguous, the rounding seems wrong, or there's a discrepancy that needs human judgment. |
| `conflict` | Multiple sources disagree | Two or more canonical sources provide different values for the same claim. Requires resolution before the phase can close. |

### Status Transitions

```
pending --> verified    (source confirmed)
pending --> flagged     (discrepancy found)
pending --> conflict    (sources disagree)
flagged --> verified    (discrepancy resolved with evidence)
flagged --> conflict    (investigation revealed source disagreement)
verified --> flagged    (upstream change invalidated previous verification)
conflict --> verified   (resolution documented, authoritative source chosen)
conflict --> flagged    (partially resolved, still uncertain)
```

Every transition should be accompanied by a note explaining what changed and why.

## Example Ledger

```json
{
  "ledger_version": "1.0",
  "document": "grants/R01_resubmission/research_strategy.docx",
  "created": "2026-03-28T09:15:00Z",
  "updated": "2026-03-28T16:42:00Z",
  "verification_tier": "standard",
  "phase": "Phase 2: Update Aim 1 Preliminary Data",
  "claims": [
    {
      "id": "C-01",
      "claim_text": "PEG200k nanoparticles achieved the highest cumulative transport of 41.4M particles (std 3.36M, n=3)",
      "raw_value": "41432187",
      "display_value": "41.4M particles",
      "source_file": "data/transport_assay_results.xlsx",
      "source_location": "Sheet 'Cumulative'!B14",
      "citations": ["[14]"],
      "verification_status": "verified",
      "notes": "Read B14 directly: 41432187. Rounded to nearest 0.1M = 41.4M. Std from C14: 3362841, rounded to 3.36M."
    },
    {
      "id": "C-02",
      "claim_text": "This represents a 2.3-fold improvement over uncoated nanoparticles (18.1M particles, n=3)",
      "raw_value": "18074592",
      "display_value": "18.1M particles",
      "source_file": "data/transport_assay_results.xlsx",
      "source_location": "Sheet 'Cumulative'!B8",
      "citations": [],
      "verification_status": "verified",
      "notes": "Read B8: 18074592. Rounded to 18.1M. Fold-change: 41432187/18074592 = 2.291, displayed as 2.3-fold."
    },
    {
      "id": "C-03",
      "claim_text": "PEG100k internalization showed high inter-replicate variability (std 43.4M on mean 36.9M, n=3)",
      "raw_value": "36912445",
      "display_value": "36.9M",
      "source_file": "data/transport_assay_results.xlsx",
      "source_location": "Sheet 'Cumulative'!B12",
      "citations": [],
      "verification_status": "flagged",
      "notes": "CV > 100% (std 43.4M / mean 36.9M = 117%). High variance flagged for PI review -- should this condition be reported as preliminary or excluded?"
    },
    {
      "id": "C-04",
      "claim_text": "The optimal PEG molecular weight range for transcytosis was 35-200 kDa",
      "raw_value": "35-200",
      "display_value": "35-200 kDa",
      "source_file": "data/transport_assay_results.xlsx",
      "source_location": "Derived from ranking of B8:B16",
      "citations": ["[14]", "[16]"],
      "verification_status": "pending",
      "notes": "Previous draft said 35-100 kDa. Updated range needs PI confirmation."
    }
  ]
}
```

## Conventions

1. **One ledger per phase.** If a document goes through multiple editing phases, each phase gets its own ledger (or the existing ledger is versioned with a new `phase` field and `updated` timestamp).

2. **Claim IDs are permanent.** Once `C-01` is assigned, it always refers to that claim, even if the claim is later deleted from the document. This ensures cross-references in review notes and phase reports remain valid.

3. **Raw values are strings.** Store raw values as strings to preserve precision. The number `41432187` and the string `"41432187"` are semantically different -- the string preserves the exact representation from the source.

4. **Notes are the audit trail.** Every verification action, every status change, every discrepancy resolution should be recorded in the `notes` field. When someone asks "how do we know this number is right?", the notes field should answer the question.

5. **Display value must be derivable from raw value.** If you cannot explain how `display_value` was produced from `raw_value` using a stated rounding or formatting rule, the claim should be `flagged`.
