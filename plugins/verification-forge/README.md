# verification-forge

Compliance-grade document verification and editing for Claude Code.

**5 skills** | **16 agents** | **5 commands** | **7 scripts** | **3 hooks**

---

## What This Does

Documents have no compiler. Code gets syntax errors, test failures, and type mismatches that block you from shipping broken work. Documents get nothing. A transposed number in a grant proposal, a citation that no longer supports its claim after an edit, a percentage that contradicts the table it references — these errors are invisible until a human reviewer catches them months later, often after the damage is done.

Verification-forge adds a compiler for documents. It wraps every edit in a 9-step agentic loop that verifies claims against source data, checks citations for integrity, and runs 13 independent reviewer agents as quality gates before finalizing. Every quantitative statement is tracked in a Claim Ledger — a persistent JSON artifact that maps each number from its source file through any transformations to its final appearance in the document. Nothing gets through without a paper trail.

The plugin is built for anyone whose documents carry real consequences: grant writers submitting to NIH or NSF, legal teams drafting compliance filings, financial analysts producing earnings reports, research labs writing manuscripts, and engineering teams maintaining requirements documents. It works with Word, LaTeX, Excel, PDF, and plain text across eight specialized domains.

---

## Quick Start

```bash
# Install the plugin
claude plugins install verification-forge

# Run a command
/write-grant
/review-paper
/edit-report
/verify-claims
/audit-citations
```

---

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/write-grant` | Full grant writing workflow with Claim Ledger and 8-reviewer gate | `/write-grant` then provide your draft, data files, and agency requirements |
| `/review-paper` | Multi-dimensional review of a paper without editing | `/review-paper` with your manuscript — produces a consolidated review report |
| `/edit-report` | Edit any document with the full verification loop — auto-detects domain | `/edit-report` with a legal brief, financial report, or any document type |
| `/verify-claims` | Verify all quantitative claims against source data without editing | `/verify-claims` with your document and source spreadsheets |
| `/audit-citations` | Audit citation integrity — missing refs, wrong context, orphaned citations | `/audit-citations` with your manuscript or report |

---

## How It Works

Every document edit passes through the **9-step agentic loop**:

1. **Research** — Read the document, data sources, and reference materials. Build a structural inventory of what exists and what needs to change.
2. **Source Verify** — Before writing anything, verify every value against canonical sources. Build the Claim Ledger.
3. **Structure Plan** — If content is being moved or reorganized, map the changes before drafting. Conditional — skipped for in-place edits.
4. **Draft** — Dispatch drafting sub-agents with verified Claim Ledger values, citation maps, and style constraints. No freehanding numbers.
5. **Apply Gate** — Apply the draft to the document. Re-read the affected sections to confirm the tool operation succeeded.
6. **Integrity Gate** — Search for stale values, verify all new values against the Claim Ledger, check citation integrity, and run structural validation.
7. **Dual Review** — Dispatch domain-appropriate reviewer agents in parallel via the reviewer-gate. Merge reports and enforce severity gates.
8. **Fix** — Address all P0 (critical) and P1 (important) findings from the review.
9. **Save + Document** — Save the final document, Claim Ledger JSON, and a change log documenting what changed and why.

If the Integrity Gate or Dual Review fails, the loop diagnoses the issue and retries from the appropriate step.

---

## Claim Ledger

The Claim Ledger is a persistent JSON artifact that tracks every verifiable statement from source to final text. It prevents value drift across editing phases, makes the workflow resumable after interruption, and catches errors that survive spot-checking.

### Standard Schema (fewer than 10 claims)

```json
{
  "claim_id": "C-01",
  "claim_text": "Enrollment increased 47% year-over-year",
  "raw_value": "0.4723",
  "display_value": "47%",
  "source_file": "data/enrollment_2025.xlsx",
  "source_location": "Sheet1!B14",
  "citations": ["Smith et al., 2025"],
  "verification_status": "verified"
}
```

### Extended Schema (10+ claims or compliance-sensitive)

Adds: `unit`, `condition_timepoint`, `formula_transform`, `rounding_rule`, `claim_type` (direct/derived/inferential/editorial), `dependent_locations`, and `notes`.

### Scripts

The `scripts/claim_ledger.py` script manages Claim Ledger creation, updates, and JSON serialization. The `scripts/derived_calc_verifier.py` script independently recomputes derived values (fold-changes, percentages, ratios) from their inputs.

---

## Reviewer Agents

Thirteen specialized reviewer agents evaluate documents across independent quality dimensions. The reviewer-gate dispatches them in parallel and merges their reports.

| # | Reviewer | What It Checks | Model |
|---|----------|---------------|-------|
| 1 | review-completeness | Missing sections, incomplete arguments, gaps in coverage | Sonnet |
| 2 | review-scientific | Scientific rigor, hypothesis support, experimental design | Opus |
| 3 | review-methodology | Methods reproducibility, statistical appropriateness, controls | Opus |
| 4 | review-code | Code correctness, reproducibility, computational methods | Sonnet |
| 5 | review-writing | Prose quality, AI-telltale detection, tone consistency, clarity | Sonnet |
| 6 | review-data-figures | Figure/table accuracy, labeling, data presentation | Sonnet |
| 7 | review-accuracy | Numerical accuracy, value drift between sections, unit correctness | Opus |
| 8 | review-citation | Citation-claim alignment, missing refs, format compliance | Sonnet |
| 9 | review-logic | Logical consistency, unsupported conclusions, circular reasoning | Opus |
| 10 | review-ethics | IRB/consent, conflict of interest, dual-use, ethical compliance | Sonnet |
| 11 | review-quantitative | Statistical reporting, effect sizes, confidence intervals, p-values | Opus |
| 12 | review-domain-expert | Domain-specific conventions, regulatory compliance, field norms | Opus |
| 13 | source-verifier | Source-level claim verification, cross-file consistency | Opus |

Additionally, 3 non-reviewer agents support the loop: **orchestrator** (Opus), **drafter** (Sonnet), and **researcher** (Sonnet).

---

## Domain Support

The domain-router auto-detects document type and activates the appropriate reviewer subset and verification protocols.

| Domain | Always-Active Reviewers | Optional Reviewers | Key Verification Focus |
|--------|------------------------|-------------------|----------------------|
| Scientific | completeness, scientific, methodology, writing, accuracy, citation, logic, quantitative | code, data-figures, ethics | Data accuracy, citation-claim alignment, statistical reporting |
| Legal | completeness, writing, accuracy, citation, logic, ethics, domain-expert | code | Defined term consistency, obligation language, Bluebook compliance |
| Financial | completeness, code, writing, accuracy, logic, quantitative, domain-expert | data-figures | GAAP/IFRS compliance, formula integrity, cross-statement consistency |
| Medical | completeness, scientific, methodology, writing, accuracy, citation, logic, ethics, quantitative | data-figures, domain-expert | IRB compliance, adverse event reporting, CONSORT adherence |
| Engineering | completeness, code, writing, accuracy, logic, quantitative, domain-expert | methodology | Tolerance verification, requirements traceability, standards compliance |
| Policy | completeness, writing, accuracy, citation, logic, ethics, domain-expert | -- | Regulatory impact accuracy, stakeholder attribution, public comment alignment |
| Education | completeness, writing, accuracy, citation, logic, domain-expert | ethics | Learning objective alignment, rubric consistency, accreditation standards |
| Journalism | completeness, writing, accuracy, citation, logic, ethics, domain-expert | -- | Source attribution, factual accuracy, balance of perspectives |

---

## Scripts

Seven Python scripts automate common verification and integrity tasks. All are in the `scripts/` directory.

| Script | Purpose |
|--------|---------|
| `claim_ledger.py` | Create, update, query, and serialize Claim Ledger JSON artifacts |
| `derived_calc_verifier.py` | Independently recompute derived values (fold-changes, percentages, ratios) from raw inputs |
| `cross_doc_consistency_checker.py` | Compare the same metric across multiple documents; flag inconsistencies |
| `stale_value_finder.py` | Search documents for deprecated values that should have been replaced |
| `citation_integrity_check.py` | Diff citations between document versions; detect shifts, removals, and context changes |
| `doc_structure_audit.py` | Validate heading hierarchy, section completeness, and structural integrity |
| `reviewer_report_merger.py` | Merge reports from multiple reviewer agents; deduplicate findings and calibrate severity |

---

## Hooks

Three hooks run automatically during Claude Code sessions when the plugin is active.

### SessionStart — Session Initialization

Runs `hooks/scripts/session_init.sh` at the start of every session. Sets up the plugin environment and checks for required dependencies.

### PreToolUse — Destructive Bash Guard

Intercepts Bash tool calls before execution. Runs `hooks/scripts/guard_destructive_bash.py` to prevent accidental destructive operations (e.g., overwriting source files, deleting data) during document editing workflows. Blocks the operation and warns if the command would modify canonical source data.

### PostToolUse — Post-Edit Integrity Check

Triggers after every Edit or Write tool call. Runs `hooks/scripts/post_edit_integrity.py` to verify that the edit did not introduce value drift, break citation numbering, or corrupt document structure. This is the real-time companion to the Integrity Gate — it catches regressions as they happen rather than waiting for the formal gate.
