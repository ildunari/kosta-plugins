#!/usr/bin/env python3
"""Document Structure Audit -- validate heading hierarchy, section completeness,
word counts, and cross-references.

Checks:
  - Heading hierarchy: no skipped levels (H1 -> H3 without H2)
  - Required sections: template-based section presence checking
  - Word count limits: per-section and total word count validation
  - Dangling cross-references: "see the X section" where X doesn't exist
  - Duplicate headings: warns when headings share the same text

Requires Python 3.9+. Stdlib only.

Usage:
  python doc_structure_audit.py --document paper.md
  python doc_structure_audit.py --document paper.md --template NIH_R01 --output report.md
  python doc_structure_audit.py --document paper.md --word-limit 5000 --section-limit 1500
"""

import argparse
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

TEMPLATES = {
    "NIH_R01": {
        "label": "NIH R01",
        "required": ["Specific Aims", "Significance", "Innovation", "Approach"],
    },
    "IMRAD": {
        "label": "IMRAD",
        "required": ["Introduction", "Methods", "Results", "Discussion"],
    },
    "IMRaD_ext": {
        "label": "IMRaD Extended",
        "required": ["Introduction", "Methods", "Results", "Discussion", "Conclusion"],
    },
    "general": {
        "label": "General",
        "required": [],
    },
}

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$")

# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def parse_sections(text: str) -> list[dict]:
    """Parse markdown headings and compute word counts per section."""
    lines = text.splitlines()
    secs = []
    for i, line in enumerate(lines, 1):
        m = _HEADING_RE.match(line)
        if m:
            secs.append({
                "level": len(m.group(1)),
                "title": m.group(2).strip(),
                "line": i,
                "wc": 0,
            })

    # Compute word count for each section (text between this heading and next)
    heading_lines = [s["line"] for s in secs]
    for idx, sec in enumerate(secs):
        start = sec["line"]  # line after heading
        end = heading_lines[idx + 1] - 1 if idx + 1 < len(heading_lines) else len(lines)
        body = " ".join(lines[start:end])
        sec["wc"] = len(body.split())

    return secs


# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def check_hierarchy(secs: list[dict]) -> list[dict]:
    """Find heading hierarchy gaps (e.g. H1 followed by H3)."""
    issues = []
    for i in range(1, len(secs)):
        prev_level = secs[i - 1]["level"]
        curr_level = secs[i]["level"]
        if curr_level > prev_level + 1:
            issues.append({
                "type": "hierarchy_gap",
                "line": secs[i]["line"],
                "detail": (
                    f'Heading "{secs[i]["title"]}" is H{curr_level} but follows '
                    f'H{prev_level} "{secs[i - 1]["title"]}" -- missing H{prev_level + 1}'
                ),
            })
    return issues


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def check_required_sections(secs: list[dict], template_key: str) -> list[dict]:
    """Check that all required sections from the template are present."""
    tpl = TEMPLATES.get(template_key)
    if not tpl:
        return []
    found = {_norm(s["title"]) for s in secs}
    return [
        {
            "type": "missing_section",
            "detail": f'Required section "{r}" not found (template: {tpl["label"]})',
        }
        for r in tpl["required"]
        if _norm(r) not in found
    ]


def check_word_limits(secs: list[dict], total_limit: int | None, section_limit: int | None) -> list[dict]:
    """Check total and per-section word count limits."""
    issues = []
    total_wc = sum(s["wc"] for s in secs)

    if total_limit and total_wc > total_limit:
        issues.append({
            "type": "word_limit",
            "detail": f"Total word count {total_wc} exceeds limit of {total_limit}",
        })

    if section_limit:
        for s in secs:
            if s["wc"] > section_limit:
                issues.append({
                    "type": "word_limit",
                    "line": s["line"],
                    "detail": (
                        f'Section "{s["title"]}" has {s["wc"]} words, '
                        f"exceeding section limit of {section_limit}"
                    ),
                })

    return issues


_XREF1 = re.compile(
    r"(?:see(?:\s+the)?|in\s+the)\s+([A-Z][\w]+(?:\s+[A-Z][\w]+)*)\s+section",
    re.IGNORECASE,
)
_XREF2 = re.compile(r"\bsection\s+(?:on\s+)?([A-Z][\w]+(?:\s+[A-Z][\w]+)*)")

_STOP = frozenset({
    "this", "that", "each", "next", "previous", "following", "above", "below",
    "a", "the", "our", "their", "its", "for", "which", "where", "some", "any",
})


def check_dangling_refs(text: str, secs: list[dict]) -> list[dict]:
    """Find cross-references to sections that don't exist."""
    heading_norms = {_norm(s["title"]) for s in secs}
    issues: list[dict] = []
    seen: set[str] = set()

    for pat in (_XREF1, _XREF2):
        for lineno, line in enumerate(text.splitlines(), 1):
            if _HEADING_RE.match(line):
                continue
            for m in pat.finditer(line):
                name = m.group(1).strip()
                n = _norm(name)
                if n in seen or n in _STOP or len(n) < 3:
                    continue
                if n not in heading_norms:
                    seen.add(n)
                    issues.append({
                        "type": "dangling_ref",
                        "line": lineno,
                        "detail": f'Cross-reference to "{name}" but no matching heading exists',
                    })

    return issues


def check_duplicate_headings(secs: list[dict]) -> list[dict]:
    """Warn about duplicate heading text at the same level."""
    issues: list[dict] = []
    seen: dict[tuple[int, str], int] = {}
    for s in secs:
        key = (s["level"], _norm(s["title"]))
        if key in seen:
            issues.append({
                "type": "duplicate_heading",
                "line": s["line"],
                "detail": (
                    f'Duplicate H{s["level"]} heading "{s["title"]}" '
                    f"(first seen at line {seen[key]})"
                ),
            })
        else:
            seen[key] = s["line"]
    return issues


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

_TYPE_LABEL = {
    "hierarchy_gap": "Hierarchy Gap",
    "missing_section": "Missing Section",
    "dangling_ref": "Dangling Reference",
    "word_limit": "Word Limit",
    "duplicate_heading": "Duplicate Heading",
}

_TYPE_ICON = {
    "hierarchy_gap": "WARNING",
    "missing_section": "ERROR",
    "dangling_ref": "WARNING",
    "word_limit": "WARNING",
    "duplicate_heading": "INFO",
}


def build_report(secs: list[dict], all_issues: list[dict],
                 template_key: str, doc_path: str) -> str:
    tpl_label = TEMPLATES.get(template_key, {}).get("label", template_key)
    total_wc = sum(s["wc"] for s in secs)

    lines = [
        "# Document Structure Audit\n",
        "| Field | Value |",
        "|-------|-------|",
        f"| Document | `{doc_path}` |",
        f"| Template | {tpl_label} |",
        f"| Total sections | {len(secs)} |",
        f"| Total words | {total_wc} |",
        "",
        "## Section Outline\n",
        "| Line | Level | Heading | Words |",
        "|------|-------|---------|-------|",
    ]

    for s in secs:
        indent = "  " * (s["level"] - 1)
        lines.append(f"| {s['line']} | H{s['level']} | {indent}{s['title']} | {s['wc']} |")
    lines.append("")

    if all_issues:
        lines.append(f"## Issues ({len(all_issues)})\n")
        for iss in all_issues:
            label = _TYPE_LABEL.get(iss["type"], iss["type"])
            icon = _TYPE_ICON.get(iss["type"], "INFO")
            loc = f" (line {iss['line']})" if "line" in iss else ""
            lines.append(f"- **[{icon}]** {label}{loc}: {iss['detail']}")
        lines.append("")
    else:
        lines.extend(["## Issues\n", "No issues detected.\n"])

    # Summary counts by type
    type_counts: dict[str, int] = {}
    for iss in all_issues:
        type_counts[iss["type"]] = type_counts.get(iss["type"], 0) + 1

    lines.append("## Summary\n")
    lines.append(f"- Hierarchy violations: {type_counts.get('hierarchy_gap', 0)}")
    lines.append(f"- Missing required sections: {type_counts.get('missing_section', 0)}")
    lines.append(f"- Dangling cross-references: {type_counts.get('dangling_ref', 0)}")
    lines.append(f"- Word limit violations: {type_counts.get('word_limit', 0)}")
    lines.append(f"- Duplicate headings: {type_counts.get('duplicate_heading', 0)}")
    lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Audit document structure: heading hierarchy, required sections, word counts, cross-references.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  %(prog)s --document paper.md
  %(prog)s --document paper.md --template NIH_R01 --output report.md
  %(prog)s --document paper.md --word-limit 5000 --section-limit 1500
""",
    )
    ap.add_argument("--document", required=True, help="Path to the markdown document")
    ap.add_argument("--template", choices=list(TEMPLATES.keys()), default="general",
                    help="Template for required section checking (default: general)")
    ap.add_argument("--word-limit", type=int, default=None,
                    help="Total document word count limit")
    ap.add_argument("--section-limit", type=int, default=None,
                    help="Per-section word count limit")
    ap.add_argument("--output", "-o", default=None,
                    help="Output report path (default: stdout)")

    args = ap.parse_args()

    doc_path = Path(args.document)
    if not doc_path.exists():
        print(f"Error: document not found: {doc_path}", file=sys.stderr)
        return 2

    text = doc_path.read_text(encoding="utf-8", errors="replace")
    secs = parse_sections(text)

    all_issues = []
    all_issues.extend(check_hierarchy(secs))
    all_issues.extend(check_required_sections(secs, args.template))
    all_issues.extend(check_word_limits(secs, args.word_limit, args.section_limit))
    all_issues.extend(check_dangling_refs(text, secs))
    all_issues.extend(check_duplicate_headings(secs))

    report = build_report(secs, all_issues, args.template, args.document)

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(report, encoding="utf-8")
        print(f"Report written to {args.output} ({len(all_issues)} issues)")
    else:
        print(report)

    return 1 if all_issues else 0


if __name__ == "__main__":
    sys.exit(main())
