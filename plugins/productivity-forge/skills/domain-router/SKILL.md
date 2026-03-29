---
name: domain-router
description: >
  Auto-detect document domain and activate relevant skills, reviewers, and
  verification protocols. Use at the start of the agentic loop to classify
  the document and configure the pipeline.
---

# Domain Router

Classify the document's domain at the start of the agentic loop, then activate the correct reference files, reviewer subsets, and verification tier defaults. This step prevents applying scientific writing conventions to a legal brief or financial verification gates to an educational curriculum.

## Detection Method

Domain detection uses four signals, in order of reliability:

1. **User declaration** (highest confidence) -- The user explicitly states the domain: "this is a grant resubmission," "review this contract," "edit our 10-K filing." Always takes precedence over automatic detection.

2. **File type and metadata** -- File extension, template markers, metadata fields. A `.tex` file with `\bibliography` is likely scientific. A `.docx` with "CONFIDENTIAL -- ATTORNEY WORK PRODUCT" is legal. An `.xlsx` with GAAP account codes is financial.

3. **Content keywords and structure** -- Scan the first 2-3 pages (or first 500 lines) for domain-specific vocabulary and structural patterns:
   - Scientific: "hypothesis," "methodology," "p-value," "Figure N," IMRAD structure, citation brackets
   - Legal: "WHEREAS," "hereinafter," "shall," "Article/Section" numbering, defined terms in quotes
   - Financial: "EBITDA," "revenue recognition," "basis points," tabular financials, fiscal year references
   - Medical: "IRB," "adverse event," "CONSORT," "informed consent," dosing tables
   - Engineering: tolerance notation (e.g., +/- 0.005), "shall comply with ISO," requirements IDs (REQ-001)
   - Policy: "stakeholder," "regulatory impact," "public comment period," "proposed rule"
   - Education: "learning objective," "Bloom's taxonomy," "rubric," "accreditation standard"
   - Journalism: "sources say," "according to," byline, dateline, inverted pyramid structure

4. **Structure patterns** (lowest confidence) -- Document outline and section hierarchy match a known domain template. Used as a tiebreaker when keywords are ambiguous.

When signals conflict, prefer the higher-reliability signal. When no signal is strong, default to "general" and apply the universal verification gates from the agentic loop without domain-specific overlays.

## Domain Classification Table

| Domain | Reference File | Default Reviewers | Default Tier | Key Verification Focus |
|--------|---------------|-------------------|-------------|----------------------|
| Scientific | `references/scientific-writing.md` | Domain accuracy, citation integrity, statistical reporting, language | Standard (Tier 2) | Data accuracy, variance reporting, citation-claim alignment, methodology consistency |
| Legal | `references/legal-writing.md` | Defined terms, precision of language, citation format, privilege | Standard (Tier 2) | Defined term consistency, obligation/permission word choice, Bluebook compliance, version control |
| Financial | `references/financial-writing.md` | Formula integrity, GAAP compliance, reconciliation, audit trail | High-stakes (Tier 3) | Formula verification, cross-statement reconciliation, rounding consistency, SEC formatting |
| Medical | `references/medical-writing.md` | Protocol compliance, reporting standards, safety, plain language | High-stakes (Tier 3) | CONSORT/STROBE adherence, adverse event completeness, IRB alignment, HIPAA compliance |
| Engineering | `references/engineering-writing.md` | Requirements traceability, units, tolerances, standards | Standard (Tier 2) | Requirements coverage, unit consistency, tolerance notation, standards compliance |
| Policy | `references/policy-writing.md` | Source attribution, framing neutrality, data provenance | Standard (Tier 2) | Source verification, stakeholder framing balance, data provenance chain, public comment compliance |
| Education | `references/education-writing.md` | Objective alignment, assessment validity, accessibility | Standard (Tier 2) | Bloom's alignment, rubric-objective mapping, accessibility (UDL), institutional format |
| Journalism | `references/journalism-writing.md` | Source verification, quote accuracy, editorial standards | Standard (Tier 2) | Independent source confirmation, quote fidelity, defamation risk, correction protocol |

## What Each Domain Activates

When a domain is identified, the router configures the agentic loop pipeline:

### Reference File Loading

The domain-specific reference file is added to the Reference Loading Protocol table. It is loaded when the orchestrator reaches the Source Verify, Draft, or Dual Review steps -- not at session start.

### Reviewer Subset

The Dual Review step (Step 7) dispatches domain-specific reviewers from `references/review-dimensions.md`. Each domain activates a different combination of review dimensions:

| Domain | Domain Review Dimensions | Always Active |
|--------|------------------------|---------------|
| Scientific | Data accuracy, citation integrity, statistical reporting, methodology | Language review |
| Legal | Defined term consistency, obligation precision, citation format, privilege screening | Language review |
| Financial | Formula integrity, GAAP compliance, cross-statement reconciliation, materiality | Language review |
| Medical | Protocol compliance, reporting standards (CONSORT/STROBE), safety completeness | Language review |
| Engineering | Requirements traceability, units/tolerances, standards compliance | Language review |
| Policy | Source attribution, framing neutrality, data provenance, regulatory compliance | Language review |
| Education | Objective alignment, assessment validity, accessibility compliance | Language review |
| Journalism | Source verification, quote accuracy, defamation risk, editorial standards | Language review |

### Verification Tier Default

Each domain sets a default tier, but the orchestrator can override based on the specific phase:

- **Financial and Medical default to Tier 3** because errors in these domains have direct real-world consequences (regulatory penalties, patient safety).
- **All other domains default to Tier 2** for phases that change quantitative content.
- The orchestrator may escalate any domain to Tier 3 based on phase characteristics (cross-document work, >10 claims, compliance sensitivity).
- The orchestrator may de-escalate to Tier 1 for discovery and research phases in any domain.

## Override Protocol

The user can always declare or override the domain:

**Explicit declaration:** "Treat this as a financial document." The router accepts this immediately, regardless of automatic detection results.

**Domain correction:** "This isn't legal -- it's a policy document." The router reclassifies and swaps reference files and reviewer subsets.

**Multi-domain documents:** Some documents span domains (e.g., a medical device regulatory filing is both medical and engineering; a research budget justification is both scientific and financial). In these cases:
1. Declare the primary domain (determines structure and conventions).
2. Load secondary domain references for their verification gates only.
3. Activate reviewers from both domains.
4. Use the higher default tier between the two domains.

**No-domain override:** "Skip domain-specific checks -- just verify the numbers." The router disables domain-specific reviewers and reference files, keeping only the universal verification gates and language review.

## Phase Declaration Integration

When the domain router classifies a document, the result feeds into the Phase Declaration:

```
Domain reviewer: [scientific / legal / financial / medical / engineering / policy / education / journalism / general]
```

This field in the phase declaration is set automatically by the router but can be overridden in the declaration itself.

## Adding New Domains

If you encounter a document type that doesn't fit any existing domain, note it in `FEEDBACK.md` with:
- What kind of document it was
- What verification gates would have been useful
- What conventions the existing domains couldn't capture

This feedback drives the creation of new domain reference files in future phases.
