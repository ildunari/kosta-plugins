# Review Dimensions

> **Plugin note:** The verification-forge plugin expands these review dimensions to 13 independent reviewer agents, each with its own prompt contract, evidence requirements, and severity calibration. The dimensions listed here serve as the baseline checklist that each reviewer agent builds upon. See `reviewer-gate/SKILL.md` for the full roster of reviewer agents and their dispatch protocol.

When loaded during the Dual Review step, read only the section relevant to the current domain plus the Language Review Dimensions section (which applies to all domains). Skip other domain sections to conserve context.

Checklists for each review type across domains. Reviewers should check relevant dimensions from this list — not every dimension applies to every phase.

## Domain Review Dimensions

### Scientific Writing (Grants, Papers, Abstracts)

| Dimension | What to check |
|-----------|---------------|
| Data accuracy | Every number matches the canonical source file. No rounding errors, no transposed digits, no values from the wrong condition or timepoint |
| Statistical reporting | Means use the right denominator (n), SEMs vs SDs are correctly labeled, variance is flagged when CV exceeds reasonable thresholds for the field |
| Citation integrity | Every citation is present, in the right context, and references the correct claim. No citations were lost during text moves. Self-citations vs external citations are in appropriate sections |
| Claim proportionality | Conclusions are proportional to the evidence. Overclaiming (definitive language with n=3 and high variance) and underclaiming (excessive hedging that weakens the grant) are both flagged |
| Methodology consistency | The methods section describes the same procedure that produced the reported data. If the readout changed (e.g., fluorescence area → particle counts), the methods reflect the current pipeline |
| Structural compliance | The document follows domain conventions (R01 structure for NIH grants, IMRAD for manuscripts, etc.). Headings, section order, and required elements are present |
| Cross-section consistency | The same finding is described the same way in every section. If the abstract says PEG200k is the top performer, the preliminary data and expected outcomes should agree |
| Figure/table references | Every figure and table mentioned in the text exists (or is flagged as needing creation). Callouts point to the right figure |
| Sample size context | n is stated for every dataset. Conditions with n < 3 are flagged. Comparisons between groups with very different n values are noted |

### Legal Documents

| Dimension | What to check |
|-----------|---------------|
| Defined terms | Terms defined in one section are used consistently throughout. No undefined terms in operative language |
| Precision | Language is unambiguous. "May" vs "shall" vs "will" are used intentionally. Vague quantifiers ("reasonable," "timely") have standards where possible |
| Citation format | Legal citations follow the required format (Bluebook, jurisdiction-specific) |
| Compliance | Document meets all regulatory requirements for the jurisdiction and purpose |
| Privilege | No privileged information is inadvertently disclosed |
| Version control | Track changes show all modifications. No unmarked changes from a previous version |

### Lab Documentation (Protocols, SOPs)

| Dimension | What to check |
|-----------|---------------|
| Reproducibility | A trained scientist could follow the protocol and get the same result. Steps are in order, quantities are specific, timing is clear |
| Safety | Hazards are identified, PPE requirements are stated, waste disposal is specified |
| Units | All measurements include units. Unit conversions are explicit, not assumed |
| Equipment | Instruments are identified by model number where it matters. Calibration requirements are noted |
| Reagent specifications | Catalog numbers, concentrations, storage conditions, expiration considerations |

### Financial / Budget Documents

| Dimension | What to check |
|-----------|---------------|
| Formula integrity | Formulas reference the correct cells. Totals match their components. No hardcoded values masquerading as formulas |
| Reconciliation | Totals agree across sections. Budget categories sum to the overall total |
| Audit trail | Changes are documented. Assumptions are stated. Sources are cited |
| Format compliance | Budget follows sponsor requirements (NIH modular budget, NSF budget justification, etc.) |

## Language Review Dimensions

These apply to all domains. The goal is text that reads like a human professional wrote it.

### AI-Telltale Detection

| Pattern | What it looks like | Fix |
|---------|-------------------|-----|
| Transition stacking | "Furthermore," "Moreover," "Additionally," appearing multiple times per page | Vary transitions. Use shorter sentences that don't need transitions. Start sentences with the subject, not a connector |
| Excessive hedging | "It is worth noting that," "It should be noted that," "It is important to recognize" | Cut the hedge. State the point directly |
| Parallel structure overuse | Three+ consecutive sentences with identical grammatical structure | Vary sentence length and structure. Mix simple, compound, and complex sentences |
| Listy prose | Every paragraph is a topic sentence + 3-4 bullet-like supporting sentences + summary sentence | Break the pattern. Use narrative flow, cause-and-effect, or temporal sequence instead |
| Unnaturally perfect grammar | Zero contractions, zero fragments, zero informal constructions in text that should sound conversational | Match the register of the document. Scientific writing is formal but not robotic. A grant PI's voice has personality |
| Vocabulary uniformity | Every sentence uses the same level of complexity. No simple sentences mixed with technical ones | Real writers vary. Some sentences are short and direct. Others are longer and more nuanced. Mix them |
| Em-dash overuse | More than 2 em-dashes per 500 words | Replace some with commas, parentheses, or sentence breaks |
| "Delve," "tapestry," "paradigm," "synergy" | AI-associated vocabulary | Use plain English equivalents |

### Tone Consistency

- Does the new text match the voice of the unchanged surrounding text?
- If the document has a specific author's style (a PI who writes in long, dense paragraphs), does the new text sound like them?
- Is the formality level consistent? (No casual phrasing in a formal grant, no stiff language in a conversational report)

### Readability

- Are sentences digestible? (Scientific writing can be dense, but not impenetrable)
- Are key points findable by a reviewer who's scanning?
- Are acronyms defined at first use?
- Is jargon appropriate for the audience?

## Severity Scale

Both reviewers use the same severity system:

| Severity | Meaning | Action |
|----------|---------|--------|
| **P0** | Blocks finalization — wrong data, lost citations, compliance failure, text that contradicts the evidence | Must fix before phase completes |
| **P1** | Should fix — overclaiming, inconsistency between sections, awkward AI-sounding prose that a reviewer would notice | Fix unless doing so would delay the user unreasonably |
| **P2** | Worth fixing if easy — minor tone issues, slightly imprecise wording, formatting inconsistencies | Fix only if < 2 minutes of effort |
| **P3** | Noted — stylistic preference, optional improvement, polish items | Report to user, don't fix unless asked |
