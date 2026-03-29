# Claim Ledger -- Extended Schema

## Overview

The extended schema adds fields for derived calculations, experimental conditions, dependency tracking, and claim typing on top of the standard schema. Use it when:

- The document contains more than 10 verifiable claims
- Derived calculations (fold-changes, percentages, ratios, normalized metrics) are central to the content
- The same values appear in multiple documents or sections
- The document is compliance-sensitive (regulatory filings, grant submissions, audit reports, legal documents)
- Verification tier is high-stakes (Tier 3)

## Schema Definition

The extended schema includes all standard fields plus additional fields on each claim object.

```json
{
  "ledger_version": "1.0",
  "document": "<string>",
  "created": "<ISO 8601 datetime>",
  "updated": "<ISO 8601 datetime>",
  "verification_tier": "<string: exploratory | standard | high-stakes>",
  "phase": "<string>",
  "source_precedence": ["<string>"],
  "dependent_documents": ["<string>"],
  "claims": [
    {
      "id": "<string>",
      "claim_text": "<string>",
      "raw_value": "<string>",
      "display_value": "<string>",
      "source_file": "<string>",
      "source_location": "<string>",
      "citations": ["<string>"],
      "verification_status": "<string>",
      "notes": "<string>",

      "unit": "<string>",
      "condition": "<string>",
      "claim_type": "<string: direct | derived | inferential | editorial | source-stated>",
      "formula": "<string>",
      "raw_inputs": [
        {
          "claim_id": "<string>",
          "value": "<string>"
        }
      ],
      "computed_result": "<string>",
      "rounding_rule": "<string>",
      "dependent_locations": [
        {
          "file": "<string>",
          "location": "<string>",
          "current_value": "<string>",
          "status": "<string: consistent | stale | unchecked>"
        }
      ]
    }
  ]
}
```

## Extended Fields -- Claim Level

### `unit`

| Attribute | Value |
|-----------|-------|
| Type | string |
| Required | yes (extended) |
| Description | The measurement unit for the value (e.g., `"particles"`, `"kDa"`, `"mg/mL"`, `"%"`, `"fold"`, `"USD"`, `"days"`). Use standard abbreviations. If the value is dimensionless (a ratio, a count), use `"dimensionless"` or `"count"`. |

Enforcing explicit units prevents silent unit mismatches -- one of the most common and dangerous errors in quantitative documents. When a value moves between sections or documents, the unit travels with it.

### `condition`

| Attribute | Value |
|-----------|-------|
| Type | string |
| Required | when applicable |
| Description | The experimental, temporal, or contextual condition under which this value was measured or applies. Examples: `"A(+/+), 96h cumulative"`, `"Q3 2025"`, `"placebo arm, ITT population"`, `"ambient temperature, 1 atm"`. |

Conditions prevent a value measured under one set of circumstances from being silently attributed to another. Two values can share the same raw number but refer to completely different conditions.

### `claim_type`

| Attribute | Value |
|-----------|-------|
| Type | enum |
| Required | yes (extended) |
| Values | `direct`, `derived`, `inferential`, `editorial`, `source-stated` |

**Definitions:**

| Type | Meaning | Verification requirement |
|------|---------|------------------------|
| `direct` | Value read directly from source with no transformation | Confirm raw_value matches source_location |
| `derived` | Value computed from other values (fold-change, %, ratio) | Independent recomputation required; formula, raw_inputs, computed_result must be populated |
| `inferential` | Conclusion drawn from data but not directly computable (e.g., "these results suggest...") | Verify the supporting claims; assess whether the inference is warranted |
| `editorial` | Statement of interpretation, framing, or opinion, not a factual claim | No source verification needed, but flag if presented as fact |
| `source-stated` | Derived value that is explicitly stated in the source file | Confirm source_location contains the exact value; independent recomputation not required at Tier 2 (required at Tier 3 for non-canonical sources) |

### `formula`

| Attribute | Value |
|-----------|-------|
| Type | string |
| Required | when claim_type is `derived` |
| Description | The exact mathematical operation used to produce the value. Write it in a way that someone unfamiliar with the document can reproduce it. Examples: `"C-01 / C-02"`, `"(C-05 - C-06) / C-06 * 100"`, `"sum(C-10 through C-15)"`. Reference input claims by their Claim IDs. |

### `raw_inputs`

| Attribute | Value |
|-----------|-------|
| Type | array of objects |
| Required | when claim_type is `derived` |
| Description | The input values used in the formula, each linked to its Claim ID. This creates an explicit dependency chain -- if an input value changes, the derived claim must be recomputed. |

Each object:
| Field | Type | Description |
|-------|------|-------------|
| `claim_id` | string | The Claim ID of the input value (e.g., `"C-01"`) |
| `value` | string | The raw value used in the computation |

### `computed_result`

| Attribute | Value |
|-----------|-------|
| Type | string |
| Required | when claim_type is `derived` |
| Description | The unrounded output of applying the formula to the raw inputs. This is the full-precision result before any rounding or formatting. Stored as a string to preserve precision. |

The gap between `computed_result` and `display_value` must be fully explained by the `rounding_rule`.

### `rounding_rule`

| Attribute | Value |
|-----------|-------|
| Type | string |
| Required | when display_value differs from raw_value or computed_result |
| Description | The rule applied to transform the precise value into the display value. Examples: `"nearest 0.1M"`, `"1 decimal place"`, `"truncate to integer"`, `"2 significant figures"`, `"ceiling to nearest 100"`. |

### `dependent_locations`

| Attribute | Value |
|-----------|-------|
| Type | array of objects |
| Required | at Tier 3; recommended at Tier 2 for cross-document work |
| Description | Other documents or sections that reference this same claim. The dependency sweep at Tier 3 checks every listed location for consistency. |

Each object:
| Field | Type | Description |
|-------|------|-------------|
| `file` | string | Path to the dependent document |
| `location` | string | Section, page, or paragraph reference within that document |
| `current_value` | string | The value currently displayed at that location |
| `status` | enum | `"consistent"` (matches display_value), `"stale"` (shows an outdated value), `"unchecked"` (not yet verified) |

## Extended Top-Level Fields

### `source_precedence`

| Attribute | Value |
|-----------|-------|
| Type | array of strings |
| Required | when multiple source files exist |
| Description | Ordered list of source file paths from highest authority to lowest. When sources disagree, the first file in this list wins. |

Example:
```json
"source_precedence": [
  "data/final_analysis.xlsx",
  "data/raw_counts.csv",
  "manuscripts/draft_v3.docx"
]
```

### `dependent_documents`

| Attribute | Value |
|-----------|-------|
| Type | array of strings |
| Required | at Tier 3 |
| Description | All documents that share values with the primary document. The Integrity Gate sweeps these for consistency. |

## Example -- Extended Ledger

```json
{
  "ledger_version": "1.0",
  "document": "grants/R01_resubmission/research_strategy.docx",
  "created": "2026-03-28T09:15:00Z",
  "updated": "2026-03-28T18:20:00Z",
  "verification_tier": "high-stakes",
  "phase": "Phase 3: Update All Quantitative Claims Across Aims",
  "source_precedence": [
    "data/transport_assay_results.xlsx",
    "data/imaging_quantification.csv",
    "supplementary/tables.docx"
  ],
  "dependent_documents": [
    "grants/R01_resubmission/specific_aims.docx",
    "grants/R01_resubmission/abstract.docx",
    "supplementary/tables.docx"
  ],
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
      "notes": "Read B14 directly: 41432187. Rounded to nearest 0.1M = 41.4M.",
      "unit": "particles",
      "condition": "A(+/+), 96h cumulative",
      "claim_type": "direct",
      "formula": null,
      "raw_inputs": [],
      "computed_result": null,
      "rounding_rule": "nearest 0.1M",
      "dependent_locations": [
        {
          "file": "grants/R01_resubmission/specific_aims.docx",
          "location": "Aim 1, paragraph 3",
          "current_value": "41.4M",
          "status": "consistent"
        },
        {
          "file": "grants/R01_resubmission/abstract.docx",
          "location": "Results sentence 2",
          "current_value": "41.4M",
          "status": "consistent"
        }
      ]
    },
    {
      "id": "C-02",
      "claim_text": "uncoated nanoparticles achieved 18.1M particles (n=3)",
      "raw_value": "18074592",
      "display_value": "18.1M particles",
      "source_file": "data/transport_assay_results.xlsx",
      "source_location": "Sheet 'Cumulative'!B8",
      "citations": [],
      "verification_status": "verified",
      "notes": "Read B8: 18074592. Rounded to 18.1M.",
      "unit": "particles",
      "condition": "uncoated, 96h cumulative",
      "claim_type": "direct",
      "formula": null,
      "raw_inputs": [],
      "computed_result": null,
      "rounding_rule": "nearest 0.1M",
      "dependent_locations": []
    },
    {
      "id": "C-03",
      "claim_text": "a 2.3-fold improvement over uncoated nanoparticles",
      "raw_value": null,
      "display_value": "2.3-fold",
      "source_file": null,
      "source_location": "Derived from C-01 and C-02",
      "citations": [],
      "verification_status": "verified",
      "notes": "Independent recomputation: 41432187 / 18074592 = 2.29146. Rounded to 1 decimal = 2.3. Confirmed.",
      "unit": "fold",
      "condition": "PEG200k vs uncoated, 96h cumulative",
      "claim_type": "derived",
      "formula": "C-01 / C-02",
      "raw_inputs": [
        { "claim_id": "C-01", "value": "41432187" },
        { "claim_id": "C-02", "value": "18074592" }
      ],
      "computed_result": "2.29146",
      "rounding_rule": "1 decimal place",
      "dependent_locations": [
        {
          "file": "grants/R01_resubmission/specific_aims.docx",
          "location": "Aim 1, paragraph 3",
          "current_value": "2.3-fold",
          "status": "consistent"
        }
      ]
    },
    {
      "id": "C-04",
      "claim_text": "Operating expenses decreased 12% year-over-year",
      "raw_value": null,
      "display_value": "12%",
      "source_file": null,
      "source_location": "Derived from C-10 and C-11",
      "citations": [],
      "verification_status": "flagged",
      "notes": "Recomputation: (485000 - 552000) / 552000 * 100 = -12.138. Rounds to 12%, but this is a decrease, not an increase. Claim text says 'decreased 12%' which is correct directionally. Flagged because the abstract says '11%' -- inconsistent rounding.",
      "unit": "%",
      "condition": "FY2025 vs FY2024",
      "claim_type": "derived",
      "formula": "(C-11 - C-10) / C-10 * 100",
      "raw_inputs": [
        { "claim_id": "C-10", "value": "552000" },
        { "claim_id": "C-11", "value": "485000" }
      ],
      "computed_result": "-12.138",
      "rounding_rule": "nearest integer",
      "dependent_locations": [
        {
          "file": "reports/annual_summary.docx",
          "location": "Executive Summary, bullet 3",
          "current_value": "11%",
          "status": "stale"
        }
      ]
    }
  ]
}
```

## Schema Upgrade Path

When a standard ledger needs to become an extended ledger mid-phase (because complexity grew beyond initial estimates), add the extended fields to existing claims incrementally:

1. Set `claim_type` on all existing claims (most will be `direct`).
2. Add `unit` and `condition` to all claims.
3. For any derived claims already in the ledger, populate `formula`, `raw_inputs`, `computed_result`, and `rounding_rule`.
4. Add `dependent_locations` for claims that appear in multiple documents.
5. Add `source_precedence` and `dependent_documents` at the top level.
6. Update `verification_tier` if upgrading to high-stakes.

The `claim_ledger.py upgrade` subcommand automates this process and flags claims that need manual annotation.
