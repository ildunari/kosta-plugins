# Engineering Writing -- Domain-Specific Gates and Conventions

## Document Types and Their Structures

### Requirements Specification

```
1. Introduction
   1.1 Purpose
   1.2 Scope
   1.3 Definitions, Acronyms, Abbreviations
   1.4 References
2. Overall Description
   2.1 Product Perspective
   2.2 Product Functions
   2.3 User Characteristics
   2.4 Constraints
   2.5 Assumptions and Dependencies
3. Specific Requirements
   3.1 Functional Requirements
     REQ-XXX: [Requirement Statement]
       Rationale:
       Verification Method:
       Trace to:
   3.2 Non-Functional Requirements
     3.2.1 Performance
     3.2.2 Safety
     3.2.3 Reliability
     3.2.4 Environmental
4. Appendices
   4.1 Requirements Traceability Matrix
```

Key conventions:
- Every requirement has a unique ID (REQ-001, REQ-002, ...)
- Requirements use "shall" for mandatory, "should" for desired, "may" for optional
- Each requirement must be testable -- if you can't write a test for it, rewrite it
- Traceability matrix links requirements to design elements, test cases, and verification evidence

### Design Review Document

```
Cover Page (Project, Phase, Date, Attendees)
1. Design Overview
   1.1 System Architecture
   1.2 Design Constraints
   1.3 Design Decisions and Rationale
2. Detailed Design
   2.1 Component/Subsystem Descriptions
   2.2 Interface Definitions
   2.3 Algorithms and Logic
3. Analysis Results
   3.1 Structural Analysis
   3.2 Thermal Analysis
   3.3 Trade Studies
4. Compliance Matrix
5. Risk Assessment
6. Action Items from Review
Appendices (Drawings, Simulations)
```

### Test Report

```
1. Test Identification
   1.1 Test Title and ID
   1.2 Test Date and Location
   1.3 Test Article Description
   1.4 Test Personnel
2. Test Objectives
3. Test Setup
   3.1 Equipment List (with calibration status)
   3.2 Test Configuration
   3.3 Environmental Conditions
4. Test Procedure Summary
5. Test Results
   5.1 Data Tables
   5.2 Analysis
   5.3 Pass/Fail Determination
6. Anomalies and Observations
7. Conclusions
8. Appendices (Raw Data, Photographs)
```

### Safety Analysis (FMEA / FTA)

```
1. Scope and System Description
2. Methodology (FMEA, FTA, HAZOP, etc.)
3. Assumptions
4. Analysis
   For FMEA: Failure Mode | Effect | Severity | Cause | Occurrence | Detection | RPN
   For FTA: Fault Tree Diagrams with probabilities
5. Risk Assessment
6. Mitigation Measures
7. Residual Risk
8. Conclusions
```

## Data Verification Gates for Engineering Documents

### Requirements Traceability

The most fundamental engineering verification: every requirement must trace from its origin through design, implementation, and test.

**Forward traceability (origin to verification):**
1. Every system requirement traces to at least one design element
2. Every design element traces to at least one test case
3. Every test case has a test result (pass/fail/not-yet-tested)

**Backward traceability (verification to origin):**
1. Every test case traces to at least one requirement
2. Every design element traces to at least one requirement
3. No orphan tests (tests that don't verify any requirement)
4. No orphan design elements (designs that don't satisfy any requirement)

**Verification gate:**
- Extract all requirement IDs from the specification
- Extract all test case IDs from the test plan
- Verify bidirectional mapping: every REQ has at least one TEST, every TEST has at least one REQ
- Flag any gaps: untested requirements, orphan tests, or requirements without design coverage
- Verify that requirement text hasn't changed since the test was written (stale test risk)

### Units Consistency

Unit errors have caused catastrophic failures (Mars Climate Orbiter, 1999). Every value must carry its unit explicitly.

**Verification gate:**
1. Extract every numeric value with its unit from the document
2. Check that all values of the same type use the same unit system (don't mix metric and imperial)
3. Verify unit conversions are correct wherever they appear
4. Check that interface specifications use consistent units on both sides
5. Verify that equations are dimensionally consistent (units balance on both sides)

**Common unit pitfalls:**
| Pitfall | Example | Fix |
|---------|---------|-----|
| Mixed systems | "Force: 100 N" in one section, "Force: 22.5 lbf" in another | Standardize on one system; provide conversions in parentheses if needed |
| Missing units | "Temperature: 350" | Always include units: "Temperature: 350 degF" or "Temperature: 177 degC" |
| Ambiguous pressure | "Pressure: 14.7 psi" (absolute or gauge?) | Specify: "14.7 psia" or "14.7 psig" |
| Rate vs total | "Flow: 100 gallons" | Distinguish: "100 gallons total" vs "100 gallons per minute (gpm)" |

### Tolerance Notation

Engineering dimensions and specifications require explicit tolerances.

**Standard notation:**
- Bilateral: `25.00 +/- 0.05 mm`
- Unilateral: `25.00 +0.10/-0.00 mm`
- Limit: `24.95 - 25.05 mm`
- GD&T: Per ASME Y14.5 (feature control frames)

**Verification gate:**
1. Every critical dimension has an explicit tolerance
2. Tolerance stack-ups are calculated and documented for assemblies
3. Tolerances are achievable with the specified manufacturing process
4. Interface tolerances are compatible (mating part tolerances don't result in interference or excessive clearance)

### Standards Compliance

Engineering documents frequently reference standards (ISO, ASME, IEEE, MIL-STD, SAE, etc.).

**Verification gate:**
1. Every referenced standard is cited with its full designation and year: "ISO 9001:2015" not just "ISO 9001"
2. The referenced revision is current (or the use of an older revision is justified)
3. The document actually complies with the sections of the standard it claims to follow
4. All "shall" clauses from referenced standards are addressed in the compliance matrix
5. Test methods reference specific standard test procedures where applicable

## Value Presentation Conventions

- Dimensions: Include units and tolerances: `25.00 +/- 0.05 mm`
- Temperatures: Specify scale: `350 degF (177 degC)`
- Pressures: Specify absolute or gauge: `101.325 kPa (absolute)` or `0 psig`
- Forces/loads: Include direction and application point when relevant
- Materials: Include grade/alloy designation: `AISI 316L stainless steel` not just "stainless steel"
- Factors of safety: State the value, the applied load, and the allowable: `FoS = 2.5 (applied: 10 kN, allowable: 25 kN)`
- Test results: Include measurement uncertainty: `Tensile strength: 520 +/- 15 MPa`
- Revision marks: Use revision triangles or clouds per organizational standards
- Drawing references: Include drawing number, revision, and sheet: `DWG-1234 Rev C, Sheet 3 of 7`

## Common Engineering Writing Pitfalls

| Pitfall | Example | Fix |
|---------|---------|-----|
| Untestable requirement | "The system shall be user-friendly" | "The system shall complete [task] in fewer than 3 operator actions" |
| Ambiguous tolerance | "approximately 25 mm" | "25.0 +/- 0.5 mm" |
| Missing verification method | REQ-042 with no test case or analysis reference | Every requirement must specify: test, analysis, inspection, or demonstration |
| Stale revision reference | "Per ISO 9001:2008" when the current version is 2015 | Verify all standard references are current |
| Interface mismatch | System A outputs 5V signal, System B expects 3.3V input | Review interface control documents for compatibility |
| Tolerance stack-up ignored | Five parts each at +/- 0.1 mm but assembly tolerance assumed to be +/- 0.1 mm | Calculate worst-case and statistical stack-ups |
| Test without calibration record | Test report using equipment last calibrated 2 years ago | All test equipment must have current calibration certificates |
| Design without load case | "The bracket shall support the antenna" without specifying loads | Define all load cases: static, dynamic, thermal, vibration |

## Compliance Checklists

### Requirements Specification

- [ ] Every requirement has a unique, persistent ID
- [ ] Every requirement uses "shall" for mandatory, "should" for desired, "may" for optional
- [ ] Every requirement is verifiable (testable, analyzable, inspectable, or demonstrable)
- [ ] No compound requirements (each requirement states one thing)
- [ ] Traceability matrix covers all requirements
- [ ] All acronyms and abbreviations are defined
- [ ] All referenced standards are cited with full designation and year
- [ ] No TBD/TBR items remain in the final version (or they are tracked with resolution dates)

### Design Review

- [ ] All requirements are addressed in the design (forward traceability)
- [ ] Design rationale is documented for key decisions
- [ ] Interface definitions are complete and compatible
- [ ] Analysis results support the design (loads, thermal, etc.)
- [ ] Materials and processes are specified
- [ ] Risk assessment identifies and mitigates key risks
- [ ] Action items from previous reviews are closed or tracked
- [ ] Configuration is controlled (document number, revision, date)

### Test Report

- [ ] Test procedure followed the approved test plan
- [ ] All test equipment has current calibration certificates
- [ ] Environmental conditions during test are recorded
- [ ] Raw data is preserved and accessible
- [ ] Pass/fail criteria match the requirement being verified
- [ ] All anomalies are documented with disposition
- [ ] Test coverage is complete (all planned tests executed or deviations justified)
- [ ] Results are traceable to specific requirement IDs

### Safety Analysis

- [ ] All credible failure modes are identified
- [ ] Severity ratings use the defined scale consistently
- [ ] Occurrence ratings are based on data or justified engineering judgment
- [ ] All high-RPN items have mitigation measures
- [ ] Residual risk after mitigation is documented
- [ ] Assumptions are stated and reasonable
- [ ] Analysis methodology is identified (FMEA, FTA, HAZOP, etc.)
- [ ] Interface failures between subsystems are considered
