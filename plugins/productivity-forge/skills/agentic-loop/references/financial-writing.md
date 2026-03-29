# Financial Writing -- Domain-Specific Gates and Conventions

## Document Types and Their Structures

### 10-K / 10-Q (SEC Filing)

```
Part I
  Item 1: Business
  Item 1A: Risk Factors
  Item 2: Properties
  Item 3: Legal Proceedings
Part II
  Item 5: Market for Registrant's Common Equity
  Item 6: [Reserved]
  Item 7: Management's Discussion and Analysis (MD&A)
  Item 8: Financial Statements and Supplementary Data
    Balance Sheet
    Income Statement
    Cash Flow Statement
    Statement of Stockholders' Equity
    Notes to Financial Statements
  Item 9: Changes in and Disagreements with Accountants
Part III
  Item 10-14: Directors, Executive Compensation, etc.
Part IV
  Item 15: Exhibits and Financial Statement Schedules
Signatures
```

Key conventions:
- MD&A must discuss results of operations, liquidity, capital resources, and known trends
- Year-over-year and sequential comparisons are expected for all material line items
- Non-GAAP measures must be reconciled to the nearest GAAP measure
- Risk factors must be specific to the company, not boilerplate
- XBRL tagging is required for financial statements and certain MD&A elements

### Quarterly Earnings Report

```
Press Release Header (date, company, ticker)
Financial Highlights (bullet points)
Management Commentary
Financial Tables
  Income Statement (GAAP)
  Non-GAAP Reconciliation
  Balance Sheet
  Cash Flow Summary
  Segment Reporting
Forward-Looking Statements Disclaimer
Contact Information
```

### Budget Justification

```
Executive Summary
Revenue Projections
  By Product/Service Line
  By Geography/Segment
Expense Categories
  Personnel
  Operations
  Capital Expenditures
  Contingency
Assumptions and Methodology
Sensitivity Analysis
Approval Chain
```

### Audit Report

```
Independent Auditor's Report
  Opinion
  Basis for Opinion
  Key Audit Matters
  Responsibilities of Management
  Auditor's Responsibilities
Financial Statements (audited)
Notes to Financial Statements
Supplementary Information
```

## Data Verification Gates for Financial Documents

### GAAP Compliance

Financial statements must comply with Generally Accepted Accounting Principles (or IFRS where applicable).

1. **Revenue recognition** -- Verify revenue is recognized per ASC 606 (identify contract, identify performance obligations, determine transaction price, allocate, recognize when satisfied)
2. **Expense classification** -- Operating vs non-operating, recurring vs non-recurring. Verify consistency across periods
3. **Balance sheet equation** -- Assets = Liabilities + Equity. Verify this holds for every reported period
4. **Cash flow reconciliation** -- Net income + adjustments = cash from operations. Verify the reconciliation ties out
5. **Intercompany eliminations** -- In consolidated statements, verify intercompany transactions are eliminated

### Formula Integrity

Financial documents are dense with derived values. Every formula must be verified.

**Common financial formulas to verify:**

| Metric | Formula | Common Error |
|--------|---------|--------------|
| Gross margin | (Revenue - COGS) / Revenue | Using net revenue vs gross revenue inconsistently |
| EBITDA | Net income + Interest + Taxes + D&A | Missing or double-counting adjustments |
| Year-over-year change | (Current - Prior) / Prior * 100 | Wrong base period, mixing fiscal and calendar years |
| EPS (basic) | Net income / Weighted avg shares | Using end-of-period shares instead of weighted average |
| Debt-to-equity | Total debt / Total equity | Including or excluding operating leases inconsistently |
| Free cash flow | Operating cash flow - CapEx | Using different CapEx definitions across sections |
| Working capital | Current assets - Current liabilities | Reclassifying items between current and non-current |

**Verification gate:**
- Extract every calculated metric from the document
- Verify each against source financial data (trial balance, general ledger, or audited statements)
- Confirm the formula used matches the stated methodology
- Check that the same formula is used consistently throughout the document

### Reconciliation

Every financial value should trace back to a source of truth.

```
Audited financial statements
  └── MD&A discussion references these numbers
       └── Earnings release summarizes these numbers
            └── Investor presentation visualizes these numbers
                 └── Budget projections use these as baseline
```

**Verification gate:**
- For each financial value in the document, identify its source (which statement, which line item, which period)
- Verify the value matches the source exactly
- If the document presents a non-GAAP measure, verify the reconciliation to GAAP
- Check that period labels are correct (Q3 2025 means July-September, not October-December)

### Audit Trail

Financial documents require a clear provenance chain.

- Every number should be traceable to a source document
- Adjustments should be labeled with the reason and approval
- Reclassifications should be documented with before-and-after entries
- Pro forma adjustments should be clearly identified and separated from GAAP results

## Value Presentation Conventions

- Currency: Use consistent formatting with thousand separators and two decimal places for financial statements: "$1,234,567.89". For narrative text, round appropriately: "$1.2 million" or "$1.2B"
- Negative values: Use parentheses, not minus signs, in financial tables: `(1,234)` not `-1,234`
- Percentages: One decimal place for rates and margins: "23.4%". Integers for year-over-year changes when the precision isn't meaningful: "12% increase"
- Per-share values: Two decimal places: "$3.47 per diluted share"
- Basis points: Use "bps" or "basis points" for small rate changes: "25 basis points" or "25 bps"
- Periods: Always specify: "for the three months ended September 30, 2025" or "as of December 31, 2025"
- Millions/billions: Be consistent. If using "M" for millions, don't also spell out "million" in the same document. "$" prefix with "M" or "B" suffix: "$42.3M"
- Tables: Right-align numbers, left-align labels. Include totals and subtotals with rules (lines) separating them

## Common Financial Writing Pitfalls

| Pitfall | Example | Fix |
|---------|---------|-----|
| Period mismatch | Comparing Q3 revenue to full-year prior period | Ensure apples-to-apples: Q3 vs Q3, FY vs FY |
| Non-GAAP without reconciliation | "Adjusted EBITDA was $50M" with no GAAP bridge | Always include the reconciliation table |
| Stale baseline | YoY growth calculated from restated prior-year numbers in one section, original numbers in another | Use the same baseline (usually restated) consistently |
| Rounding errors in totals | Line items round to $12.3M + $8.4M + $5.1M = $25.8M but stated total is $25.9M | Verify totals independently; note rounding in footnotes if needed |
| Mixing fiscal and calendar | "In 2025, revenue was..." when the fiscal year ends in June | Specify: "For fiscal year 2025 (ended June 30, 2025)" |
| Forward-looking without disclaimer | "We expect revenue to grow 15% next year" in MD&A | Include safe harbor language; label projections clearly |
| Inconsistent segment reporting | Using different segment definitions in the 10-K vs earnings call | Use the same segment structure across all filings |
| Missing materiality threshold | Reporting a $50K adjustment in a $5B company as significant | Apply materiality standards consistently |

## Compliance Checklists

### SEC Filing (10-K / 10-Q)

- [ ] Balance sheet equation balances for all periods
- [ ] Cash flow statement reconciles to balance sheet cash change
- [ ] Revenue recognition complies with ASC 606
- [ ] Non-GAAP measures are reconciled to nearest GAAP measure
- [ ] Non-GAAP measures are not given greater prominence than GAAP measures
- [ ] MD&A discusses all material changes in financial condition and results
- [ ] Risk factors are company-specific, not generic boilerplate
- [ ] All periods presented use consistent accounting policies (or changes are disclosed)
- [ ] Related party transactions are disclosed
- [ ] Subsequent events are disclosed through the filing date
- [ ] XBRL tags are correct and complete
- [ ] Signatures page includes all required signatories
- [ ] Officer certifications (SOX 302/906) are attached
- [ ] Exhibit index is complete and all referenced exhibits are filed

### Budget / Forecast

- [ ] Revenue projections are supported by stated assumptions
- [ ] Expense categories are complete and don't overlap
- [ ] Personnel costs account for headcount changes, merit increases, and benefits
- [ ] Capital expenditure estimates are based on vendor quotes or historical rates
- [ ] Contingency reserve is stated and justified
- [ ] Sensitivity analysis covers key variables (volume, price, exchange rates)
- [ ] All calculations are independently verifiable
- [ ] Prior period actuals used as baseline match audited figures
- [ ] Inflation assumptions are stated and sourced
- [ ] Foreign currency assumptions are stated with source and date

### Audit Report

- [ ] Opinion type matches the findings (unqualified, qualified, adverse, disclaimer)
- [ ] Key audit matters are described with sufficient specificity
- [ ] Management's responsibility section is accurate for the entity type
- [ ] Auditor's responsibility section complies with applicable auditing standards
- [ ] Financial statements referenced in the opinion match those attached
- [ ] Date of the report is the date fieldwork was substantially completed
- [ ] Going concern assessment is documented if applicable
