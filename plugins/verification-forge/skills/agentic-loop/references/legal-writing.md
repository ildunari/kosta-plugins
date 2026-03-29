# Legal Writing -- Domain-Specific Gates and Conventions

## Document Types and Their Structures

### Contract / Agreement

```
Recitals (WHEREAS clauses)
Article I: Definitions
Article II-N: Substantive Terms
  Section X.1, X.2, ...
Representations and Warranties
Covenants
Conditions Precedent
Indemnification
Termination
General Provisions (Miscellaneous)
Signature Blocks
Exhibits / Schedules
```

Key conventions:
- Defined terms are capitalized and introduced with quotes on first use: `"Effective Date" means...`
- Every defined term must be used at least once in the operative provisions; unused definitions are deleted
- Cross-references use section numbers, not page numbers: "as described in Section 3.2(a)"
- Recitals provide context but are generally not operative -- obligations live in the articles
- Exhibits are incorporated by reference and must be attached

### Brief / Motion

```
Caption (Court, Parties, Case Number)
Table of Contents
Table of Authorities
Introduction / Preliminary Statement
Statement of Facts
Argument
  I. [Point Heading with Legal Standard]
    A. [Sub-argument]
Conclusion
Certificate of Service
```

Key conventions:
- Point headings are persuasive statements, not neutral labels: "The Court Should Grant Summary Judgment Because No Genuine Dispute of Material Fact Exists"
- Statement of Facts is persuasive but must be accurate -- every factual assertion needs a record citation
- Argument sections lead with the legal standard, then apply facts to law
- Word/page limits are jurisdictionally mandated and strictly enforced

### Legal Opinion

```
Addressee and Date
Scope of Opinion
Assumptions
Qualifications
Opinion Paragraphs
Reliance Limitations
```

### Regulatory Filing

```
Cover Page (Agency, Docket Number)
Executive Summary
Background / Regulatory History
Analysis
  Statutory Authority
  Factual Basis
  Cost-Benefit Analysis
Proposed Action / Rule Text
Public Comment Response (if applicable)
Appendices
```

## Data Verification Gates for Legal Documents

### Defined Terms Consistency

The most common source of legal ambiguity is inconsistent use of defined terms.

1. Extract every defined term (capitalized terms introduced with `"Term" means...` or `"Term" shall mean...`)
2. Search the entire document for each defined term -- it must be capitalized and used exactly as defined everywhere
3. Check for terms used but never defined (capitalized terms without a definitions section entry)
4. Check for terms defined but never used (dead definitions that should be removed)
5. Verify that no defined term is used before its definition unless the definitions section appears before the operative provisions
6. Check for circular definitions (Term A defined by reference to Term B, which references Term A)

### Precision of Language -- Obligation Words

Legal documents use specific words to create different levels of obligation. Using the wrong word changes legal meaning.

| Word | Legal Effect | Common Error |
|------|-------------|--------------|
| `shall` | Creates an obligation (mandatory duty) | Using "will" or "should" when an obligation is intended |
| `will` | Future tense / statement of fact, not an obligation | Using interchangeably with "shall" |
| `may` | Grants permission (discretionary) | Using when an obligation is intended |
| `must` | Used in some jurisdictions instead of "shall" | Mixing "must" and "shall" in the same document |
| `should` | Precatory / advisory, not binding | Using in operative provisions where "shall" is needed |
| `is entitled to` | Creates a right | Confusing with an obligation |

**Verification gate:** Scan all operative provisions (everything outside recitals and definitions) for obligation words. Flag any instance where:
- "will" appears where "shall" seems intended (creating an obligation)
- "should" appears in operative provisions
- "may" and "shall" are used for the same action in different sections
- The document mixes "shall" and "must" conventions

### Citation Format -- Bluebook

Legal citations follow The Bluebook: A Uniform System of Citation (or jurisdiction-specific alternatives).

Common citation forms:
- Cases: *Brown v. Board of Education*, 347 U.S. 483 (1954)
- Statutes: 42 U.S.C. Section 1983
- Regulations: 17 C.F.R. Section 240.10b-5
- Constitutions: U.S. Const. amend. XIV, Section 1

**Verification gate:**
- All case citations include volume, reporter, page, court, and year
- Statutory citations include title, code, and section
- Signals (e.g., *see*, *cf.*, *but see*) are italicized and used correctly
- Pinpoint citations (specific page references) are provided for quoted material
- Subsequent references use proper short forms (*Id.*, *supra*)
- The Table of Authorities lists every case, statute, and secondary source cited

### Privilege and Confidentiality Protection

**Before any document leaves the drafting environment:**
- Remove or redact attorney-client privileged communications
- Remove work product annotations (margin notes, strategy comments)
- Remove metadata that reveals privileged information (tracked changes from privileged sessions, comments containing legal strategy)
- Verify that "DRAFT" or "PRIVILEGED AND CONFIDENTIAL" markings are present on working documents and removed from final filings as appropriate

### Version Control

Legal documents go through multiple negotiation rounds. Version integrity is critical.

- Track which version is current (use clear versioning: "v3 - Redline from Counterparty 2026-03-15")
- Redlines must accurately show all changes from the prior version
- "Clean" versions must have all tracked changes accepted
- Signature pages reference the correct version
- Exhibits match the version they were prepared for

## Value Presentation Conventions

- Monetary amounts: spell out and follow with numerals in parentheses for contracts: "Five Hundred Thousand Dollars ($500,000.00)"
- Dates: spell out the month: "March 28, 2026" (not "3/28/26")
- Time periods: be explicit about calculation: "thirty (30) calendar days" or "ten (10) business days"
- Percentages: use numerals with the percent symbol in financial terms: "7.5% per annum"
- Section references: use the section symbol: "Section 3.2" or "Section 3.2(a)(ii)"

## Common Legal Writing Pitfalls

| Pitfall | Example | Fix |
|---------|---------|-----|
| Undefined terms | Using "Material Adverse Effect" without defining it | Add definition or use plain language |
| Dangling cross-references | "as set forth in Section 5.3" when Section 5.3 was deleted in a prior draft | Search all cross-references after any structural change |
| Ambiguous antecedents | "If the Buyer or Seller fails to perform, they shall..." (who is "they"?) | Repeat the noun: "the non-performing party shall..." |
| Shall/will confusion | "The Vendor will deliver..." in an obligation clause | "The Vendor shall deliver..." |
| Missing carve-outs | "Seller shall not disclose..." without exceptions for legal compulsion | Add: "except as required by applicable law or court order" |
| Inconsistent defined terms | "Purchase Price" in Article II, "Sale Price" in Exhibit A for the same thing | Use one defined term consistently; add to definitions section |
| Orphaned exhibits | "See Exhibit B" but Exhibit B is not attached | Verify all referenced exhibits are present and current |
| Time computation ambiguity | "within 30 days" without specifying calendar or business days, or start date | "within thirty (30) calendar days after the Effective Date" |

## Compliance Checklists

### Contract Review

- [ ] All defined terms are used consistently and capitalized throughout
- [ ] No defined term is used before its definition (or definitions section precedes operative text)
- [ ] No unused defined terms remain in the definitions section
- [ ] All cross-references resolve to existing sections
- [ ] Obligation words (shall/will/may/must) are used consistently and correctly
- [ ] All exhibits and schedules referenced in the body are attached
- [ ] Signature blocks match the parties named in the preamble
- [ ] Governing law and dispute resolution clauses are present
- [ ] Notice provisions include current addresses and acceptable delivery methods
- [ ] Assignment and amendment provisions are complete
- [ ] Severability clause is present
- [ ] Entire agreement / integration clause is present

### Brief / Motion Review

- [ ] Caption matches the court's required format
- [ ] Word/page count complies with local rules
- [ ] Table of Contents page numbers are accurate
- [ ] Table of Authorities is complete and page numbers are accurate
- [ ] Every factual assertion in Statement of Facts has a record citation
- [ ] Point headings are persuasive and contain the legal standard
- [ ] Legal standards are correctly stated for the applicable jurisdiction
- [ ] All cases cited are still good law (not overruled or distinguished)
- [ ] Certificate of Service is complete and dated
- [ ] Filing complies with local electronic filing requirements

### Regulatory Filing

- [ ] Docket number and agency reference are correct
- [ ] Statutory authority is cited accurately
- [ ] Cost-benefit analysis uses current data and approved methodology
- [ ] Public comment response addresses each substantive comment received
- [ ] Proposed rule text is consistent with the analysis sections
- [ ] All appendices are referenced in the body and attached
- [ ] Filing deadline compliance verified
