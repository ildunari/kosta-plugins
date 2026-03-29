---
name: edit-report
description: Edit any document type with the full verification loop — auto-detects domain
---

# Edit Report

Edit any document type using the full verification loop. Auto-detects the document domain and configures reviewers accordingly.

## Workflow

### 1. Domain Detection

Run the **domain-router** skill to classify the document. The router examines user declaration, file metadata, content keywords, and structure patterns to determine the domain (scientific, legal, financial, medical, engineering, policy, education, journalism, or general).

### 2. Interview

Gather context from the user:

1. **What to change** — which sections, values, structure, or tone need updating
2. **Data sources** — where do the canonical values live (if applicable)
3. **Audience** — who reads this document and what are their expectations
4. **Constraints** — word limits, formatting rules, compliance requirements

### 3. Scope Assessment

Based on the interview, determine whether to use the **compact** or **full** phase declaration:

- **Compact** (fewer than 3 sections affected, no cross-section dependencies, fewer than 5 claims) — run the 9-step loop with abbreviated Research and Structure Plan steps
- **Full** (3+ sections, cross-references, 5+ claims, or compliance-sensitive) — run the complete 9-step loop with thorough research, full Structure Plan, and comprehensive Integrity Gate

### 4. Execute the 9-Step Loop

Run the agentic loop with domain-appropriate configuration:

1. **Research** — read document, data sources, and reference materials
2. **Source Verify** — build or update Claim Ledger from quantitative statements
3. **Structure Plan** — map changes if reorganization is needed (conditional)
4. **Draft** — dispatch drafting sub-agents with verified values and domain style constraints
5. **Apply Gate** — apply changes; confirm success; re-read affected sections
6. **Integrity Gate** — verify values, citations, and structure; run domain-relevant scripts
7. **Dual Review** — dispatch domain-appropriate reviewers via reviewer-gate
8. **Fix** — address P0 and P1 findings
9. **Save + Document** — save updated document, Claim Ledger JSON, and change log

### 5. Outputs

Produce three artifacts:
- **Updated document** — the edited file with all changes applied
- **Claim Ledger** — JSON artifact tracking every verified claim
- **Change log** — what changed, why, and which claims were affected
