#!/usr/bin/env python3
"""Stale Value Finder -- scan files for deprecated values that should have been replaced.

Takes a mapping of old->new values (as JSON) and a list of file globs or paths.
Reports every occurrence with file, line, match, surrounding context, and severity.

Severity levels:
  CRITICAL - stale value in a quantitative context (numbers, stats, units)
  WARNING  - stale value in normal prose
  INFO     - stale value inside a comment or TODO

Requires Python 3.9+. Stdlib only; optionally: python-docx for .docx support.

Usage:
  python stale_value_finder.py --files report.md data.txt --deprecated '{"old_val": "new_val"}'
  python stale_value_finder.py --files "docs/*.md" --deprecated-file stale_map.json
  python stale_value_finder.py --files report.md --deprecated '{"15%": "18%"}' --output report.md
"""

import argparse
import glob
import json
import re
import sys
from pathlib import Path

try:
    from docx import Document as DocxDocument
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

# ---------------------------------------------------------------------------
# Severity classification
# ---------------------------------------------------------------------------

_QUANT_PATTERNS = re.compile(
    r"(%|\bparticle|\bconcentrat|\bviab|\byield|\bdose|\bcount|\bmean\b"
    r"|\bmedian\b|\bSD\b|\bSEM\b|\bp\s*[<=]|\bCI\b|\bfold\b|\bmL\b|\bμ[gLm]"
    r"|\bnM\b|\bmM\b|\bμM\b|\bkDa\b|\bmg\b|\bng\b|\bpg\b)",
    re.IGNORECASE,
)

_COMMENT_PATTERNS = re.compile(
    r"(<!-|^>\s|^\s*#\s*TODO|^\s*//|^\s*%|NOTE:|FIXME:|COMMENT:|^\s*\*\s)",
    re.IGNORECASE,
)


def _classify_severity(context: str) -> str:
    if _COMMENT_PATTERNS.search(context):
        return "INFO"
    if _QUANT_PATTERNS.search(context):
        return "CRITICAL"
    return "WARNING"


# ---------------------------------------------------------------------------
# File reading
# ---------------------------------------------------------------------------

def _read_lines(path: str) -> list[str]:
    p = Path(path)
    if p.suffix.lower() == ".docx":
        if not HAS_DOCX:
            print(f"Warning: python-docx not installed, skipping {path}", file=sys.stderr)
            return []
        doc = DocxDocument(str(p))
        return [para.text + "\n" for para in doc.paragraphs]
    try:
        return p.read_text(encoding="utf-8", errors="replace").splitlines(keepends=True)
    except OSError as exc:
        print(f"Warning: cannot read {path}: {exc}", file=sys.stderr)
        return []


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def _context_snippet(line: str, start: int, length: int, radius: int = 50) -> str:
    lo = max(0, start - radius)
    hi = min(len(line), start + length + radius)
    snippet = line[lo:hi].replace("\n", " ").strip()
    prefix = "..." if lo > 0 else ""
    suffix = "..." if hi < len(line) else ""
    return f"{prefix}{snippet}{suffix}"


def search_file(filepath: str, deprecated: dict[str, str], case_insensitive: bool) -> list[dict]:
    """Search a single file for all deprecated values. Returns list of finding dicts."""
    if not Path(filepath).is_file():
        print(f"Warning: file not found: {filepath}", file=sys.stderr)
        return []

    lines = _read_lines(filepath)
    findings: list[dict] = []
    flags = re.IGNORECASE if case_insensitive else 0

    for old_val, new_val in deprecated.items():
        pattern = re.compile(re.escape(old_val), flags)
        for lineno, line in enumerate(lines, start=1):
            for m in pattern.finditer(line):
                ctx = _context_snippet(line, m.start(), len(old_val))
                findings.append({
                    "file": filepath,
                    "line": lineno,
                    "old": old_val,
                    "new": new_val,
                    "match": m.group(),
                    "context": ctx,
                    "severity": _classify_severity(ctx),
                })

    return findings


def _expand_file_args(file_args: list[str]) -> list[str]:
    """Expand glob patterns and deduplicate paths."""
    paths = []
    seen = set()
    for arg in file_args:
        expanded = glob.glob(arg, recursive=True)
        if not expanded:
            # Treat as literal path
            expanded = [arg]
        for p in expanded:
            if p not in seen:
                seen.add(p)
                paths.append(p)
    return paths


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def build_report(findings: list[dict]) -> str:
    if not findings:
        return "# Stale Value Report\n\nNo stale values found.\n"

    lines = ["# Stale Value Report\n"]
    file_count = len({f["file"] for f in findings})
    lines.append(f"**{len(findings)} finding(s)** across {file_count} file(s).\n")

    crit = sum(1 for f in findings if f["severity"] == "CRITICAL")
    warn = sum(1 for f in findings if f["severity"] == "WARNING")
    info = sum(1 for f in findings if f["severity"] == "INFO")

    if crit:
        lines.append(f"> **{crit} CRITICAL** finding(s) in quantitative context.\n")

    lines.append("## Summary by Severity\n")
    lines.append(f"- CRITICAL: {crit}")
    lines.append(f"- WARNING: {warn}")
    lines.append(f"- INFO: {info}")
    lines.append("")

    # Group by file
    by_file: dict[str, list[dict]] = {}
    for f in findings:
        by_file.setdefault(f["file"], []).append(f)

    for fp, hits in by_file.items():
        lines.append(f"## `{fp}`\n")
        lines.append("| Line | Severity | Stale Value | Replacement | Context |")
        lines.append("|------|----------|-------------|-------------|---------|")
        for h in sorted(hits, key=lambda x: x["line"]):
            ctx_escaped = h["context"].replace("|", "\\|")
            lines.append(
                f"| {h['line']} | **{h['severity']}** "
                f"| `{h['old']}` | `{h['new']}` | {ctx_escaped} |"
            )
        lines.append("")

    return "\n".join(lines)


def build_json_report(findings: list[dict]) -> str:
    return json.dumps(findings, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Scan files for deprecated/stale values that should have been replaced.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  %(prog)s --files report.md --deprecated '{"15%%": "18%%"}'
  %(prog)s --files "docs/**/*.md" --deprecated-file stale_map.json -o report.md
  %(prog)s --files report.md data.txt --deprecated '{"old": "new"}' -i --format json
""",
    )
    ap.add_argument("--files", nargs="+", required=True,
                    help="Files or glob patterns to scan (e.g. 'docs/*.md')")

    grp = ap.add_mutually_exclusive_group(required=True)
    grp.add_argument("--deprecated", type=str,
                     help='JSON dict of old->new pairs, e.g. \'{"15%%": "18%%"}\'')
    grp.add_argument("--deprecated-file", type=str,
                     help="Path to JSON file containing old->new mapping")

    ap.add_argument("--output", "-o", type=str, default=None,
                    help="Output report path (default: stdout)")
    ap.add_argument("--format", choices=["markdown", "json"], default="markdown",
                    help="Output format (default: markdown)")
    ap.add_argument("--case-insensitive", "-i", action="store_true",
                    help="Case-insensitive matching")

    args = ap.parse_args()

    # Load deprecated values
    if args.deprecated:
        try:
            deprecated = json.loads(args.deprecated)
        except json.JSONDecodeError as exc:
            print(f"Error: invalid JSON in --deprecated: {exc}", file=sys.stderr)
            return 2
    else:
        dep_path = Path(args.deprecated_file)
        if not dep_path.exists():
            print(f"Error: deprecated-file not found: {dep_path}", file=sys.stderr)
            return 2
        try:
            deprecated = json.loads(dep_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"Error: invalid JSON in {dep_path}: {exc}", file=sys.stderr)
            return 2

    if not isinstance(deprecated, dict):
        print("Error: deprecated values must be a JSON object {old: new}.", file=sys.stderr)
        return 2

    if not deprecated:
        print("Warning: no deprecated values provided.", file=sys.stderr)
        return 0

    # Expand globs and search
    file_paths = _expand_file_args(args.files)
    if not file_paths:
        print("Warning: no files matched the provided patterns.", file=sys.stderr)
        return 0

    all_findings: list[dict] = []
    for fp in file_paths:
        all_findings.extend(search_file(fp, deprecated, args.case_insensitive))

    # Build report
    if args.format == "json":
        report = build_json_report(all_findings)
    else:
        report = build_report(all_findings)

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(report, encoding="utf-8")
        print(f"Report written to {args.output} ({len(all_findings)} findings)")
    else:
        print(report)

    return 1 if all_findings else 0


if __name__ == "__main__":
    sys.exit(main())
