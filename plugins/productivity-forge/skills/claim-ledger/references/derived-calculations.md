# Derived Calculations -- Verification Protocol

## Why Derived Values Are Dangerous

A direct value is either right or wrong -- you can check it against the source file in seconds. A derived value is different. It combines multiple inputs through a formula, and the result sounds analytically credible even when the formula is wrong, the inputs are stale, or the rounding obscures a significant error. Derived values are where sophisticated hallucination lives: a fold-change computed from the wrong denominator, a percentage calculated from last quarter's baseline, a ranking that silently changed when one data point was updated.

The Claim Ledger makes every derivation auditable by requiring explicit documentation of the formula, the inputs, the unrounded result, and the rounding rule.

## Formula Recording

Every derived claim must record its formula in a way that an unfamiliar reader can reproduce the calculation.

**Format:** Reference input values by their Claim IDs, not by their display values or raw numbers.

Good: `"C-01 / C-02"` -- unambiguous, traceable
Bad: `"41.4M / 18.1M"` -- uses rounded display values, which introduces rounding-on-rounding error
Bad: `"transport / baseline"` -- ambiguous, which transport? which baseline?

**Complex formulas:** For multi-step calculations, show each step.

```
Step 1: C-05 - C-06 = intermediate_1
Step 2: intermediate_1 / C-06 = intermediate_2
Step 3: intermediate_2 * 100 = result (percentage change)
```

Or as a single expression: `"(C-05 - C-06) / C-06 * 100"`

**Aggregations:** For sums, averages, and other aggregations over multiple claims, list all input Claim IDs explicitly.

```
"mean(C-10, C-11, C-12)"
"sum(C-20 through C-25)"
"max(C-30, C-31, C-32, C-33)"
```

## Raw Input Tracking

The `raw_inputs` array creates an explicit dependency graph. When any input claim changes, every derived claim that depends on it must be recomputed.

Rules:

1. **Use raw values, not display values.** The computation must use full-precision inputs. If you compute a fold-change from rounded display values instead of raw values, the result accumulates rounding error.

2. **Every input must have its own Claim ID.** If you need a value that isn't yet in the ledger, add it as a `direct` claim first, then reference it.

3. **Transitive dependencies are tracked.** If C-07 depends on C-03, and C-03 depends on C-01 and C-02, then a change to C-01 invalidates both C-03 and C-07. The Integrity Gate follows the dependency chain.

4. **Self-referential chains are forbidden.** A claim cannot appear in its own `raw_inputs`, directly or transitively.

Example:

```json
{
  "id": "C-07",
  "claim_type": "derived",
  "formula": "C-03 * C-06",
  "raw_inputs": [
    { "claim_id": "C-03", "value": "2.29146" },
    { "claim_id": "C-06", "value": "0.85" }
  ],
  "computed_result": "1.947741",
  "display_value": "1.9x",
  "rounding_rule": "1 decimal place"
}
```

## Independent Recomputation Protocol

Independent recomputation means the orchestrator (or a verification sub-agent) performs the calculation from scratch, using only the raw input values and the stated formula, and compares the result against the claimed `computed_result` and `display_value`.

### Tier 1 (Exploratory)

- Recompute the 3-5 most critical derived values as a sanity check.
- "Most critical" means: values that appear in abstracts, executive summaries, conclusions, or section headers; values with the largest downstream impact; values the user specifically flagged.

### Tier 2 (Standard)

- Independently recompute every derived value that will appear in changed text.
- Verification evidence: record the computation in the `notes` field (e.g., `"41432187 / 18074592 = 2.29146, rounds to 2.3"`).
- If the recomputation disagrees with the claimed result, flag the claim immediately.

### Tier 3 (High-Stakes)

- Independently recompute every derived value, including those in unchanged text if they depend on a changed input.
- Source-stated confirmation alone is not sufficient unless the source is the canonical authority listed first in `source_precedence`.
- Cross-check: verify the formula itself is correct (not just that it was applied correctly). Does dividing A by B actually give you what the text claims to be computing?

### Recomputation Checklist

For each derived claim:

1. Read the formula from the ledger.
2. Read each raw input from its source file (not from the ledger -- go to the actual file).
3. Perform the calculation.
4. Compare the result to `computed_result` in the ledger. They should match exactly (or within floating-point tolerance for complex operations).
5. Apply the `rounding_rule` to the computed result.
6. Compare the rounded result to `display_value`. They should match exactly.
7. If any step fails, set `verification_status` to `flagged` and document the discrepancy in `notes`.

## Rounding Rules

Rounding is where precision silently degrades. Two common failure modes:

**Rounding-on-rounding:** Computing a derived value from already-rounded display values instead of raw values. Example: `41.4M / 18.1M = 2.287` but `41432187 / 18074592 = 2.291`. The difference (2.3 vs 2.3 after rounding to one decimal) happens to be the same here, but with different numbers it could flip the rounded result.

**Inconsistent rounding:** Using 1 decimal place for one value and 2 for another of the same type, or rounding to nearest 0.1M in the abstract and nearest 1M in the results section.

### Rounding Rule Conventions

| Rule name | Meaning | Example |
|-----------|---------|---------|
| `"nearest 0.1M"` | Divide by 1,000,000, round to 1 decimal place | 41432187 -> 41.4M |
| `"1 decimal place"` | Round to 1 decimal place | 2.29146 -> 2.3 |
| `"2 significant figures"` | Round to 2 significant figures | 0.004523 -> 0.0045 |
| `"nearest integer"` | Round to nearest whole number | 12.138 -> 12 |
| `"truncate to integer"` | Drop decimal portion (floor for positive, ceiling for negative) | 12.9 -> 12 |
| `"ceiling to nearest 100"` | Round up to next 100 | 1432 -> 1500 |
| `"no rounding"` | Display the exact value | 3.14159 -> 3.14159 |

### Rounding Rule Requirements

1. Every claim where `display_value` differs from `raw_value` (or `computed_result` for derived claims) must have an explicit `rounding_rule`.
2. The same type of measurement should use the same rounding rule throughout the document. If particle counts are rounded to nearest 0.1M in one place, they should be rounded to nearest 0.1M everywhere.
3. The Integrity Gate checks rounding consistency across all claims with the same `unit`.

## When to Use `source-stated` Claim Type

Use `source-stated` when a derived value is explicitly written in the source file itself. This means someone (or some software) already computed the derived value, and the source file is treated as authoritative for that computation.

**Examples:**
- A spreadsheet has a cell with a SUM formula that produces the total -- the total is `source-stated`
- A published paper states "a 2.3-fold improvement" -- if that paper is your source, the fold-change is `source-stated`
- A financial report states "12% year-over-year decrease" -- if the report is canonical, the percentage is `source-stated`

**Verification requirements by tier:**

| Tier | Requirement for source-stated claims |
|------|--------------------------------------|
| Tier 1 | Confirm the source location contains the stated value |
| Tier 2 | Confirm the source location contains the stated value; no independent recomputation required |
| Tier 3 | Confirm the source location; if the source is not the top-ranked file in `source_precedence`, also independently recompute to verify the source's own calculation |

**When NOT to use source-stated:**
- When you computed the value yourself during this session -- that's `derived`
- When the "source" is a previous draft of the same document -- that's circular, use `derived` and compute from raw data
- When the source file's formula is broken or references stale data -- flag it, don't trust it

## Integration with Integrity Gate

The Integrity Gate performs the following checks on derived claims:

1. **Completeness:** Every derived value in the document text has a corresponding ledger entry with `claim_type: derived` or `claim_type: source-stated`.
2. **Formula validity:** The formula references only existing Claim IDs with `verified` status.
3. **Recomputation match:** The `computed_result` matches independent recomputation (at the required tier depth).
4. **Rounding consistency:** Claims with the same `unit` use the same `rounding_rule`.
5. **Dependency freshness:** No input claim has changed since the derived value was last computed.
6. **Display accuracy:** Applying `rounding_rule` to `computed_result` produces exactly `display_value`.

If any check fails, the gate blocks phase completion and the claim is set to `flagged` with the specific failure documented in `notes`.
