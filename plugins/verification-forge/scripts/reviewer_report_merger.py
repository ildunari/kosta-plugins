#!/usr/bin/env python3
"""Reviewer Report Merger -- consolidate multiple reviewer reports into a single report.

Takes multiple reviewer report files (markdown), parses findings by severity
(P0/P1/P2/P3), deduplicates across reviewers (same finding flagged by multiple
reviewers), assigns the highest severity, and outputs a consolidated report.

Finding detection:
  - Lines matching "**Pn**" or "[Pn]" or "Pn:" patterns are treated as findings
  - Indented lines following a finding are treated as detail/context
  - Headings structure is preserved for grouping

Deduplication:
  - Findings are compared by normalized text (lowercased, whitespace-collapsed)
  - A configurable similarity threshold (default: 0.7) catches near-duplicates
  - When duplicated, the highest severity wins and all reviewers are credited

Requires Python 3.9+. Stdlib only.

Usage:
  python reviewer_report_merger.py reviewer1.md reviewer2.md reviewer3.md
  python reviewer_report_merger.py *.md --output consolidated.md --threshold 0.8
"""

import argparse
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Severity
# ---------------------------------------------------------------------------

SEVERITY_ORDER = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
SEVERITY_LABELS = {
    "P0": "Critical -- must fix before release",
    "P1": "High -- should fix before release",
    "P2": "Medium -- fix soon",
    "P3": "Low -- nice to have",
}

_SEV_PATTERN = re.compile(
    r"(?:\*\*\[?(P[0-3])\]?\*\*|\[(P[0-3])\]|^(P[0-3])\s*[:\-])",
    re.MULTILINE,
)


def _extract_severity(text: str) -> str | None:
    """Extract severity tag from a finding line."""
    m = _SEV_PATTERN.search(text)
    if m:
        return m.group(1) or m.group(2) or m.group(3)
    return None


def _higher_severity(a: str, b: str) -> str:
    """Return the more severe of two severity levels."""
    return a if SEVERITY_ORDER.get(a, 99) <= SEVERITY_ORDER.get(b, 99) else b


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def parse_findings(filepath: Path) -> list[dict]:
    """Parse a reviewer markdown report and extract findings with severity."""
    if not filepath.exists():
        print(f"Warning: file not found: {filepath}", file=sys.stderr)
        return []

    text = filepath.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    findings: list[dict] = []
    current_section = ""

    i = 0
    while i < len(lines):
        line = lines[i]

        # Track current section heading
        if line.startswith("#"):
            current_section = line.lstrip("# ").strip()
            i += 1
            continue

        # Check if this line contains a finding
        sev = _extract_severity(line)
        if sev:
            # Collect the finding text and any continuation lines
            finding_text = line.strip()
            detail_lines = []
            i += 1

            # Collect indented continuation lines
            while i < len(lines):
                next_line = lines[i]
                # Stop at next finding, heading, or blank line followed by non-indent
                if not next_line.strip():
                    i += 1
                    continue
                if next_line.startswith("#") or _extract_severity(next_line):
                    break
                if next_line.startswith("  ") or next_line.startswith("\t") or next_line.startswith("  >"):
                    detail_lines.append(next_line.strip())
                    i += 1
                else:
                    break

            findings.append({
                "severity": sev,
                "text": finding_text,
                "detail": "\n".join(detail_lines),
                "section": current_section,
                "reviewer": filepath.stem,
                "source_file": str(filepath),
            })
        else:
            i += 1

    return findings


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def _normalize(text: str) -> str:
    """Normalize text for comparison: lowercase, collapse whitespace, strip severity tags."""
    text = _SEV_PATTERN.sub("", text)
    text = re.sub(r"[\*\[\]`]", "", text)
    text = re.sub(r"\s+", " ", text.lower().strip())
    # Remove common prefixes
    text = re.sub(r"^[-\*]\s+", "", text)
    return text


def _similarity(a: str, b: str) -> float:
    """Simple word-overlap Jaccard similarity between two strings."""
    words_a = set(a.split())
    words_b = set(b.split())
    if not words_a or not words_b:
        return 0.0
    intersection = words_a & words_b
    union = words_a | words_b
    return len(intersection) / len(union)


def deduplicate(all_findings: list[dict], threshold: float = 0.7) -> list[dict]:
    """Deduplicate findings across reviewers.

    Findings are grouped by normalized text similarity. Within each group,
    the highest severity is kept and all reviewers are credited.
    """
    if not all_findings:
        return []

    # Normalize for comparison
    for f in all_findings:
        f["_norm"] = _normalize(f["text"])

    merged: list[dict] = []
    used = [False] * len(all_findings)

    for i, finding in enumerate(all_findings):
        if used[i]:
            continue

        group = [finding]
        used[i] = True

        for j in range(i + 1, len(all_findings)):
            if used[j]:
                continue

            # Exact normalized match or high similarity
            if (finding["_norm"] == all_findings[j]["_norm"]
                    or _similarity(finding["_norm"], all_findings[j]["_norm"]) >= threshold):
                group.append(all_findings[j])
                used[j] = True

        # Merge group
        best_sev = group[0]["severity"]
        reviewers = set()
        details = []
        for g in group:
            best_sev = _higher_severity(best_sev, g["severity"])
            reviewers.add(g["reviewer"])
            if g.get("detail"):
                details.append(g["detail"])

        merged_finding = {
            "severity": best_sev,
            "text": group[0]["text"],
            "detail": "\n".join(details) if details else "",
            "section": group[0].get("section", ""),
            "reviewers": sorted(reviewers),
            "count": len(group),
        }
        merged.append(merged_finding)

    # Clean up temp keys
    for f in all_findings:
        f.pop("_norm", None)

    # Sort by severity, then by number of reviewers who flagged it (descending)
    merged.sort(key=lambda f: (SEVERITY_ORDER.get(f["severity"], 99), -f["count"]))

    return merged


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def build_report(merged: list[dict], source_files: list[str]) -> str:
    if not merged:
        return "# Consolidated Reviewer Report\n\nNo findings across all reviewer reports.\n"

    by_sev: dict[str, list[dict]] = {}
    for f in merged:
        by_sev.setdefault(f["severity"], []).append(f)

    total = len(merged)
    multi_reviewer = sum(1 for f in merged if f["count"] > 1)
    reviewer_names = sorted({r for f in merged for r in f["reviewers"]})

    lines = [
        "# Consolidated Reviewer Report\n",
        f"**Reviewers:** {', '.join(reviewer_names)}",
        f"**Source files:** {', '.join(f'`{Path(s).name}`' for s in source_files)}",
        f"**Total unique findings:** {total}",
        f"**Cross-reviewer duplicates merged:** {multi_reviewer}",
        "",
        "## Summary by Severity\n",
    ]

    for sev in ("P0", "P1", "P2", "P3"):
        count = len(by_sev.get(sev, []))
        label = SEVERITY_LABELS.get(sev, "")
        if count > 0:
            lines.append(f"- **{sev}** ({label}): {count}")
    lines.append("")

    # Findings by severity
    for sev in ("P0", "P1", "P2", "P3"):
        findings = by_sev.get(sev, [])
        if not findings:
            continue

        lines.append(f"## {sev} Findings ({len(findings)})\n")

        for idx, f in enumerate(findings, 1):
            reviewer_tag = ", ".join(f["reviewers"])
            multi = f" (flagged by {f['count']} reviewers)" if f["count"] > 1 else ""

            lines.append(f"### {sev}-{idx:02d}{multi}\n")
            lines.append(f"**Reviewers:** {reviewer_tag}")
            if f.get("section"):
                lines.append(f"**Section:** {f['section']}")
            lines.append("")
            lines.append(f"{f['text']}")
            if f.get("detail"):
                lines.append("")
                lines.append(f"{f['detail']}")
            lines.append("")

    # Reviewer contribution stats
    lines.append("## Reviewer Contribution\n")
    lines.append("| Reviewer | Findings | P0 | P1 | P2 | P3 |")
    lines.append("|----------|----------|----|----|----|-----|")

    for reviewer in reviewer_names:
        total_r = sum(1 for f in merged if reviewer in f["reviewers"])
        counts = {}
        for sev in ("P0", "P1", "P2", "P3"):
            counts[sev] = sum(1 for f in merged if reviewer in f["reviewers"] and f["severity"] == sev)
        lines.append(
            f"| {reviewer} | {total_r} "
            f"| {counts['P0']} | {counts['P1']} | {counts['P2']} | {counts['P3']} |"
        )
    lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Merge multiple reviewer reports into a consolidated report with deduplication.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  %(prog)s reviewer1.md reviewer2.md reviewer3.md
  %(prog)s reviews/*.md --output consolidated.md --threshold 0.8

Each reviewer report should use severity tags like:
  - **[P0]** Critical finding text
  - [P1] Important finding text
  - P2: Minor finding text
""",
    )
    ap.add_argument("reports", nargs="+", help="Paths to reviewer report markdown files")
    ap.add_argument("--output", "-o", default=None,
                    help="Output consolidated report path (default: stdout)")
    ap.add_argument("--threshold", type=float, default=0.7,
                    help="Similarity threshold for deduplication (0.0-1.0, default: 0.7)")
    ap.add_argument("--json", action="store_true",
                    help="Output raw JSON instead of markdown")

    args = ap.parse_args()

    if not 0.0 <= args.threshold <= 1.0:
        print("Error: --threshold must be between 0.0 and 1.0", file=sys.stderr)
        return 2

    all_findings: list[dict] = []
    for report_path in args.reports:
        p = Path(report_path)
        findings = parse_findings(p)
        all_findings.extend(findings)
        if findings:
            print(f"Parsed {len(findings)} findings from {p.name}", file=sys.stderr)
        else:
            print(f"No findings parsed from {p.name}", file=sys.stderr)

    merged = deduplicate(all_findings, threshold=args.threshold)

    if args.json:
        import json
        output = json.dumps(merged, indent=2, ensure_ascii=False, default=str)
    else:
        output = build_report(merged, args.reports)

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(output, encoding="utf-8")
        total = len(all_findings)
        unique = len(merged)
        print(f"Consolidated report written to {args.output} ({total} total -> {unique} unique findings)")
    else:
        print(output)

    # Exit non-zero if any P0 findings exist
    if any(f["severity"] == "P0" for f in merged):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
