---
name: verification-forge-loop
description: >
  Core orchestration loop for the verification-forge plugin. Orchestrate phased
  document editing, data analysis, and knowledge work using sub-agents for
  research, drafting, verification, and review — with integrity gates between
  phases. Use whenever the task involves multi-phase document restructuring,
  data-driven content editing, grant or manuscript revision, spreadsheet
  analysis with narrative output, cross-document consistency work, or any
  productivity task where claims must be verified against source data and
  changes must be auditable. Triggers on: multi-section document edits,
  "restructure this grant/paper/report," "update these numbers throughout,"
  "verify these claims against the data," "consolidate scattered content,"
  "rewrite this section with new data," tracked-change workflows, or any
  productivity task requiring phased implementation with quality gates.
  Supersedes ad-hoc document editing when the work spans multiple sections,
  involves data verification, or requires review before finalizing.
---

# Agentic Loop — Productivity

Orchestrate phased productivity work using sub-agents for research, drafting, verification, and review — with integrity gates between phases. The orchestrator delegates, coordinates, verifies, and fixes. Sub-agents execute focused tasks and report back with evidence.

This skill exists because productivity work — grants, manuscripts, reports, spreadsheets, lab documentation — has a verification problem that code doesn't. Code has compilers, test suites, and debuggers. Documents have nothing. A wrong number in a grant, a lost citation, a stale claim repeated in three sections — these failures are invisible until a reviewer catches them. The agentic loop compensates by building verification into every phase: no content is written without verified source data, no edit is accepted without a post-apply integrity check, and no phase is complete without independent review.

## Feedback Loop

**Read `FEEDBACK.md` before every use** to apply lessons from prior sessions. After completing a task, note anything that didn't work well and log it in `FEEDBACK.md` with a date, category tag, and one actionable observation.

## Reference Loading Protocol

Load reference files only when their content is needed, not at the start of the session.

| Reference file | When to load |
|----------------|-------------|
| `FEEDBACK.md` | Before every use — always |
| `references/subagent-orchestration.md` | Before the first sub-agent dispatch in a session |
| `references/review-dimensions.md` | Before the Dual Review step (step 7) — read only the section for the current domain plus Language Review |
| `references/tool-patterns.md` | When a tool operation fails or behaves unexpectedly |
| `references/tool-inventory.md` | During the "Before Starting" inventory step, only if the user hasn't specified their tools |
| `references/scientific-writing.md` | When the domain is scientific writing (grants, papers, abstracts) |
| Other domain references | When the domain matches (see Domain Routing) |

Work from this file (SKILL.md) alone until a specific step requires reference material.

## When to Use This Skill

Use this skill when the task has **three or more** of these characteristics:
- Multiple sections or paragraphs need coordinated changes
- Claims or values must be verified against canonical data sources
- Content is being moved, consolidated, or restructured (not just edited in place)
- Track changes, audit trails, or change documentation are needed
- The work touches a compliance-sensitive document (grants, manuscripts, legal, regulatory)
- Cross-document consistency matters (same numbers in multiple files)
- The user wants independent review of accuracy, tone, or compliance before finalizing

For single-paragraph edits, simple formatting, or tasks without data verification needs, just do the work directly — this skill adds overhead that isn't justified for small tasks.

## Model Routing

The verification-forge plugin routes sub-agent work to the appropriate model tier based on the cognitive demands of the task:

**Opus** — for tasks requiring deep analytical reasoning, source-level verification, and domain expertise:
- Source verification sub-agents (step 2) — cross-referencing values across files, resolving discrepancies
- Derived calculation verification — independent recomputation of fold-changes, ratios, percentages
- Domain review agents (step 7) — accuracy, compliance, and domain-convention checking

**Sonnet** — for tasks requiring fluent generation, pattern matching, and style-focused evaluation:
- Research sub-agents (step 1) — broad document reading, inventory building, extraction
- Drafting sub-agents (step 4) — prose generation with verified values and citation maps
- Style/language review agents (step 7) — AI-telltale detection, tone consistency, naturalness scoring

When dispatching sub-agents, annotate the model tier in the prompt contract so the routing layer can assign the correct model. If model routing is not available in the current environment, all sub-agents default to the orchestrator's model.

## Before Starting

If the task scope is unclear, interview the user:

> "I can start, but I'll produce better results with more context. Can I ask a few questions about the document, the data sources, and what 'done' looks like?"

Gather:
1. **What document(s)?** File paths, format (Word, Excel, PDF, LaTeX, etc.)
2. **What data sources?** Where do the canonical values live? Which file is the source of truth?
3. **What needs to change?** Sections, values, structure, tone, compliance requirements
4. **What are the constraints?** Word limits, formatting requirements, domain conventions, who reviews this
5. **What tools are available?** Check what document editing tools are accessible (MCP servers, CLI tools, Python libraries). Note gaps — you may need to suggest tools the user should install.

If the user already provided detailed context (prior conversation, attached files, existing plan), extract answers from what's available and confirm before proceeding.

## Core Loop

```
Research → Source Verify → [Structure Plan] → Draft → Apply Gate → Integrity Gate → Dual Review → Fix → Save + Document
                                                         │                                          │
                                                         └─── fail: diagnose & retry ◄──────────────┘
```

Each step in detail:

### 1. Research

Read the document, the data sources, and any reference materials. Build a complete picture of:
- Current document structure (sections, headings, paragraph indices or locations)
- Current values and claims in the document
- Canonical source data (reference tables, datasets, calculations)
- Citations and their locations
- What needs to change and where

Dispatch an Explore sub-agent for broad research when the document is large or unfamiliar. For focused tasks where you already have context, do this inline.

**Output:** A structured inventory — what exists, what's wrong, what's missing, what the canonical values are.

### 2. Source Verify

Before writing any content, verify every value you plan to use. Source verification runs before every drafting step when the content references data values, calculations, or quantitative claims.

Dispatch a verification sub-agent to:
- Read every canonical source file
- Extract every value that will appear in the new text
- Cross-check values between source files (do they agree?)
- Flag any discrepancies, high-variance data points, or values that depend on calculation method
- Produce a **Claim Ledger** (see below)

The orchestrator reviews the Claim Ledger before proceeding to drafting. If any value is uncertain, ambiguous, or inconsistent between sources, resolve it now — not during drafting.

This step also runs after implementation as a review gate (see Integrity Gate below). Source verification bookends the process.

#### Claim Ledger

Every phase that touches factual content must produce or update a **Claim Ledger** — a persistent artifact that tracks each quantitative or verifiable statement from source to final text. The ledger prevents value drift across phases, makes the workflow resumable after interruption, and catches the subtle errors that survive spot-checking (transposed digits, stale values, silent unit changes).

**Standard Schema** (moderate-stakes, <10 claims):

| Field | Description |
|---|---|
| Claim ID | Unique identifier (e.g., `C-01`) |
| Claim Text | Statement as it appears in the draft |
| Raw Value | Original value from source |
| Display Value | Value as rendered in output (with rounding, units) |
| Source File | File path or document name |
| Source Location | Page, table, figure, or cell reference |
| Citation(s) | Formal citation(s) supporting the claim |
| Verification Status | `verified` / `flagged` / `pending` |

**Extended Schema** (high-stakes quantitative, >10 claims, or compliance-sensitive) adds:

| Field | Description |
|---|---|
| Unit | Measurement unit for the value |
| Condition / Timepoint | Experimental context (e.g., "A(+/+), 96h cumulative") |
| Formula / Transform | How the display value was derived from raw |
| Rounding Rule | Rule applied (e.g., "nearest 0.1M") |
| Claim Type | `direct` / `derived` / `inferential` / `editorial` |
| Dependent Locations | Other documents or sections that reference this claim |
| Notes | Discrepancies, caveats, reviewer flags |

**Rules:**
- Downstream steps reference Claim IDs, not free-floating numbers, when discussing values.
- The Integrity Gate verifies every Claim ID touched during the phase before sign-off.
- Save + Document stores the updated ledger alongside the document.

#### Derived Calculations

Derived values — fold-changes, percentages, ratios, normalized metrics, unit conversions, rankings — are the most likely site of sophisticated hallucination. They sound analytically credible, so neither the writer nor the reviewer tends to question them. The ledger must make every derivation auditable.

For each derived claim, record:

| Field | Description |
|---|---|
| Formula Used | Exact operation (e.g., `A(+/+) ÷ B(+/-)`) |
| Raw Inputs | Values and their Claim IDs (e.g., `C-03`, `C-04`) |
| Computed Result | Unrounded output of the formula |
| Display Value | Final value shown in text |
| Rounding Rule | Rule applied to reach display value |

**Rules:**
- At **Tier 1**, the orchestrator independently recomputes the 3-5 most critical derived values as a sanity check.
- At **Tier 2 and Tier 3**, the orchestrator independently recomputes or directly confirms from the source file **every derived value** that will appear in changed text. No exceptions — this is where the most dangerous hallucinations survive.
- No derived quantitative claim may appear in text unless it has a corresponding calculation row in the ledger.
- If the source file already states the derived number, record it as claim type `source-stated` and log the source location — direct source confirmation counts as verification without recomputation.

#### Verification Tiers

| Tier | Scope | When to Use |
|---|---|---|
| **Tier 1 — Exploratory** | Spot-check 3-5 representative values | Discovery, research inventory, or internal notes that will not appear directly in any output |
| **Tier 2 — Standard** | Verify **100%** of claims in changed text | Single-section quantitative edits with fewer than 10 claims |
| **Tier 3 — High-Stakes** | Verify **100%** of changed claims **+** run a dependency sweep across all declared files | Multi-section edits, >10 claims, compliance-sensitive content, or cross-document work |

**Rules:**
- If a phase changes any quantitative claim in a final document, Tier 2 is the minimum.
- Tier 1 is reserved for discovery work whose output feeds further analysis, not the deliverable itself.
- The orchestrator declares the tier at phase start; the Integrity Gate confirms the declared tier was actually executed.

### 3. Structure Plan (Conditional)

*Required when a phase involves moving, merging, splitting, or consolidating content across sections.*

Before any Draft step, produce a Structure Plan:

| Current location | Target location | Action | Dependencies | Rationale |
|---|---|---|---|---|
| Section / paragraph ref | Section / paragraph ref | keep / move / split / delete / rewrite | Citations, figures, comments affected | Why this move serves the phase goal |

**Rule:** The Draft step cannot begin until the orchestrator reviews and approves the Structure Plan. This is the productivity equivalent of "test before code" — it forces structural decisions before prose work starts, preventing costly mid-draft reorganizations.

### 4. Draft

Dispatch a drafting sub-agent with:
- The specific text to write or rewrite
- The Claim Ledger (from step 2) — the sub-agent uses the verified values exactly as provided, without rounding, recalculating, or substituting from memory
- Context about tone, style, domain conventions, and what the surrounding text sounds like
- Citations to include and where they belong
- Explicit scope: what to keep, what to remove, what to preserve verbatim

The sub-agent returns the drafted text. The orchestrator reviews it against the Claim Ledger before applying.

**Sub-agent prompt contract for drafting** (include all of these):
1. **Task** — one sentence: what to write
2. **Claim Ledger** — the exact values to use, with Claim IDs and sources
3. **Context** — surrounding paragraphs, document tone, domain conventions
4. **Style constraints** — match existing voice; use plain vocabulary, vary sentence openings, lead with subjects rather than transition words
5. **Citation map** — which citations go where
6. **Scope** — what to preserve verbatim, what is open for rewriting

See `references/subagent-orchestration.md` for detailed prompt contracts and examples.

### 5. Apply Gate

Apply the drafted content to the document using available tools. After applying:
- Confirm the operation succeeded without errors
- Re-read the affected section to verify the content is what you intended
- Check for tool-specific side effects (formatting loss, index shifts, encoding issues)

If the tool operation fails or produces unexpected results, diagnose before retrying. Load `references/tool-patterns.md` for known issues and workarounds.

**General principles for tool operations:**
- Re-read after every write — confirm the result matches your intent
- When editing sequences of items (paragraphs, rows, cells), account for index shifts after insertions or deletions
- When replacing content, verify that surrounding content was not affected
- Preserve existing formatting unless the task explicitly requires formatting changes
- If track changes are required, enable them before making content changes
- Create backups or save intermediate versions before destructive operations

### 6. Integrity Gate

After applying changes, run an integrity check. This is the productivity equivalent of "run the tests."

**For document editing:**
- Search for any old/stale values that should have been replaced — they should be gone
- Verify all new values match the Claim Ledger from step 2
- Check citation integrity:
  - Are all citations still present and in the right context?
  - Does each citation still support the claim it's attached to?
  - For numbered citation systems: do numbers still resolve correctly?
- Verify structural integrity — no accidental deletions, no duplicate content, headings intact
- Cross-reference with dependent files — if the same value appears elsewhere, is it consistent?
- Confirm the Verification Tier declared at phase start was actually executed

**For spreadsheet work:**
- Verify formulas produce expected results
- Check that source references are intact
- Confirm calculated values match independent verification

**For any domain:**
- Read the changed content fresh and compare against the plan
- If the phase involved multiple sub-operations, verify the cumulative result, not just each individual step
- Check all Claim IDs touched in the phase — every one should show status `verified` in the ledger

Dispatch a verification sub-agent for thorough checks. The sub-agent should have access to the source files and the document, and should report: what it checked, what passed, what failed, and exact quotes of any issues.

**Scripts (optional accelerators):** If `scripts/` is available, the following automate common integrity checks:
- `scripts/stale_value_finder.py` — searches multiple files for deprecated values
- `scripts/citation_integrity_check.py` — diffs citations between document versions
- `scripts/cross_doc_consistency_checker.py` — compares metrics across documents
- `scripts/doc_structure_audit.py` — validates heading hierarchy and section completeness

### 7. Dual Review

Two independent reviews, run in parallel when possible. Load `references/review-dimensions.md` before this step — read only the section for the current domain plus the Language Review section.

> **Plugin note:** In the verification-forge plugin, this step dispatches to the **reviewer-gate** skill, which manages 13 independent reviewer agents across domain accuracy, language quality, citation integrity, structural compliance, and more. See `reviewer-gate/SKILL.md` for the full reviewer roster, dispatch protocol, severity calibration, and finding consolidation logic. The dimensions below remain the baseline checklist; the reviewer-gate expands each into a dedicated agent with its own prompt contract and evidence requirements.

**Domain Review** — checks accuracy and compliance:
- Are all claims correct per the source data?
- Does the structure follow domain conventions? (R01 format for grants, IMRAD for papers, etc.)
- Are variance caveats, sample sizes, and limitations properly noted?
- Are citations in the right context and supporting the claims they're attached to?
- Would a domain expert find any claim unsupported or overclaimed?
- For any P0/P1 quantitative finding, the reviewer must cite the exact source location

**Language Review** — checks tone and naturalness:
- Does the text read like a human professional wrote it?
- Are there AI-telltale patterns? (excessive hedging, parallel structures, transition-word stacking, unnaturally perfect grammar, listy prose)
- Is the tone consistent with the rest of the document?
- Rate naturalness on a 1-5 scale per paragraph
- Flag specific sentences that need humanizing

**Sub-agent prompt contract for reviewers** (include all of these):
1. **Task** — "Review this [section] for [accuracy/language]"
2. **Source files** — paths to canonical data for fact-checking
3. **Original text** — what it looked like before (for comparison)
4. **Edited text** — what it looks like now
5. **Domain context** — what kind of document, who reads it, what conventions apply
6. **Severity system** — P0 (blocks finalization), P1 (should fix), P2 (nice to fix), P3 (noted)

### 8. Fix

The orchestrator reads both review reports and fixes P0 and P1 issues directly. Do not delegate fixes — the orchestrator has seen both reviews and has the full context.

After fixing, loop back to the Apply Gate (step 5) to verify fixes didn't introduce new problems.

P2 items are fixed if the effort is trivial. P3 items are noted for the user but not fixed unless requested.

**If a fix can't be applied programmatically** (e.g., requires GUI interaction, or the tool doesn't support the operation):
1. Document the problem: what it is, where it is, why the tool can't handle it
2. Document attempted solutions and why they failed
3. Provide the user with exact manual steps to fix it
4. Continue with the remaining phases — don't block on one unfixable item

### 9. Save + Document

Once all gates pass and reviews are clean:
1. **Save** the document
2. **Update the change log** — what changed, where, why, verified against what source
3. **Update comments** in the document — add summary comments to changed sections, resolve completed review comments
4. **Store the Claim Ledger** — save alongside the document with status updates
5. **Update task tracking** — mark completed items, add new items discovered during the work
6. **Produce a Phase Reconciliation Report** — a compact closing artifact confirming the phase is complete:
   - Phase name and risk tier
   - Changed Claim IDs (or "inline tracking" for compact path)
   - Derived claims recomputed: count and method (independent calc / source-confirmed)
   - Stale-value sweep result: clean / N unresolved (with locations)
   - Citation integrity result: clean / N issues (with details)
   - Dependent files swept: list with clean/flagged status
   - Unresolved issues: 0 or explicit list with severity
   - This report turns "I think we're done" into an auditable exit condition.
7. **Report to the user** — what was done, current state, remaining items, any manual steps needed

## Phase Declaration

Before starting any phase, declare:

```
Phase: [name]
Goal: [one sentence]
Scope: [sections / paragraphs / cells / files]
Estimated size: [small (1-3 items) / medium (4-10) / large (11+) — split large]
Risk tier: [exploratory / standard / high-stakes]
Target structure: [outline or movement map, if restructuring]
Source data: [canonical files to verify against]
Source precedence: [which file wins if sources disagree]
Claim ledger: [path or "new"]
Derived calculations: [list or "none"]
Stale-claim search scope: [which docs/sections to sweep]
Dependent files: [other documents that may contain the same claims]
Checkpoint: [backup path before destructive operations]
Domain reviewer: [scientific / legal / financial / general]
Language reviewer: [tone target — match existing, formal, accessible]
Outputs: [tracked doc / clean doc / change log / ledger update]
Page/word budget: [limit, if applicable]
```

Phases estimated as **large** (11+ items) must be split into smaller phases before work begins. The Integrity Gate must sweep all files listed in **Dependent files**, not only the primary output document.

## Standard-Edit Fast Path

Not every edit needs the full 16-field phase declaration. For standard-risk work (a single section, fewer than 5 claims, no cross-document dependencies, no restructuring), use the compact declaration:

```
Phase: [name]
Goal: [one sentence]
Scope: [what to touch]
Source data: [canonical file(s)]
Risk tier: Standard
```

The compact path still requires Source Verify, Apply Gate, Integrity Gate, and Save + Document — it just uses lighter artifacts. Claim IDs are optional at this scale; the orchestrator tracks values inline. If the work grows beyond the compact scope (more claims appear, cross-document dependencies emerge, restructuring becomes necessary), upgrade to the full declaration immediately rather than patching the compact one.

## Red Flags — Stop

If any of the following are true, stop the current workflow and reassess before proceeding:

- Closing a phase while the claim ledger still contains unresolved conflicts
- Finalizing a document with derived calculations that have not been independently verified
- Skipping the Integrity Gate because "the draft looked fine"
- A sub-agent reports "all values verified" without providing per-value evidence
- More than 2 fix cycles on the same phase — scope is too large; split it
- A tool operation fails twice the same way — try a fundamentally different approach
- A citation was moved without confirming it still supports its new sentence
- Stale-value search returns unresolved hits in any dependent file
- The orchestrator is writing prose instead of delegating — you coordinate, sub-agents draft

## When to Use Sub-Agents vs Inline Work

**Use sub-agents when:**
- The task requires reading large amounts of source data (preserves orchestrator context)
- You need an independent perspective (verification, review)
- The task is well-defined and can be fully specified in a prompt
- Multiple independent tasks can run in parallel

**Work inline (as orchestrator) when:**
- The task is small (a single paragraph edit, one value replacement)
- You need to make decisions that depend on the full conversation context
- You're fixing issues identified by reviewers (you've seen both reports)
- The tool operations are simple and don't generate much output

**Orchestrator verification protocol:** When using sub-agents, follow the verification protocols in `references/subagent-orchestration.md`. The core principle: verify values a sub-agent reports by reading the source file directly — sub-agents can fabricate or misread values, so independent verification catches errors before they propagate.

**Context budget guidance:** The orchestrator typically runs with a large context window (~1M tokens) and can hold full session context. Sub-agents have smaller windows (200-400K tokens) and need focused, self-contained task packets. When dispatching sub-agents: include only the files and context needed for their specific task, prefer structured output formats that are quick to parse, and run independent tasks in parallel to save time.

## Error Recovery

When something goes wrong:

1. **Diagnose** — what exactly failed? Read the error, read the affected content, identify the root cause
2. **Document** — note the problem, the context, and your diagnosis
3. **Attempt fix** — try one alternative approach
4. **Verify fix** — confirm the fix worked by re-reading the result
5. **If fix fails** — try a second approach. If two different approaches fail on the same problem, document everything and escalate to the user with:
   - What the problem is
   - What you tried
   - Why it didn't work
   - Suggested manual steps
   - Whether this blocks the rest of the work or can be deferred

Three principles for error handling: (1) document every failed operation before moving on, (2) try a different approach rather than repeating the same one, and (3) read the result after every operation to confirm success.

## Context Window Management

Long editing sessions can exhaust the context window. To preserve state across a long session:

1. After completing each phase, write a brief phase summary to a tracking file (markdown in the working directory) recording: what was done, what was verified, what remains.
2. If the conversation approaches context limits, save the current state and suggest the user start a new conversation with the tracking file as input.
3. For multi-phase work, complete one phase fully (including verification and review) before starting the next. This ensures each phase is self-contained and can be resumed independently.
4. When dispatching sub-agents, prefer focused prompts that return structured reports — these are easier to parse than long narrative outputs.

## Domain Routing

Different domains need different gate criteria and review dimensions. Load the appropriate reference file based on the work type:

| Domain | Reference | Key gates |
|--------|-----------|-----------|
| Scientific writing (grants, papers) | `references/scientific-writing.md` | Data accuracy, citation integrity, methodology consistency, variance reporting |
| Legal (contracts, briefs, filings) | `references/legal-writing.md` | Defined terms consistency, obligation precision, Bluebook citations, privilege protection |
| Financial (10-K, budgets, audits) | `references/financial-writing.md` | GAAP compliance, formula integrity, reconciliation, audit trail, SEC formatting |
| Medical (protocols, CSRs, regulatory) | `references/medical-writing.md` | CONSORT/STROBE compliance, adverse event reporting, IRB alignment, HIPAA |
| Engineering (specs, test reports, safety) | `references/engineering-writing.md` | Requirements traceability, units consistency, tolerance notation, standards compliance |
| Policy (white papers, RIAs, legislation) | `references/policy-writing.md` | Source attribution, stakeholder framing, data provenance, public comment compliance |
| Education (curricula, rubrics, accreditation) | `references/education-writing.md` | Learning objectives alignment, Bloom's taxonomy, assessment validity, UDL accessibility |
| Journalism (investigations, fact-checks, data) | `references/journalism-writing.md` | Source verification (2+ independent), quote accuracy, defamation risk, correction protocols |

Other domains not listed above should apply the general verification and review principles from the Core Loop. The review dimensions in `references/review-dimensions.md` cover language quality for all domains. Use the **domain-router** skill to auto-detect and activate the appropriate domain. If you encounter a recurring domain not covered here, note it in FEEDBACK.md so a dedicated reference file can be created.

## Tool Awareness

This skill is tool-agnostic — it describes what operations to perform, not which specific tools to use. However, the orchestrator should:

1. **Inventory available tools** at the start of a session. What document editing capabilities exist? (MCP servers, CLI tools, Python libraries, built-in tools)
2. **Identify gaps** — if the task requires operations the available tools can't perform, tell the user what's missing and suggest options
3. **Follow general tool safety patterns** — load `references/tool-patterns.md` when a tool operation fails or behaves unexpectedly

See `references/tool-inventory.md` for a catalog of common productivity tools and when each is useful. Tool names and availability change over time — use the catalog as a starting point for discovery, not as a definitive list.

## Scripts (Optional Accelerators)

The `scripts/` directory contains Python scripts that automate common verification and integrity tasks. These are optional — the orchestrator can perform equivalent checks manually — but they are faster and more deterministic for repetitive auditing.

| Script | Purpose | Used in |
|--------|---------|---------|
| `scripts/claim_ledger.py` | Create, update, and verify claim ledgers from source files + documents | Source Verify, Integrity Gate |
| `scripts/stale_value_finder.py` | Search multiple files for deprecated values (exact + alternate forms) | Integrity Gate |
| `scripts/citation_integrity_check.py` | Diff citations between before/after document versions | After Apply Gate |
| `scripts/cross_doc_consistency_checker.py` | Compare metrics across multiple documents | Integrity Gate (multi-doc phases) |
| `scripts/doc_structure_audit.py` | Validate heading hierarchy, section completeness, word counts | Before Dual Review |

**Dependencies:** `python-docx`, `openpyxl`, `re`, `json`, `csv` (standard library). Scripts run standalone and accept file paths as arguments.

**If scripts are not available:** perform equivalent checks manually or via sub-agent. The scripts accelerate verification but are not required for the loop to function.

## Escalation Triggers

Escalate to the user when:
- A sub-agent returns values that don't match any source file (potential hallucination)
- The same value appears differently in two canonical source files (data conflict)
- A tool operation succeeds but the result doesn't match the input (tool bug)
- More than 2 fix cycles on the same issue (the approach isn't working)
- The document has changes from another editor that conflict with the planned work
- A compliance requirement can't be verified (missing reference, unclear standard)
- The user's instructions conflict with domain conventions (explain the conflict, let user decide)
