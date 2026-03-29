# Policy Writing -- Domain-Specific Gates and Conventions

## Document Types and Their Structures

### White Paper

```
Executive Summary
Introduction
  Problem Statement
  Scope and Audience
Background / Context
Analysis
  Current State
  Data and Evidence
  Comparative Analysis (jurisdictions, approaches, precedents)
Policy Options
  Option A: [Description, Pros, Cons, Cost Estimate]
  Option B: [Description, Pros, Cons, Cost Estimate]
  Option C: [Description, Pros, Cons, Cost Estimate]
Recommendation
Implementation Considerations
  Timeline
  Resource Requirements
  Stakeholder Impact
References
Appendices
```

Key conventions:
- Executive summary must stand alone -- a reader who reads only this section should understand the problem, the options, and the recommendation
- Data claims must cite primary sources, not secondary summaries
- Policy options should be presented with balanced analysis before the recommendation
- Cost estimates should state their methodology and assumptions

### Regulatory Impact Analysis (RIA)

```
1. Statement of Need
   1.1 Market Failure or Regulatory Gap
   1.2 Legal Authority
2. Baseline Analysis
   2.1 Current Regulatory Framework
   2.2 Baseline Projections (without action)
3. Regulatory Alternatives
   3.1 Option 1: No Action
   3.2 Option 2: [Less Restrictive Alternative]
   3.3 Option 3: [Proposed Rule]
   3.4 Option 4: [More Restrictive Alternative]
4. Cost-Benefit Analysis
   4.1 Methodology
   4.2 Costs by Stakeholder
   4.3 Benefits by Category (monetized and non-monetized)
   4.4 Net Benefits
   4.5 Distributional Effects
5. Small Entity Analysis (Regulatory Flexibility Act)
6. Paperwork Burden (Paperwork Reduction Act)
7. Uncertainty Analysis
Appendices (Data Sources, Model Documentation)
```

### Legislative Summary / Bill Analysis

```
Bill Information (Number, Sponsor, Date Introduced)
Purpose / Short Title
Background
Key Provisions
  Section-by-section summary
Fiscal Impact
  Federal Cost Estimate
  State/Local Impact
Stakeholder Positions
  Supporters (who, why)
  Opponents (who, why)
Comparison to Existing Law
Implementation Timeline
Open Questions / Ambiguities
```

### Impact Assessment

```
1. Introduction
   1.1 Policy Being Assessed
   1.2 Assessment Scope and Methodology
2. Affected Populations
3. Impact Categories
   3.1 Economic Impact
   3.2 Environmental Impact
   3.3 Social/Equity Impact
   3.4 Health and Safety Impact
4. Data and Evidence
5. Distributional Analysis (who bears costs, who gets benefits)
6. Mitigation Measures
7. Monitoring and Evaluation Framework
8. Conclusions
```

## Data Verification Gates for Policy Documents

### Source Attribution

Policy documents derive their credibility from their sources. Every factual claim must be traceable to a primary source.

**Source hierarchy (strongest to weakest):**
1. Government statistical agencies (BLS, Census, BEA, CBO)
2. Peer-reviewed research
3. Official government reports and regulatory filings
4. Established research institutions and think tanks (with known methodology)
5. Industry associations and advocacy groups (acknowledge potential bias)
6. News reports (corroborate with primary source)
7. Anecdotal evidence (label as such)

**Verification gate:**
1. Every statistical claim cites a source with enough specificity to locate the exact number (agency, dataset, table, year)
2. No statistical claim relies solely on a secondary source when the primary data is publicly available
3. Sources are current -- data older than 3 years must be justified or acknowledged as dated
4. Sources from advocacy groups or industry associations are labeled with the organization's position on the issue
5. When different sources report different numbers for the same metric, the discrepancy is acknowledged and the chosen source is justified

### Stakeholder Framing

Policy documents must be transparent about whose perspective is being represented and where the analysis sits on the advocacy-neutrality spectrum.

**Verification gate:**
1. The document explicitly states its perspective: neutral analysis, advocacy for a position, or stakeholder briefing
2. When presenting stakeholder positions, all major stakeholder groups are represented (not just those who support the preferred option)
3. Quoted stakeholder positions are accurately attributed and not taken out of context
4. Cost and benefit distributions are analyzed by affected group, not just in aggregate
5. When the author has a position, it is stated in the introduction, not disguised as neutral analysis

**Framing indicators to check:**
| Signal | Risk | Fix |
|--------|------|-----|
| Only costs for opponents, only benefits for supporters | One-sided framing | Present costs and benefits for all options equally |
| Passive voice for negative outcomes | Obscuring responsibility | Name the agent: "The regulation would impose $2M in compliance costs on small businesses" |
| Loaded terms | "Burdensome regulation" vs "consumer protection" | Use neutral language; acknowledge that the same policy can be described differently by different stakeholders |
| Absent stakeholders | Analysis ignores affected groups who lack political voice | Explicitly note which groups were not consulted and why |

### Data Provenance

For quantitative claims in policy documents, the full provenance chain matters: where did the number come from, what methodology produced it, and what are its limitations?

**Verification gate:**
1. For every key statistic: identify the original data source, the collection methodology, the sample or coverage, and the margin of error
2. For projections and forecasts: identify the model, its key assumptions, and its track record
3. For cost estimates: identify the estimation methodology (engineering cost estimate, econometric model, analogy, expert judgment) and its uncertainty range
4. For survey data: report the sample size, response rate, and margin of error
5. For international comparisons: verify that the metrics being compared are measured the same way across jurisdictions

### Public Comment Compliance

When a policy document responds to or incorporates public comments:
1. Every substantive comment must receive a response
2. The response must address the substance, not just acknowledge receipt
3. When comments led to changes, the specific change and the comment that prompted it must be documented
4. When comments were rejected, the rationale must be stated
5. The number of comments received by topic should be reported (without implying that volume determines merit)

## Value Presentation Conventions

- Economic values: Specify constant or nominal dollars and the base year: "in 2024 constant dollars" or "in nominal terms"
- Population statistics: Include year, source, and universe: "15.3 million households below the federal poverty line (Census ACS, 2024)"
- Percentages: Distinguish between percentage points and percent change: "increased from 10% to 15%" is a "5 percentage point increase" or a "50% increase," not both interchangeably
- Cost estimates: Always include the time horizon and discount rate: "estimated 10-year cost of $4.2 billion (2024 dollars, 3% discount rate)"
- Ranges: Report ranges when uncertainty is significant: "$2.1-3.8 billion" rather than a false-precision point estimate
- International comparisons: Specify whether purchasing power parity (PPP) or market exchange rates are used
- Date references: Use "as of" for point-in-time data: "as of December 2025" or "for the period January-June 2025"

## Common Policy Writing Pitfalls

| Pitfall | Example | Fix |
|---------|---------|-----|
| Cherry-picked baseline | Choosing 2020 (pandemic year) as the baseline for economic comparison | Use a representative baseline period or multi-year average |
| Correlation as causation | "States with policy X have lower rates of Y" implying X caused the improvement | Acknowledge confounders; state the evidence level (correlational, quasi-experimental, RCT) |
| Aggregate masking | "Average income rose 5%" when the top decile rose 30% and the bottom fell 2% | Report distributional effects alongside aggregates |
| Stale data | Using 2019 labor statistics for a 2026 policy proposal | Use the most recent available data; acknowledge temporal gap if unavoidable |
| False precision | "The regulation will create 14,237 jobs" | Use ranges: "estimated to create 12,000-16,000 jobs" |
| Missing counterfactual | Listing only the costs of action without considering the costs of inaction | Always analyze the "no action" baseline |
| Advocacy disguised as analysis | "Obviously, the best approach is..." in what's labeled a neutral analysis | Label the document's stance clearly; separate analysis from recommendation |
| Unquantified benefits | "The rule will improve public health" without monetization or metrics | Quantify where possible; for non-monetizable benefits, provide concrete metrics (lives saved, quality-adjusted life years) |

## Compliance Checklists

### White Paper

- [ ] Executive summary can stand alone
- [ ] Problem statement is supported by data
- [ ] All statistical claims cite primary sources
- [ ] Multiple policy options are analyzed with balanced treatment
- [ ] Cost estimates state methodology and assumptions
- [ ] Stakeholder impacts are distributed, not just aggregated
- [ ] Recommendation follows logically from the analysis
- [ ] Limitations and uncertainties are acknowledged
- [ ] All sources are listed in references

### Regulatory Impact Analysis

- [ ] Legal authority is correctly cited
- [ ] Baseline reflects current conditions without the proposed action
- [ ] At least three alternatives are analyzed (including no action)
- [ ] Cost-benefit analysis uses approved methodology (OMB Circular A-4 or equivalent)
- [ ] Discount rates are applied consistently (typically 3% and 7% for federal)
- [ ] Small entity analysis is complete (Regulatory Flexibility Act)
- [ ] Paperwork burden is estimated (Paperwork Reduction Act)
- [ ] Distributional effects are analyzed
- [ ] Uncertainty analysis quantifies key assumptions
- [ ] Public comments are addressed substantively

### Legislative Summary

- [ ] Bill number, sponsor, and date are accurate
- [ ] Section-by-section summary covers all substantive provisions
- [ ] Fiscal impact estimates cite CBO or equivalent scoring
- [ ] Comparison to existing law is accurate
- [ ] Stakeholder positions are accurately represented
- [ ] Open questions are flagged rather than silently resolved
- [ ] Implementation timeline is realistic
- [ ] Effective dates are correctly stated
