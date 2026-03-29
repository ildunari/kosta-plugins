# Medical Writing -- Domain-Specific Gates and Conventions

## Document Types and Their Structures

### Clinical Trial Protocol

```
Title Page (Protocol ID, Sponsor, Version, Date)
Synopsis (1-2 page summary)
Table of Contents
1. Introduction
   1.1 Background and Rationale
   1.2 Risk/Benefit Assessment
2. Study Objectives and Endpoints
   2.1 Primary Objective / Primary Endpoint
   2.2 Secondary Objectives / Secondary Endpoints
   2.3 Exploratory Endpoints
3. Study Design
   3.1 Overall Design
   3.2 Study Schema (diagram)
   3.3 Randomization and Blinding
4. Study Population
   4.1 Inclusion Criteria
   4.2 Exclusion Criteria
5. Study Interventions
   5.1 Dosing and Administration
   5.2 Dose Modifications
   5.3 Concomitant Medications
6. Study Assessments and Procedures
   6.1 Schedule of Assessments (table)
   6.2 Efficacy Assessments
   6.3 Safety Assessments
7. Statistical Considerations
   7.1 Sample Size Determination
   7.2 Analysis Populations
   7.3 Statistical Methods
8. Safety Reporting
   8.1 Adverse Events
   8.2 Serious Adverse Events
   8.3 Reporting Procedures and Timelines
9. Ethics and Regulatory
   9.1 Informed Consent
   9.2 IRB/Ethics Committee
   9.3 Data Protection
Appendices (Informed Consent Form, Case Report Forms)
```

Key conventions:
- Protocol amendments must be tracked with version numbers and dates
- Every change from a prior version requires a rationale
- The Schedule of Assessments table must be consistent with the narrative descriptions
- Endpoint definitions must be precise and measurable

### Clinical Study Report (CSR)

```
Title Page
Synopsis
Table of Contents
List of Abbreviations
Ethics
Investigators and Study Sites
Introduction
Study Objectives
Investigational Plan
Study Patients
  Disposition
  Protocol Deviations
Efficacy Evaluation
Safety Evaluation
  Adverse Events
  Deaths and Serious Adverse Events
  Laboratory Evaluations
Discussion and Conclusions
Appendices (Individual Patient Data)
```

### Case Report

```
Introduction
Case Presentation
  History
  Examination
  Investigations
  Differential Diagnosis
  Treatment
  Outcome and Follow-up
Discussion
Patient Perspective (when available)
Timeline (figure)
```

### Regulatory Submission (IND / NDA / BLA)

```
Module 1: Administrative and Prescribing Information
Module 2: Summaries
  2.1 Table of Contents
  2.2 Introduction
  2.3 Quality Overall Summary
  2.4 Nonclinical Overview
  2.5 Clinical Overview
  2.6 Nonclinical Written and Tabulated Summaries
  2.7 Clinical Summary
Module 3: Quality (CMC)
Module 4: Nonclinical Study Reports
Module 5: Clinical Study Reports
```

### Patient-Facing Materials

```
Study Title (plain language)
Why Is This Study Being Done?
What Will Happen in This Study?
What Are the Possible Risks?
What Are the Possible Benefits?
Do I Have to Take Part?
How Will My Information Be Protected?
Who Do I Contact with Questions?
```

Key conventions:
- Reading level: 6th-8th grade (Flesch-Kincaid)
- No unexplained medical jargon
- Risks must be presented in order of severity and frequency
- Must match the protocol exactly in substance

## Data Verification Gates for Medical Documents

### CONSORT / STROBE Compliance

Clinical trials and observational studies have mandatory reporting standards.

**CONSORT** (Consolidated Standards of Reporting Trials) -- for randomized controlled trials:
- Flow diagram showing enrollment, allocation, follow-up, and analysis numbers
- All numbers in the flow diagram must be internally consistent (e.g., enrolled minus excluded = randomized)
- Primary and secondary endpoints must match the protocol
- Intention-to-treat vs per-protocol populations must be clearly defined
- Pre-specified subgroup analyses distinguished from post-hoc analyses

**STROBE** (Strengthening the Reporting of Observational Studies in Epidemiology) -- for cohort, case-control, and cross-sectional studies:
- Study design described in the title or abstract
- Eligibility criteria, sources, and methods of selection described
- All variables defined with measurement methods
- Statistical methods described including confounding control
- Participant flow diagram with numbers at each stage

**Verification gate:**
- Check every number in the flow diagram for internal consistency
- Verify primary endpoint results match the statistical analysis plan
- Confirm sample sizes at each stage are arithmetically consistent
- Cross-check any subgroup analysis against the pre-specified analysis plan

### IRB / Ethics Requirements

- Informed consent version number matches the approved protocol version
- Study procedures described in consent form match those in the protocol
- All risks mentioned in the protocol appear in the consent form
- Data retention periods comply with institutional and regulatory requirements
- Vulnerable population protections (children, prisoners, pregnant women) are addressed if applicable

### Adverse Event Reporting

Adverse event data requires particular precision because it directly affects patient safety decisions.

1. **Completeness:** Every adverse event reported in the data must appear in the safety tables
2. **Grading consistency:** Adverse events must be graded using the specified scale (typically CTCAE) and the same version throughout
3. **Causality assessment:** Relationship to study drug must be assessed for each event using the protocol-specified categories
4. **Timing accuracy:** Onset dates, resolution dates, and duration must be consistent
5. **SAE narrative consistency:** The narrative description of each serious adverse event must match the structured data fields

**Verification gate:**
- Cross-reference the safety summary tables with the individual patient listings
- Verify that the total number of patients with at least one AE matches across summary and detail tables
- Check that deaths and SAEs reported in the text match the SAE listings
- Confirm MedDRA coding version is specified and consistent

### Plain Language Summaries

When producing patient-facing summaries of clinical results:
- Reading level must be verified (Flesch-Kincaid Grade Level 6-8)
- Medical terms must be followed by plain language definitions
- Risk/benefit information must be balanced and not misleading
- Numbers should be presented as natural frequencies ("3 out of 100 patients") rather than percentages where possible
- Visuals should use icon arrays or simple charts rather than statistical plots

## Value Presentation Conventions

- P-values: Report exact values (p = 0.032) rather than thresholds (p < 0.05), except when p < 0.001
- Confidence intervals: Always report with the confidence level: "HR 0.75 (95% CI: 0.58-0.97)"
- Sample sizes: State n for every group at every analysis point
- Effect sizes: Report absolute and relative measures: "absolute risk reduction of 3.2% (NNT = 31); relative risk 0.68"
- Doses: Include route, frequency, and duration: "200 mg orally twice daily for 28 days"
- Lab values: Include units and reference ranges: "ALT 45 U/L (normal: 7-40 U/L)"
- Time: Use study-relative time (Day 1, Week 12, Month 6) in addition to calendar dates where relevant
- Survival: Median with 95% CI: "median OS 14.2 months (95% CI: 11.8-16.9)"

## Common Medical Writing Pitfalls

| Pitfall | Example | Fix |
|---------|---------|-----|
| Protocol-report mismatch | Protocol specifies PFS as primary endpoint, CSR analyzes OS as primary | Primary endpoint must match between protocol and report |
| CONSORT number gap | 500 enrolled, 450 randomized, but no explanation of the 50 excluded | Flow diagram must account for every participant at every stage |
| SAE underreporting | 3 deaths mentioned in text, but SAE table lists only 2 | Cross-reference every SAE source within the document |
| Informed consent drift | Protocol v3 adds a new procedure, but consent form is still v2 | Consent form version must match or exceed protocol version |
| Unblinded language | "The treatment group showed improvement" in a blinded study interim report | Use "Group A" and "Group B" until unblinding |
| Missing denominator | "15% of patients experienced nausea" without stating the n | Always include denominator: "15% of patients (n=200) experienced nausea" |
| Post-hoc disguised as pre-specified | "Pre-specified subgroup analysis by age" when it was added after database lock | Clearly distinguish pre-specified from post-hoc analyses |
| Grade conflation | Mixing CTCAE v4 and v5 grading in the same document | Specify and use one CTCAE version throughout |

## Compliance Checklists

### Clinical Trial Protocol

- [ ] Protocol version number and date are on every page
- [ ] Synopsis is consistent with the full protocol
- [ ] Primary endpoint definition is precise and measurable
- [ ] Sample size calculation is documented with assumptions
- [ ] Statistical analysis plan is complete (populations, methods, multiplicity adjustment)
- [ ] Schedule of Assessments matches the narrative
- [ ] Inclusion/exclusion criteria are unambiguous
- [ ] Adverse event grading scale (CTCAE version) is specified
- [ ] SAE reporting timeline is stated (typically 24 hours for life-threatening, 15 days for others)
- [ ] Data monitoring committee charter is referenced
- [ ] Informed consent form matches protocol procedures and risks
- [ ] HIPAA/GDPR data protection provisions are included

### Clinical Study Report

- [ ] CONSORT flow diagram is present and internally consistent
- [ ] All numbers in flow diagram are arithmetically correct
- [ ] Primary endpoint results match the pre-specified analysis
- [ ] Safety tables are complete and internally consistent
- [ ] Deaths and SAEs are individually narrativized
- [ ] Protocol deviations are listed and assessed for impact
- [ ] Subgroup analyses are labeled as pre-specified or post-hoc
- [ ] All statistical tests report exact p-values, CIs, and effect sizes
- [ ] All abbreviations are defined in the abbreviations list
- [ ] Appendix cross-references are accurate

### Patient-Facing Materials

- [ ] Reading level is 6th-8th grade (verified with readability tool)
- [ ] No unexplained medical jargon
- [ ] Risks are ordered by severity and frequency
- [ ] Contact information for questions is provided
- [ ] Substance matches the approved protocol exactly
- [ ] Available in required languages for the study population
- [ ] Approved by IRB/ethics committee
