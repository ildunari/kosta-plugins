---
name: audit-citations
description: Audit citation integrity — missing refs, wrong context, orphaned citations
---

# Audit Citations

Citation-focused audit mode. Evaluate every citation in a document for correctness, context alignment, completeness, and format compliance.

## Constraints

- **Do NOT edit the document.** This command produces a citation audit report only.

## Workflow

### 1. Read Document

Read the full document. Extract every citation — inline references, footnotes, endnotes, bibliography entries, and any cross-references to figures, tables, or sections.

### 2. Build Citation Inventory

For each citation, record:

- **Citation ID** — sequential identifier
- **Citation text** — the reference as it appears in the document
- **Location** — section, paragraph, and sentence where it appears
- **Claim supported** — the statement the citation is meant to support
- **Reference list entry** — the corresponding entry in the bibliography/reference list (if any)

### 3. Run Citation Integrity Check

If a previous version of the document exists, run `scripts/citation_integrity_check.py` to diff citations between versions and detect:

- Citations added or removed between versions
- Citations whose surrounding context changed (potentially invalidating them)
- Numbered reference shifts from insertions or deletions

### 4. Dispatch Citation Reviewer

Dispatch the **review-citation** agent to evaluate each citation against these dimensions:

- **Missing references** — claims that make verifiable assertions but have no citation
- **Wrong context** — citations that do not actually support the claim they are attached to
- **Format violations** — citations that do not match the document's citation style (APA, Vancouver, Bluebook, etc.)
- **Orphaned references** — entries in the reference list that are never cited in the text
- **Duplicate references** — the same source cited under different reference numbers or formats
- **Broken references** — numbered citations that do not resolve to a reference list entry

### 5. Cross-Check Reference List

Compare the reference list against the citation inventory:

- Every in-text citation should have a matching reference list entry
- Every reference list entry should have at least one in-text citation
- Reference numbering should be sequential without gaps (for numbered systems)
- Author names, years, and titles should be consistent between in-text and reference list forms

### 6. Produce Citation Audit Report

Output a structured report containing:

- **Summary** — total citations, total references, missing, orphaned, format violations, wrong context
- **Findings by severity** — P0 (missing or wrong-context citations), P1 (orphaned or broken refs), P2 (format violations), P3 (minor inconsistencies)
- **Citation-to-reference mapping** — full table showing each citation and its matched reference
- **Recommendations** — prioritized fixes
