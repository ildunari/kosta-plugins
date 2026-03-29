#!/usr/bin/env python3
"""Derived Calculation Verifier -- independently recompute derived claims and report pass/fail.

Reads a .claims.json ledger, finds all claims with claim_type "derived", reads
their formula and raw_inputs, evaluates the formula in a safe sandbox, and
compares the result to the claim's raw_value.

Each derived claim should have:
  - "formula": a Python expression string (e.g. "a / b * 100")
  - "raw_inputs": a dict mapping variable names to numeric values (e.g. {"a": 72, "b": 100})
  - "raw_value": the expected result as a string

The verifier evaluates the formula with raw_inputs as local variables and compares
the result to raw_value within a configurable tolerance (default: 0.01).

Requires Python 3.9+. Stdlib only.

Usage:
  python derived_calc_verifier.py claims.json
  python derived_calc_verifier.py claims.json --tolerance 0.001 --output report.md
"""

import argparse
import json
import math
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Safe evaluation
# ---------------------------------------------------------------------------

# Allowed builtins for formula evaluation (no file/system access)
_SAFE_BUILTINS = {
    "abs": abs,
    "round": round,
    "min": min,
    "max": max,
    "sum": sum,
    "len": len,
    "pow": pow,
    "int": int,
    "float": float,
    # Math functions
    "sqrt": math.sqrt,
    "log": math.log,
    "log10": math.log10,
    "log2": math.log2,
    "exp": math.exp,
    "ceil": math.ceil,
    "floor": math.floor,
    "pi": math.pi,
    "e": math.e,
}


def safe_eval(formula: str, inputs: dict) -> float:
    """Evaluate a formula string with given inputs in a restricted namespace.

    Only arithmetic operations and whitelisted math functions are available.
    No access to __builtins__, import, exec, eval, open, etc.
    """
    # Reject obviously dangerous patterns
    forbidden = {"import", "__", "exec", "eval", "open", "compile", "globals", "locals", "getattr"}
    formula_lower = formula.lower()
    for word in forbidden:
        if word in formula_lower:
            raise ValueError(f"Forbidden keyword '{word}' in formula")

    namespace = {"__builtins__": {}}
    namespace.update(_SAFE_BUILTINS)

    # Convert all input values to float
    for k, v in inputs.items():
        try:
            namespace[k] = float(v)
        except (ValueError, TypeError):
            raise ValueError(f"Cannot convert input '{k}' value '{v}' to float")

    try:
        result = eval(formula, namespace)  # noqa: S307
    except Exception as exc:
        raise ValueError(f"Formula evaluation failed: {exc}") from exc

    return float(result)


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

def verify_derived_claims(ledger_path: Path, tolerance: float) -> list[dict]:
    """Verify all derived claims in a ledger. Returns list of result dicts."""
    if not ledger_path.exists():
        print(f"Error: ledger not found: {ledger_path}", file=sys.stderr)
        sys.exit(1)

    try:
        ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"Error: invalid JSON in {ledger_path}: {exc}", file=sys.stderr)
        sys.exit(1)

    claims = ledger.get("claims", [])
    derived = [c for c in claims if c.get("claim_type") == "derived"]

    if not derived:
        print("No derived claims found in ledger.")
        return []

    results = []
    for claim in derived:
        cid = claim["id"]
        formula = claim.get("formula", "")
        raw_inputs = claim.get("raw_inputs", {})
        expected_str = claim.get("raw_value", "")

        result = {
            "id": cid,
            "text": claim.get("text", ""),
            "formula": formula,
            "raw_inputs": raw_inputs,
            "expected": expected_str,
            "actual": None,
            "status": "FAIL",
            "error": None,
        }

        if not formula:
            result["error"] = "No formula defined for derived claim"
            results.append(result)
            continue

        if not raw_inputs:
            result["error"] = "No raw_inputs defined for derived claim"
            results.append(result)
            continue

        if not expected_str:
            result["error"] = "No raw_value (expected result) defined"
            results.append(result)
            continue

        try:
            expected = float(expected_str)
        except ValueError:
            result["error"] = f"Cannot parse expected value '{expected_str}' as number"
            results.append(result)
            continue

        try:
            actual = safe_eval(formula, raw_inputs)
        except ValueError as exc:
            result["error"] = str(exc)
            results.append(result)
            continue

        result["actual"] = actual
        diff = abs(actual - expected)
        # Use relative tolerance for large values, absolute for small
        if expected != 0:
            rel_diff = diff / abs(expected)
            passed = rel_diff <= tolerance
        else:
            passed = diff <= tolerance

        result["status"] = "PASS" if passed else "FAIL"
        if not passed:
            result["error"] = f"Expected {expected}, got {actual} (diff={diff:.6f})"

        results.append(result)

    return results


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def build_report(results: list[dict], ledger_path: str, tolerance: float) -> str:
    if not results:
        return "# Derived Calculation Verification\n\nNo derived claims found.\n"

    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")

    lines = [
        "# Derived Calculation Verification\n",
        f"**Ledger:** `{ledger_path}`",
        f"**Tolerance:** {tolerance}",
        f"**Total derived claims:** {len(results)}",
        f"**Passed:** {passed} | **Failed:** {failed}",
        "",
        "## Results\n",
        "| ID | Formula | Inputs | Expected | Actual | Status | Notes |",
        "|----|---------|--------|----------|--------|--------|-------|",
    ]

    for r in results:
        inputs_str = ", ".join(f"{k}={v}" for k, v in r["raw_inputs"].items()) if r["raw_inputs"] else "--"
        actual_str = f"{r['actual']:.6g}" if r["actual"] is not None else "--"
        notes = r["error"] or ""
        lines.append(
            f"| {r['id']} "
            f"| `{r['formula'] or '--'}` "
            f"| {inputs_str} "
            f"| {r['expected'] or '--'} "
            f"| {actual_str} "
            f"| **{r['status']}** "
            f"| {notes} |"
        )

    lines.append("")

    if failed > 0:
        lines.append("## Failed Claims\n")
        for r in results:
            if r["status"] == "FAIL":
                lines.append(f"- **{r['id']}**: {r['error']}")
                if r.get("text"):
                    lines.append(f"  Claim text: {r['text'][:100]}")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Independently recompute derived claims and report pass/fail.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  %(prog)s claims.json
  %(prog)s claims.json --tolerance 0.001 --output report.md

Derived claims in the ledger should have:
  "claim_type": "derived"
  "formula": "a / b * 100"       (Python expression)
  "raw_inputs": {"a": 72, "b": 100}  (variable -> value mapping)
  "raw_value": "72"              (expected result)
""",
    )
    ap.add_argument("ledger", help="Path to .claims.json ledger")
    ap.add_argument("--tolerance", type=float, default=0.01,
                    help="Relative tolerance for float comparison (default: 0.01)")
    ap.add_argument("--output", "-o", default=None,
                    help="Output report path (default: stdout)")
    ap.add_argument("--json", action="store_true",
                    help="Output raw JSON results instead of markdown")

    args = ap.parse_args()

    results = verify_derived_claims(Path(args.ledger), args.tolerance)

    if args.json:
        output = json.dumps(results, indent=2, ensure_ascii=False)
    else:
        output = build_report(results, args.ledger, args.tolerance)

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(output, encoding="utf-8")
        passed = sum(1 for r in results if r["status"] == "PASS")
        failed = sum(1 for r in results if r["status"] == "FAIL")
        print(f"Report written to {args.output} ({passed} passed, {failed} failed)")
    else:
        print(output)

    # Exit non-zero if any claim failed
    if any(r["status"] == "FAIL" for r in results):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
