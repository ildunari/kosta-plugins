#!/usr/bin/env python3
"""Cross-Document Consistency Checker -- verify claim values match across all dependent files.

Two modes:
  1. Ledger mode (--ledger): reads a .claims.json ledger and checks that every claim's
     raw_value and display_value appear in all specified dependent files.
  2. Metrics mode (--metrics / --metrics-file): compares regex-extracted metric values
     across a set of files and flags discrepancies.

Requires Python 3.9+. Stdlib only; optionally: python-docx for .docx support.

Usage:
  python cross_doc_consistency_checker.py --ledger claims.json --files report.md slides.md poster.md
  python cross_doc_consistency_checker.py --files f1.md f2.md --metrics '{"viability": "(\\d+\\.?\\d*)%"}'
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# File reading
# ---------------------------------------------------------------------------

def _read_file(path: Path) -> str:
    if path.suffix.lower() == ".docx":
        try:
            from docx import Document  # type: ignore[import-untyped]
        except ImportError:
            print(f"Error: python-docx required for '{path}'. pip install python-docx", file=sys.stderr)
            sys.exit(1)
        return "\n".join(p.text for p in Document(str(path)).paragraphs)
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(f"Error: cannot read {path}: {exc}", file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# Ledger-based consistency check
# ---------------------------------------------------------------------------

def check_ledger_consistency(ledger_path: Path, files: list[Path]) -> tuple[list[dict], dict]:
    """Check that every claim value in the ledger appears in all dependent files.

    Returns (issues, matrix) where matrix is {claim_id: {filename: found_values}}.
    """
    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    claims = ledger.get("claims", [])

    file_texts = {}
    for f in files:
        file_texts[f.name] = _read_file(f)

    issues: list[dict] = []
    matrix: dict[str, dict[str, list[str]]] = {}

    for claim in claims:
        cid = claim["id"]
        raw = claim.get("raw_value", "")
        display = claim.get("display_value", "")
        values_to_check = []
        if display:
            values_to_check.append(display)
        if raw and raw != display:
            values_to_check.append(raw)

        matrix[cid] = {}

        for fname, text in file_texts.items():
            found = []
            for v in values_to_check:
                if v in text:
                    found.append(v)
            matrix[cid][fname] = found

            if not found and values_to_check:
                issues.append({
                    "claim_id": cid,
                    "file": fname,
                    "severity": "CRITICAL",
                    "detail": f"Claim {cid} value(s) {values_to_check} not found in {fname}",
                })

    # Cross-file consistency: check if display values differ across files
    for claim in claims:
        cid = claim["id"]
        display = claim.get("display_value", "")
        if not display:
            continue

        files_with = [f for f, vals in matrix[cid].items() if display in vals]
        files_without = [f for f, vals in matrix[cid].items() if display not in vals]

        if files_with and files_without:
            issues.append({
                "claim_id": cid,
                "severity": "CRITICAL",
                "detail": (
                    f"Claim {cid} display value '{display}' found in "
                    f"{', '.join(files_with)} but missing from {', '.join(files_without)}"
                ),
            })

    return issues, matrix


# ---------------------------------------------------------------------------
# Metrics-based consistency check (from source)
# ---------------------------------------------------------------------------

def _extract_values(text: str, pattern: str) -> list[str]:
    vals: list[str] = []
    for m in re.finditer(pattern, text):
        g = m.groups()
        v = "-".join(str(x) for x in g if x is not None) if g else m.group(0)
        if v not in vals:
            vals.append(v)
    return vals


def check_metrics_consistency(files: list[Path], metrics: dict[str, str]) -> tuple[list[dict], dict]:
    """Compare regex-extracted metrics across files.

    Returns (issues, matrix) where matrix is {metric: {filename: [values]}}.
    """
    matrix: dict[str, dict[str, list[str]]] = {}
    for metric, pat in metrics.items():
        matrix[metric] = {}
        for f in files:
            text = _read_file(f)
            matrix[metric][f.name] = _extract_values(text, pat)

    issues: list[dict] = []
    for metric, file_vals in matrix.items():
        unique = set()
        for vals in file_vals.values():
            unique.update(vals)
        if len(unique) <= 1:
            continue
        detail = "; ".join(f"{fn}: {', '.join(vs) or '(not found)'}" for fn, vs in file_vals.items())
        issues.append({
            "metric": metric,
            "severity": "CRITICAL",
            "detail": detail,
        })

    return issues, matrix


# ---------------------------------------------------------------------------
# Report rendering
# ---------------------------------------------------------------------------

def render_ledger_report(issues: list[dict], matrix: dict, ledger_path: str, files: list[Path]) -> str:
    lines = [
        "# Cross-Document Consistency Report (Ledger Mode)\n",
        f"**Ledger:** `{ledger_path}`",
        f"**Files checked:** {', '.join(f'`{f.name}`' for f in files)}",
        "",
    ]

    # Matrix table
    if matrix:
        hdr = "| Claim ID | " + " | ".join(f.name for f in files) + " | Status |"
        sep = "|---" * (len(files) + 2) + "|"
        lines.extend([hdr, sep])

        issue_claims = {i.get("claim_id") for i in issues}
        for cid, file_vals in matrix.items():
            cells = " | ".join(
                ", ".join(v) if v else "---" for v in file_vals.values()
            )
            ok = cid not in issue_claims
            status = "OK" if ok else "MISMATCH"
            lines.append(f"| {cid} | {cells} | **{status}** |")
        lines.append("")

    # Issues
    if issues:
        lines.append(f"## Issues ({len(issues)})\n")
        for i in issues:
            cid = i.get("claim_id", i.get("metric", "?"))
            lines.append(f"- **[{i['severity']}]** `{cid}`: {i['detail']}")
        lines.append("")
    else:
        lines.append("## Result\n")
        lines.append("All claim values are consistent across documents.\n")

    return "\n".join(lines)


def render_metrics_report(issues: list[dict], matrix: dict, files: list[Path]) -> str:
    lines = [
        "# Cross-Document Consistency Report (Metrics Mode)\n",
        f"**Files:** {', '.join(f'`{f.name}`' for f in files)}",
        "",
    ]

    if matrix:
        hdr = "| Metric | " + " | ".join(f.name for f in files) + " | Status |"
        sep = "|---" * (len(files) + 2) + "|"
        lines.extend([hdr, sep])

        issue_metrics = {i["metric"] for i in issues}
        for metric, file_vals in matrix.items():
            cells = " | ".join(
                ", ".join(v) if v else "---" for v in file_vals.values()
            )
            ok = metric not in issue_metrics
            lines.append(f"| {metric} | {cells} | {'OK' if ok else 'MISMATCH'} |")
        lines.append("")

    if issues:
        lines.append(f"## Issues ({len(issues)})\n")
        for i in issues:
            lines.append(f"- **[{i['severity']}]** `{i['metric']}`: {i['detail']}")
        lines.append("")
    else:
        lines.append("## Result\n")
        lines.append("All metrics are consistent across documents.\n")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Check claim/metric consistency across multiple documents.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  %(prog)s --ledger claims.json --files report.md slides.md poster.md
  %(prog)s --files f1.md f2.md --metrics '{"viability": "(\\\\d+)%%"}'
  %(prog)s --files f1.md f2.md --metrics-file metrics.json --output report.md
""",
    )
    ap.add_argument("--files", nargs="+", required=True, type=Path,
                    help="Document paths to check (.md, .txt, .docx)")
    ap.add_argument("--ledger", type=Path,
                    help="Path to .claims.json ledger (ledger mode)")

    grp = ap.add_mutually_exclusive_group()
    grp.add_argument("--metrics", type=str,
                     help="JSON dict of metric_name -> regex pattern")
    grp.add_argument("--metrics-file", type=Path,
                     help="Path to JSON file with metric patterns")

    ap.add_argument("--output", "-o", type=Path, default=None,
                    help="Output report path (default: stdout)")

    args = ap.parse_args()

    # Validate files exist
    for f in args.files:
        if not f.exists():
            print(f"Error: file not found: {f}", file=sys.stderr)
            return 2

    # Determine mode
    if args.ledger:
        if not args.ledger.exists():
            print(f"Error: ledger not found: {args.ledger}", file=sys.stderr)
            return 2
        issues, matrix = check_ledger_consistency(args.ledger, args.files)
        report = render_ledger_report(issues, matrix, str(args.ledger), args.files)

    elif args.metrics or args.metrics_file:
        try:
            raw = args.metrics_file.read_text(encoding="utf-8") if args.metrics_file else args.metrics
            metrics: dict[str, str] = json.loads(raw)
        except (json.JSONDecodeError, OSError) as exc:
            print(f"Error loading metrics: {exc}", file=sys.stderr)
            return 2

        if not isinstance(metrics, dict) or not metrics:
            print("Error: metrics must be a non-empty JSON object {name: pattern}.", file=sys.stderr)
            return 2

        for name, pat in metrics.items():
            try:
                re.compile(pat)
            except re.error as exc:
                print(f"Error: invalid regex for metric '{name}': {exc}", file=sys.stderr)
                return 2

        issues, matrix = check_metrics_consistency(args.files, metrics)
        report = render_metrics_report(issues, matrix, args.files)

    else:
        print("Error: must provide --ledger or --metrics/--metrics-file.", file=sys.stderr)
        return 2

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(report, encoding="utf-8")
        print(f"Report written to {args.output} ({'mismatches found' if issues else 'consistent'})")
    else:
        print(report)

    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
