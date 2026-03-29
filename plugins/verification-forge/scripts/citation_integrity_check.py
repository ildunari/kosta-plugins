#!/usr/bin/env python3
"""Citation Integrity Check -- compare citations between two document versions.

Reports: added, removed, moved, and context-changed citations.
Supports bracket-style [1,2,3-5] and author-year (Smith et al., 2024) formats.
Detects orphaned citations (in-text but absent from reference list).

Requires Python 3.9+. Stdlib only.

Usage:
  python citation_integrity_check.py --before v1.md --after v2.md
  python citation_integrity_check.py --before v1.md --after v2.md --format author-year --output report.md
"""

import argparse
import re
import sys
from collections import OrderedDict
from pathlib import Path

# ---------------------------------------------------------------------------
# Citation extractors
# ---------------------------------------------------------------------------

def _expand_bracket(m) -> list[str]:
    """Expand bracket citation like [1,3-5] into ['1','3','4','5']."""
    inner = m.group(1)
    ids = []
    for part in inner.split(","):
        part = part.strip()
        if "-" in part:
            lo, hi = part.split("-", 1)
            try:
                ids.extend(str(i) for i in range(int(lo), int(hi) + 1))
            except ValueError:
                ids.append(part)
        else:
            ids.append(part)
    return ids


def extract_brackets(text: str) -> list[dict]:
    """Extract bracket-style citations [1], [2,3], [1-5]."""
    results = []
    for lineno, line in enumerate(text.splitlines(), 1):
        for m in re.finditer(r"\[([\d ,\-]+)\]", line):
            for cid in _expand_bracket(m):
                cid = cid.strip()
                if cid:
                    results.append({"id": cid, "ctx": line.strip(), "line": lineno})
    return results


def extract_author_year(text: str) -> list[dict]:
    """Extract author-year citations like (Smith et al., 2024)."""
    results = []
    pat = re.compile(
        r"\(([A-Z][A-Za-z'.  &]+(?:\s+et\s+al\.?)?),?\s*(\d{4}[a-z]?)\)"
    )
    for lineno, line in enumerate(text.splitlines(), 1):
        for m in pat.finditer(line):
            cid = f"{m.group(1).strip()}, {m.group(2)}"
            results.append({"id": cid, "ctx": line.strip(), "line": lineno})
    return results


EXTRACTORS = {
    "brackets": extract_brackets,
    "author-year": extract_author_year,
}

# ---------------------------------------------------------------------------
# Reference list detection
# ---------------------------------------------------------------------------

_REF_ENTRY = re.compile(r"^\s*\[(\d+)\]")


def extract_reference_list(text: str) -> set[str]:
    """Extract citation IDs from a References/Bibliography section."""
    ids: set[str] = set()
    in_refs = False
    for line in text.splitlines():
        low = line.lower().strip()
        if low in ("# references", "## references", "# bibliography", "## bibliography",
                    "### references", "### bibliography"):
            in_refs = True
            continue
        if in_refs:
            if line.startswith("#"):
                break
            m = _REF_ENTRY.match(line)
            if m:
                ids.add(m.group(1))
    return ids


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------

_QUANT = re.compile(
    r"(\d+\.?\d*\s*(%|fold|mg|μ[gLmM]|nm|mM|nM|μM|pg|ng|kDa|mL|±|p\s*[<=]))"
    r"|(\bp\s*[<=]\s*0\.\d+)|(CI\s*[=:])|(\d+\s*/\s*\d+)",
    re.IGNORECASE,
)


def _severity(kind: str, ctx: str) -> str:
    """Assign severity: P0 for removed quantitative, P1 for removed/moved, P3 for added."""
    if kind == "removed":
        return "P0" if _QUANT.search(ctx) else "P1"
    if kind == "moved":
        return "P1"
    if kind == "context-changed":
        return "P1" if _QUANT.search(ctx) else "P2"
    return "P3"


def _group_by_id(citations: list[dict]) -> OrderedDict:
    d: OrderedDict = OrderedDict()
    for c in citations:
        d.setdefault(c["id"], []).append(c)
    return d


def compare(before: list[dict], after: list[dict]) -> list[dict]:
    """Compare two citation lists and return a list of change records."""
    b_grouped = _group_by_id(before)
    a_grouped = _group_by_id(after)
    changes = []

    for cid, b_entries in b_grouped.items():
        if cid not in a_grouped:
            for e in b_entries:
                changes.append({
                    "type": "removed",
                    "id": cid,
                    "severity": _severity("removed", e["ctx"]),
                    "before_line": e["line"],
                    "context": e["ctx"],
                })
        else:
            a_entries = a_grouped[cid]
            b_lines = {e["line"] for e in b_entries}
            a_lines = {e["line"] for e in a_entries}

            if b_lines != a_lines:
                changes.append({
                    "type": "moved",
                    "id": cid,
                    "severity": _severity("moved", b_entries[0]["ctx"]),
                    "before_lines": sorted(b_lines),
                    "after_lines": sorted(a_lines),
                    "context": b_entries[0]["ctx"],
                })

            # Check for context changes (same line but different surrounding text)
            b_ctx = {e["line"]: e["ctx"] for e in b_entries}
            a_ctx = {e["line"]: e["ctx"] for e in a_entries}
            shared_lines = b_lines & a_lines
            for ln in shared_lines:
                if b_ctx.get(ln) != a_ctx.get(ln):
                    changes.append({
                        "type": "context-changed",
                        "id": cid,
                        "severity": _severity("context-changed", b_ctx.get(ln, "")),
                        "line": ln,
                        "before_context": b_ctx.get(ln, ""),
                        "after_context": a_ctx.get(ln, ""),
                    })

    for cid, a_entries in a_grouped.items():
        if cid not in b_grouped:
            for e in a_entries:
                changes.append({
                    "type": "added",
                    "id": cid,
                    "severity": _severity("added", e["ctx"]),
                    "after_line": e["line"],
                    "context": e["ctx"],
                })

    return changes


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def build_report(changes: list[dict], orphaned: set[str],
                 fmt: str, before_path: str, after_path: str) -> str:
    lines = [
        "# Citation Integrity Report\n",
        "| Field | Value |",
        "|-------|-------|",
        f"| Before | `{before_path}` |",
        f"| After  | `{after_path}` |",
        f"| Format | {fmt} |",
        f"| Total changes | {len(changes)} |",
        "",
    ]

    severity_order = ["P0", "P1", "P2", "P3"]
    for sev in severity_order:
        sub = [c for c in changes if c["severity"] == sev]
        if not sub:
            continue
        lines.append(f"## {sev} Changes\n")
        for c in sub:
            if c["type"] == "removed":
                lines.append(f"- **REMOVED** citation `{c['id']}` (line {c['before_line']})")
                lines.append(f"  > {c['context']}")
            elif c["type"] == "moved":
                lines.append(f"- **MOVED** citation `{c['id']}` (lines {c['before_lines']} -> {c['after_lines']})")
                lines.append(f"  > {c['context']}")
            elif c["type"] == "context-changed":
                lines.append(f"- **CONTEXT CHANGED** citation `{c['id']}` (line {c['line']})")
                lines.append(f"  > Before: {c['before_context']}")
                lines.append(f"  > After:  {c['after_context']}")
            elif c["type"] == "added":
                lines.append(f"- **ADDED** citation `{c['id']}` (line {c['after_line']})")
                lines.append(f"  > {c['context']}")
        lines.append("")

    if orphaned:
        lines.append("## Orphaned Citations\n")
        lines.append("Citations in text but absent from reference list:\n")
        for cid in sorted(orphaned, key=lambda x: (not x.isdigit(), x)):
            lines.append(f"- `{cid}`")
        lines.append("")

    if not changes and not orphaned:
        lines.append("No citation differences detected.\n")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Compare citations between two versions of a document.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  %(prog)s --before v1.md --after v2.md
  %(prog)s --before v1.md --after v2.md --format author-year --output report.md
""",
    )
    ap.add_argument("--before", required=True, help="Path to the original document version")
    ap.add_argument("--after", required=True, help="Path to the edited document version")
    ap.add_argument("--format", choices=list(EXTRACTORS.keys()), default="brackets",
                    help="Citation format to detect (default: brackets)")
    ap.add_argument("--output", "-o", default=None, help="Output report path (default: stdout)")

    args = ap.parse_args()

    before_path = Path(args.before)
    after_path = Path(args.after)

    for p, label in [(before_path, "before"), (after_path, "after")]:
        if not p.exists():
            print(f"Error: {label} file not found: {p}", file=sys.stderr)
            return 2

    before_text = before_path.read_text(encoding="utf-8", errors="replace")
    after_text = after_path.read_text(encoding="utf-8", errors="replace")

    extractor = EXTRACTORS[args.format]
    before_cites = extractor(before_text)
    after_cites = extractor(after_text)

    changes = compare(before_cites, after_cites)

    # Detect orphaned citations (bracket format only)
    orphaned: set[str] = set()
    if args.format == "brackets":
        ref_ids = extract_reference_list(after_text)
        if ref_ids:
            orphaned = {c["id"] for c in after_cites} - ref_ids

    report = build_report(changes, orphaned, args.format, args.before, args.after)

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(report, encoding="utf-8")
        print(f"Report written to {args.output} ({len(changes)} changes, {len(orphaned)} orphaned)")
    else:
        print(report)

    return 1 if changes or orphaned else 0


if __name__ == "__main__":
    sys.exit(main())
