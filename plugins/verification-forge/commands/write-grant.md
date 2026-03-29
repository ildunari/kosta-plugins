---
name: write-grant
description: Full grant writing workflow with verification loop, Claim Ledger, and multi-reviewer gate
---

# Write Grant

Invoke the **verification-forge-loop** skill with preconfigured settings for grant writing.

## Configuration

- **Domain:** Scientific
- **Verification Tier:** Tier 3 (high-stakes — verify 100% of claims + dependency sweep)
- **Reviewers:** completeness, scientific, methodology, writing, accuracy, citation, logic, quantitative

## Workflow

### Interview Phase

Before starting the loop, interview the user to gather essential grant context:

1. **Funding agency** — which agency (NIH, NSF, DOD, foundation, etc.) and specific mechanism (R01, R21, U01, SBIR, etc.)
2. **Specific aims** — what are the aims, hypotheses, and expected outcomes
3. **Data sources** — where do the canonical numbers live (spreadsheets, figures, preliminary data files)
4. **Page limits and formatting** — agency-specific page limits, font, margin, and section requirements
5. **Resubmission context** — is this a new submission or resubmission? If resubmission, what were the reviewer critiques?

Confirm the gathered information before proceeding.

### Execution

Run the full 9-step agentic loop:

1. **Research** — read existing draft (if any), all data sources, agency guidelines, and prior reviewer feedback
2. **Source Verify** — build the Claim Ledger from all quantitative statements; verify every value against source files
3. **Structure Plan** — map the grant's section structure against agency requirements; plan any reorganization
4. **Draft** — dispatch drafting sub-agents with Claim Ledger values, citation maps, and style constraints
5. **Apply Gate** — apply drafted content to the document; confirm successful application
6. **Integrity Gate** — verify all new values match the Claim Ledger; search for stale values; check citation integrity
7. **Dual Review** — dispatch all 8 reviewers in parallel via reviewer-gate; merge reports
8. **Fix** — address all P0 and P1 findings from the review
9. **Save + Document** — save final document, Claim Ledger JSON, and change log

The Claim Ledger is produced alongside the document at every phase and saved as a JSON artifact at completion.
