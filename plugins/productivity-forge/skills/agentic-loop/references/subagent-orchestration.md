# Sub-Agent Orchestration — Prompt Contracts and Verification Protocols

## Why This Matters

Sub-agents start with zero context. They don't know the document's history, the user's preferences, the conversation so far, or the full scope of the project. Every piece of information they need must be in the prompt. A missing detail means the sub-agent will guess — and guesses in data-driven content become hallucinations.

The orchestrator's job is to make sub-agent prompts so complete that the sub-agent can't get confused, and to verify sub-agent outputs so thoroughly that hallucinations can't slip through.

## The Prompt Contract

Every sub-agent dispatch includes these fields. Omitting any field degrades results.

### For Research / Exploration Sub-Agents

```
1. TASK — What to find (one sentence)
2. FILES — Exact paths to read
3. WHAT TO EXTRACT — Specific data points, structures, or patterns to look for
4. OUTPUT FORMAT — How to organize findings (tables, lists, categorized inventory)
5. BOUNDARIES — What NOT to do (don't make changes, don't summarize — report raw findings)
```

Example:
> "Read all 5 reference files listed below. For each coating (Mucin through PEG300k), extract the cumulative 96h transcytosis particle count for condition A(+/+), the internalization particle count for condition A(+/+), and the efficiency ratio. Present as a table with columns: Coating, Transcytosis Particles, Internalization Particles, Efficiency Ratio, Source File. Report only values explicitly stated in the files — do not calculate or infer."

### For Drafting Sub-Agents

```
1. TASK — What to write (one sentence)
2. VERIFIED VALUES — The exact numbers to use, with sources (paste the verification table)
3. CONTEXT — Surrounding paragraphs (paste them), document tone, domain conventions
4. STYLE CONSTRAINTS — Match existing voice, avoid specific AI patterns, target naturalness
5. CITATION MAP — Which citations go where, in exact bracket notation
6. BOUNDARIES — What NOT to change, what to preserve verbatim
7. SUCCESS CRITERION — The draft should be [X words], contain [these specific values], include [these citations]
```

Example:
> "Write a ~180-word paragraph for the Preliminary Studies section of an NIH R01 grant. Use ONLY these verified values: [paste table]. The paragraph should describe the transcytosis ranking across 8 coatings, highlight PEG200k as the top performer, present the B(+/-) paradox with specific fold-changes, and include a callout to Figure 1. Match the scientific tone of this surrounding text: [paste 2 adjacent paragraphs]. Include citations [14, 15] when referencing prior precoating work. Use plain, direct vocabulary — prefer 'examine' over 'delve,' 'landscape' over 'tapestry,' 'approach' over 'paradigm.' Vary sentence openings — lead with the subject, a dependent clause, or a specific finding rather than transition words."

### For Verification Sub-Agents

```
1. TASK — What to verify (one sentence)
2. DOCUMENT TEXT — The text to check (paste it or provide the file path)
3. REFERENCE FILES — Paths to canonical source data
4. CHECKLIST — Specific checks to perform (old values that should be gone, new values that should be present, citations that should exist)
5. OUTPUT FORMAT — For each check: what was checked, PASS/FAIL, exact quote if failed, recommendation
6. BOUNDARIES — Read-only. Do not suggest rewrites. Do not make changes. Report findings only.
```

### For Review Sub-Agents

```
1. TASK — "Review this [section] for [accuracy / language / compliance]"
2. ORIGINAL TEXT — What it looked like before changes (for comparison)
3. EDITED TEXT — What it looks like now
4. REFERENCE FILES — Source data for fact-checking (paths)
5. DOMAIN CONTEXT — Document type, audience, conventions
6. SEVERITY SYSTEM — P0 (blocks), P1 (should fix), P2 (nice to fix), P3 (noted)
7. REVIEW DIMENSIONS — Which checklist to follow (from review-dimensions.md)
8. OUTPUT FORMAT — Structured report with: findings by severity, exact quotes, specific fix recommendations
```

## Verification Protocols

### After Every Research Sub-Agent

The orchestrator reads the sub-agent's report and applies the declared Verification Tier (see SKILL.md):
- **Tier 1 (Exploratory):** Spot-check 3-5 values by reading the source file directly. If any fail, the entire report is suspect — re-read the source files yourself.
- **Tier 2 (Standard):** Verify 100% of values that will appear in changed text.
- **Tier 3 (High-Stakes):** Verify 100% of values + sweep all declared dependent files for propagated references.

### After Every Drafting Sub-Agent

The orchestrator:
1. Reads the draft
2. Checks every number against the verification table (not from memory — re-read the table)
3. Checks every citation is present and in the right context
4. Reads for tone: does it sound like the rest of the document?
5. Checks for AI telltales: transition stacking, excessive hedging, parallel structures
6. Only applies the draft after all checks pass

### After Every Apply Operation

The orchestrator:
1. Re-reads the affected section from the document (not from memory)
2. Confirms content matches what was intended
3. Searches for old values that should have been replaced
4. Checks surrounding content wasn't affected
5. Verifies structural integrity (headings, paragraph order, citation presence)

### After Every Verification Sub-Agent

The orchestrator:
1. Reads the verification report
2. For any FAIL finding, goes to the source and confirms the failure is real (not a false positive from the sub-agent misreading)
3. For PASS findings, applies tier-appropriate checking: Tier 1 spot-checks 2-3 PASS items; Tier 2-3 confirms all quantitative PASS items match the Claim Ledger
4. For any P0/P1 quantitative or citation finding, the reviewer must cite the exact source location — verdicts without evidence are not accepted

## What Sub-Agents Tend Not to Do Well

Be aware of these common sub-agent failure modes:

| Failure | Description | Mitigation |
|---------|-------------|------------|
| **Value fabrication** | Sub-agent reports a number that doesn't exist in the source file, or rounds differently than the source | Always verify values against the actual source file. Never trust a sub-agent's reported number without checking |
| **Incomplete extraction** | Sub-agent reads 3 of 5 conditions but misses 2 | Specify exactly how many items to expect: "There should be 8 coatings × 4 conditions = 32 rows" |
| **Context loss** | Sub-agent doesn't know the document's history or the user's preferences | Include relevant context in the prompt. Paste surrounding paragraphs. State the user's preferences explicitly |
| **Overclaiming on verification** | Sub-agent says "all values verified" but only checked a subset | Ask for explicit per-value reporting: "For each value, state: the claim, the source, whether it matches, the exact source value" |
| **Tone mismatch** | Sub-agent writes in a different voice than the existing document | Paste examples of the target tone. State specific patterns to avoid |
| **Citation confusion** | Sub-agent puts citation [14] next to a claim that [14] doesn't support | Provide a citation map: "[14, 15] = our precoating work. [18] = mucus barrier properties. [22] = internalization ≠ transcytosis" |

## Report Format Requirements

Sub-agent reports should be structured, not free-form. Specify the format in the prompt:

**For research reports:**
```
## Findings
| Item | Value | Source File | Location in File |
|------|-------|-------------|-----------------|
```

**For verification reports:**
```
## Verification Results
| Check | Expected | Found | Status | Quote |
|-------|----------|-------|--------|-------|
```

**For review reports:**
```
## Review — [Domain/Language]
### P0 (Critical)
- [Finding with exact quote and fix recommendation]
### P1 (Important)
- ...
### P2 (Medium)
- ...
### P3 (Minor)
- ...
### Summary
- Total findings: X (P0: _, P1: _, P2: _, P3: _)
- Overall assessment: [one sentence]
```

Structured reports are faster to read, harder to hallucinate (each cell must be filled), and easier to act on.
