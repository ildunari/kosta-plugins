# Scientific Writing — Domain-Specific Gates and Conventions

## Document Types and Their Structures

### NIH R01 Grant (Research Strategy)

Expected structure per Aim:
```
Aim N: [Title + objective statement]
  Background / Rationale / Literature Review
  Preliminary Studies (data supporting the aim)
  Research Design / Methodology
    Activities N.1, N.2, ...
  Expected Outcomes
  Potential Pitfalls and Alternative Strategies
```

Key conventions:
- Preliminary data should be consolidated in one subsection, not scattered across the aim
- The objective paragraph states the hypothesis and approach — it should not contain specific data values
- Expected Outcomes are forward-looking predictions, not restatements of existing data
- Pitfalls address what could go wrong and how the team would adapt
- Resubmissions require change bars (vertical sidebar lines) on every modified paragraph in the Research Strategy
- Yellow highlights are common working markers but must be removed before submission
- Track changes should be used during editing for PI review, then accepted for the final submission version
- Word/page limits are strictly enforced — monitor word count during restructuring

### Journal Manuscript (IMRAD)

```
Introduction
Methods
Results
Discussion
```

Key conventions:
- Introduction ends with a clear statement of the study's objective
- Methods must be reproducible — another lab should be able to replicate the work
- Results presents data without interpretation (save that for Discussion)
- Discussion starts with the main finding, then context, limitations, and implications
- Figures and tables are referenced in order of appearance

### Lab Protocol / SOP

```
Purpose
Scope
Materials and Equipment
Procedure (numbered steps)
Quality Control
Troubleshooting
References
Revision History
```

## Data Verification Gates for Scientific Documents

### Before Writing Any Data-Containing Section

1. Identify which file is the source of truth for each value
2. Read that file directly — do not rely on values from prior conversation turns or summaries
3. For each value, record: the exact number, its source file and location, the condition/timepoint it refers to, and its variance (std, SEM, or CI)
4. Flag values where: variance exceeds the mean (CV > 100%), sample size is < 3, or different source files disagree

### Value Presentation Conventions

- Report means with appropriate error measure: "41.4M particles (std 3.36M, n=3)"
- State n for every dataset at first mention
- Use consistent rounding throughout — don't round to different decimal places for the same type of measurement
- When converting between units or readouts (e.g., fluorescence area → particle counts), state the conversion method and its assumptions
- Never present a single experiment's value as if it were the mean
- Flag high-variance conditions explicitly: "PEG100k internalization showed high inter-replicate variability (std 43.4M on mean 36.9M, n=3)"

### Citation Integrity for Scientific Text

Citations in scientific documents serve specific functions:
- **Supporting a factual claim** — "[14, 15]" after "our previous work showed X"
- **Attributing an idea or method** — "[25]" after "following established protocols"
- **Providing context** — "[18-20]" after "the literature shows Y"

When restructuring text:
- A citation must stay with the claim it supports, not the paragraph it happened to be in
- If a claim moves to a new section, its citation moves with it
- If multiple claims share a citation, verify each use is still contextually valid after restructuring
- Self-citations (our work: [14, 15, 16]) belong in Preliminary Studies or Introduction, not in the Literature Review unless they're being discussed as part of the field's knowledge base
- External citations belong in the Literature Review or Background, not in Preliminary Studies (unless directly comparing our results to published data)

### Common Scientific Writing Pitfalls

| Pitfall | Example | Fix |
|---------|---------|-----|
| Cherry-picking | Using one experiment's 0.06x ratio when the mean is 0.64 | Always report means with error measures |
| Overclaiming | "We conclusively demonstrate" with n=3 | "Our preliminary data suggest" or "These findings indicate" |
| Underclaiming | "It may potentially be possible that there could be a trend" | State the finding directly with appropriate hedging: "PEG200k showed the highest transport (41.4M particles, n=3)" |
| Stale sweet spot | "35-100 kDa" when the data show 35-200 kDa | Update every instance, including methods sections that reference preliminary findings |
| Ghost figures | "see Figure 1" when Figure 1 hasn't been generated yet | Flag with a comment; don't delete the callout |
| Mixed readouts | Methods describe fluorescence area, results report particle numbers | Ensure methodology section explains the conversion pipeline |
| Inconsistent rankings | Abstract says PEG100k is best, Results show PEG200k is best | Search the entire document for every mention of rankings and update all |

## Compliance Checklists

### NIH Resubmission Specific

- [ ] All changed paragraphs will have change bars in the final PDF
- [ ] Response to Reviewers addresses each critique point
- [ ] Reviewer-requested changes are highlighted or referenced in the Research Strategy
- [ ] Animal numbers match across Specific Aims, Approach, and Vertebrate Animals section
- [ ] Power analysis justifies the proposed sample sizes
- [ ] Budget matches the proposed activities
- [ ] Biographical sketches are current
- [ ] Letters of support are included for key collaborations
- [ ] Page limits are met (typically 12 pages for Research Strategy)

### General Scientific Document

- [ ] All acronyms defined at first use
- [ ] All figures and tables referenced in text
- [ ] All references cited in text appear in the reference list (and vice versa)
- [ ] Units are consistent throughout
- [ ] Statistical tests are named with exact p-values and effect sizes
- [ ] Sample sizes stated for every dataset
- [ ] Variance/error measures accompany every mean
- [ ] Limitations are acknowledged
