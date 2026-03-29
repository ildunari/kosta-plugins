---
name: claim-ledger
description: >
  First-class Claim Ledger system for tracking verifiable statements from source
  to final text. Use when creating, updating, or verifying claim ledgers. Manages
  JSON-based ledgers with standard and extended schemas, derived calculation
  tracking, and verification tier enforcement.
---

# Claim Ledger

## What It Is

The Claim Ledger is a structured artifact that tracks every verifiable statement in a document from its original source through to its final rendered form. It exists because documents have no compiler. Code has test suites, type checkers, and linters that catch errors before shipping. A grant proposal, a financial report, a clinical protocol -- these have nothing. A transposed digit, a stale percentage carried forward from a previous draft, a derived ratio computed from the wrong denominator -- these errors are invisible until a reviewer catches them, or worse, until they aren't caught at all.

The ledger is the test suite for documents. Every claim gets an ID, a source, a verified status. Every derived calculation gets a formula, raw inputs, and an independent recomputation. When a value changes upstream, the ledger makes it possible to trace every downstream location that needs updating. When a reviewer questions a number, the ledger provides the audit trail instantly.

## JSON Schema

Ledgers are stored as JSON files alongside the documents they track. The `scripts/claim_ledger.py` tool manages creation, updates, and verification.

### Standard Schema

Use for moderate-stakes work with fewer than 10 claims. Covers the essential traceability fields.

```json
{
  "ledger_version": "1.0",
  "document": "path/to/document.docx",
  "created": "2026-03-28T10:00:00Z",
  "updated": "2026-03-28T14:30:00Z",
  "verification_tier": "standard",
  "claims": [
    {
      "id": "C-01",
      "claim_text": "Statement as it appears in the draft",
      "raw_value": "41400000",
      "display_value": "41.4M particles",
      "source_file": "data/experiment_results.xlsx",
      "source_location": "Sheet1!B14",
      "citations": ["[14]"],
      "verification_status": "verified"
    }
  ]
}
```

**Field descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique claim identifier, sequential (`C-01`, `C-02`, ...) |
| `claim_text` | string | The exact sentence or phrase as it appears (or will appear) in the document |
| `raw_value` | string | The original value from the source, unformatted |
| `display_value` | string | The value as rendered in the document, with rounding and units |
| `source_file` | string | Path to the canonical source file |
| `source_location` | string | Page, table, cell, figure, or section reference within the source |
| `citations` | array | Formal citation keys supporting this claim |
| `verification_status` | enum | One of: `verified`, `flagged`, `pending`, `conflict` |

### Extended Schema

Use for high-stakes quantitative work, documents with more than 10 claims, compliance-sensitive content, or cross-document work. Adds fields for derived calculations, conditions, and dependency tracking. See `references/schema-extended.md` for the full field reference.

## Creating a Ledger

```bash
python scripts/claim_ledger.py init \
  --document path/to/document.docx \
  --tier standard \
  --output path/to/ledger.json
```

This creates an empty ledger linked to the document with the specified verification tier. The tier determines how thoroughly claims must be verified before the ledger can be marked complete.

## Adding Claims

```bash
python scripts/claim_ledger.py add \
  --ledger path/to/ledger.json \
  --claim-text "PEG200k showed the highest transport (41.4M particles, n=3)" \
  --raw-value "41400000" \
  --display-value "41.4M particles" \
  --source-file data/experiment_results.xlsx \
  --source-location "Sheet1!B14"
```

The tool assigns the next sequential Claim ID and sets status to `pending`. For bulk import from a source file, use the `scan` subcommand to extract candidate claims from document text and match them against source data.

## Updating Claim Status

```bash
python scripts/claim_ledger.py verify \
  --ledger path/to/ledger.json \
  --claim C-01 \
  --status verified \
  --evidence "Read Sheet1!B14, value is 41400000, matches display_value after rounding"
```

Every status change requires an `--evidence` argument explaining what was checked and what the result was. Status transitions:

- `pending` -> `verified`: Value confirmed against source
- `pending` -> `flagged`: Value doesn't match source, or source is ambiguous
- `pending` -> `conflict`: Multiple sources disagree on this value
- `flagged` -> `verified`: Discrepancy resolved with evidence
- `verified` -> `flagged`: Upstream change invalidated a previously verified claim

## Exporting

```bash
# Markdown summary for review
python scripts/claim_ledger.py export --ledger path/to/ledger.json --format markdown

# CSV for spreadsheet analysis
python scripts/claim_ledger.py export --ledger path/to/ledger.json --format csv

# Completion report (for phase reconciliation)
python scripts/claim_ledger.py report --ledger path/to/ledger.json
```

The report subcommand produces a summary: total claims, verified count, flagged count, pending count, derived calculations verified, and any unresolved conflicts. This feeds directly into the Phase Reconciliation Report in step 9 of the agentic loop.

## Verification Tiers

The tier governs how many claims must be verified and how deeply derived values are checked. The tier is declared at phase start and enforced at the Integrity Gate.

### Tier 1 -- Exploratory

**When to use:** Discovery, research inventory, internal working notes that will not appear directly in any deliverable.

**Requirements:**
- Spot-check 3-5 representative values against source files
- Derived calculations: orchestrator sanity-checks the 3-5 most critical derived values
- Ledger is optional at this tier but recommended for resumability

### Tier 2 -- Standard

**When to use:** Single-section quantitative edits with fewer than 10 claims. The default tier for any phase that changes quantitative content in a final document.

**Requirements:**
- Verify 100% of claims in changed text
- Every derived value independently recomputed or confirmed from source
- Ledger is required; all claims must reach `verified` status before phase close

### Tier 3 -- High-Stakes

**When to use:** Multi-section edits, more than 10 claims, compliance-sensitive content (regulatory filings, grant submissions, audit documents), or cross-document work where the same values appear in multiple files.

**Requirements:**
- Verify 100% of changed claims
- Run a dependency sweep across all declared files (check every location that references a changed value)
- Every derived value independently recomputed -- source-stated confirmation alone is not sufficient at this tier unless the source is the canonical authority
- Ledger is required with extended schema
- Phase cannot close with any `pending` or `conflict` status claims

## Derived Calculation Rules

Derived values are the most dangerous site of hallucination in document work. They sound analytically credible, so neither the writer nor the reviewer tends to question them. The ledger makes every derivation auditable.

**Core rules:**

1. Every computed value (fold-change, percentage, ratio, normalized metric, unit conversion, ranking) must have a corresponding row in the ledger with `claim_type: "derived"`.
2. The row must record: the formula used, the raw input Claim IDs, the unrounded computed result, the display value, and the rounding rule.
3. At Tier 2+, the orchestrator independently recomputes every derived value. No exceptions.
4. If the source file already states the derived number, record it as `claim_type: "source-stated"` with the source location. This counts as verification without recomputation at Tier 2 (but not at Tier 3 for non-canonical sources).
5. No derived quantitative claim may appear in text unless it has a corresponding calculation row in the ledger.

See `references/derived-calculations.md` for the full protocol, examples, and rounding rules.

## Integration Points

The Claim Ledger connects to three points in the agentic loop:

**Source Verify (Step 2)** creates or updates the ledger. The verification sub-agent reads every canonical source file, extracts values, cross-checks them, and produces the ledger with initial statuses. The orchestrator reviews the ledger before proceeding to drafting.

**Integrity Gate (Step 6)** reads the ledger and verifies that every Claim ID touched during the phase shows `verified` status. It checks that derived calculations were independently recomputed, that stale values were swept, and that the declared verification tier was actually executed. If any claim is still `pending`, `flagged`, or `conflict`, the gate fails.

**PostToolUse Hook** (`hooks/scripts/post_edit_integrity.py`) runs after document edit operations and performs a lightweight check: did the edit introduce or modify any values that exist in the ledger? If so, it flags the affected Claim IDs for re-verification. This catches accidental value drift introduced by tool operations (rounding changes, encoding issues, formatting side effects).

The ledger is saved alongside the document at the end of each phase (Step 9: Save + Document) and persists across sessions. If work is interrupted and resumed later, the ledger provides the state needed to pick up where verification left off.
