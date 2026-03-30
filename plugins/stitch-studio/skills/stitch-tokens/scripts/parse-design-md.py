#!/usr/bin/env python3
"""
Parse a DESIGN.md file into structured JSON design tokens.

Usage:
    python3 scripts/parse-design-md.py DESIGN.md

Reads a DESIGN.md file following the Stitch token schema and outputs
structured JSON to stdout. See references/design-md-schema.md for the
expected input format.

No external dependencies — stdlib only.
"""

import json
import re
import sys
from pathlib import Path


def parse_sections(text: str) -> dict[str, str]:
    """Split markdown into sections keyed by ## header name."""
    sections: dict[str, str] = {}
    current_header = None
    current_lines: list[str] = []

    for line in text.splitlines():
        header_match = re.match(r"^##\s+(.+)$", line)
        if header_match:
            if current_header is not None:
                sections[current_header] = "\n".join(current_lines)
            current_header = header_match.group(1).strip()
            current_lines = []
        elif current_header is not None:
            current_lines.append(line)

    if current_header is not None:
        sections[current_header] = "\n".join(current_lines)

    return sections


def extract_subsection(body: str, subsection_name: str) -> str | None:
    """Extract content under a ### subsection heading within a ## section body."""
    lines = body.splitlines()
    capturing = False
    result_lines: list[str] = []
    for line in lines:
        sub_match = re.match(r"^###\s+(.+)$", line)
        if sub_match:
            if capturing:
                break  # hit next subsection, stop
            if sub_match.group(1).strip().lower() == subsection_name.lower():
                capturing = True
            continue
        if capturing:
            result_lines.append(line)
    return "\n".join(result_lines) if result_lines else None


def parse_list_tokens(body: str) -> dict[str, str]:
    """
    Extract key-value pairs from markdown list items.

    Matches patterns like:
        - **name**: `value` — optional description
        - **name**: `value`
        - **name**: value
    """
    tokens: dict[str, str] = {}
    pattern = re.compile(
        r"^-\s+\*\*(\w[\w-]*)\*\*:\s*`?([^`\n—]+?)`?\s*(?:—.*)?$"
    )
    for line in body.splitlines():
        m = pattern.match(line.strip())
        if m:
            key = m.group(1).strip()
            value = m.group(2).strip()
            tokens[key] = value
    return tokens


def parse_color_table(body: str) -> dict[str, str]:
    """
    Extract color tokens from a markdown table.

    Matches tables with columns like: | Role | Value | Usage |
    The 'Role' becomes the key (lowercased, spaces replaced with hyphens)
    and 'Value' (a hex color) becomes the value.
    """
    colors: dict[str, str] = {}
    rows = [line.strip() for line in body.splitlines() if line.strip().startswith("|")]
    if len(rows) < 3:
        return colors

    hex_pattern = re.compile(r"#(?:[0-9A-Fa-f]{3}){1,2}")
    # Skip header row and separator row
    for row in rows[2:]:
        cells = [c.strip() for c in row.split("|")]
        cells = [c for c in cells if c]
        if len(cells) < 2:
            continue
        role = cells[0].strip().lower().replace(" ", "-")
        value_cell = cells[1].strip()
        m = hex_pattern.search(value_cell)
        if m:
            colors[role] = m.group(0).upper()
    return colors


def parse_colors(body: str) -> dict[str, str]:
    """Extract color tokens — hex values only. Supports both list and table format."""
    # Try list format first
    raw = parse_list_tokens(body)
    colors: dict[str, str] = {}
    hex_pattern = re.compile(r"^#(?:[0-9A-Fa-f]{3}){1,2}$")
    for key, value in raw.items():
        if hex_pattern.match(value):
            colors[key] = value.upper()
        else:
            colors[key] = value

    if colors:
        return colors

    # Fall back to table format (| Role | Value | Usage |)
    return parse_color_table(body)


def parse_typography_table(body: str) -> dict[str, dict]:
    """
    Parse a markdown table of typography tokens.

    Detects column positions from the header row. Supports both:
      - Level | Size | Weight | Family | Line Height
      - Style | Size | Weight | Line Height | Usage
    Also checks for a "Font Family:" line outside the table as a fallback family.
    """
    typography: dict[str, dict] = {}
    rows = [line.strip() for line in body.splitlines() if line.strip().startswith("|")]

    if len(rows) < 3:
        return typography

    # Parse header to detect column indices
    header_cells = [c.strip().lower() for c in rows[0].split("|")]
    header_cells = [c for c in header_cells if c]

    col_map: dict[str, int] = {}
    for i, h in enumerate(header_cells):
        if h in ("level", "style", "name"):
            col_map["name"] = i
        elif h == "size":
            col_map["size"] = i
        elif h == "weight":
            col_map["weight"] = i
        elif h in ("family", "font family", "font"):
            col_map["family"] = i
        elif h in ("line height", "lineheight", "line-height"):
            col_map["line_height"] = i

    name_idx = col_map.get("name", 0)
    size_idx = col_map.get("size", 1)
    weight_idx = col_map.get("weight", 2)
    family_idx = col_map.get("family")
    lh_idx = col_map.get("line_height")

    # Check for a standalone "Font Family: ..." line outside the table
    fallback_family = "system"
    family_match = re.search(r"(?:Font Family|Font):\s*(.+)", body)
    if family_match:
        # Take the first font listed (before any parenthetical notes)
        fallback_family = family_match.group(1).split(",")[0].split("(")[0].strip()

    # Skip header row and separator row
    for row in rows[2:]:
        cells = [c.strip() for c in row.split("|")]
        cells = [c for c in cells if c]
        if len(cells) < 3:
            continue

        level = cells[name_idx].strip()
        size_str = cells[size_idx].strip().replace("px", "")
        weight = cells[weight_idx].strip().lower()

        family = fallback_family
        if family_idx is not None and family_idx < len(cells):
            family = cells[family_idx].strip()

        line_height = 1.5
        if lh_idx is not None and lh_idx < len(cells):
            try:
                line_height = float(cells[lh_idx].strip())
            except ValueError:
                pass

        try:
            size = int(size_str)
        except ValueError:
            try:
                size = float(size_str)
            except ValueError:
                continue

        typography[level] = {
            "size": size,
            "weight": weight,
            "family": family,
            "lineHeight": line_height,
        }

    return typography


def parse_typography_list(body: str) -> dict[str, dict]:
    """
    Parse list-format typography tokens.

    Matches: - **heading1**: 32px / bold / Inter / 1.2
    """
    typography: dict[str, dict] = {}
    pattern = re.compile(
        r"^-\s+\*\*(\w+)\*\*:\s*(\d+)px\s*/\s*(\w+)\s*/\s*(\S+)\s*/\s*([\d.]+)"
    )
    for line in body.splitlines():
        m = pattern.match(line.strip())
        if m:
            typography[m.group(1)] = {
                "size": int(m.group(2)),
                "weight": m.group(3).lower(),
                "family": m.group(4),
                "lineHeight": float(m.group(5)),
            }
    return typography


def parse_typography(body: str) -> dict[str, dict]:
    """Parse typography from either table or list format."""
    # Try table format first
    result = parse_typography_table(body)
    if result:
        return result
    # Fall back to list format
    return parse_typography_list(body)


def parse_px_table(body: str) -> dict[str, int | float]:
    """Extract px values from a markdown table (| Name | Value | ... |)."""
    values: dict[str, int | float] = {}
    rows = [line.strip() for line in body.splitlines() if line.strip().startswith("|")]
    if len(rows) < 3:
        return values
    for row in rows[2:]:
        cells = [c.strip() for c in row.split("|")]
        cells = [c for c in cells if c]
        if len(cells) < 2:
            continue
        name = cells[0].strip().lower().replace(" ", "-")
        val_str = cells[1].strip().replace("px", "")
        try:
            values[name] = int(val_str)
        except ValueError:
            try:
                values[name] = float(val_str)
            except ValueError:
                pass
    return values


def parse_px_values(body: str) -> dict[str, int | float]:
    """Extract tokens with px values, returning numeric values. Supports list and table format."""
    # Try list format first
    raw = parse_list_tokens(body)
    values: dict[str, int | float] = {}
    for key, val in raw.items():
        clean = val.replace("px", "").strip()
        try:
            num = int(clean)
            values[key] = num
        except ValueError:
            try:
                values[key] = float(clean)
            except ValueError:
                values[key] = val  # type: ignore[assignment]

    if values:
        return values

    # Fall back to table format
    return parse_px_table(body)


def parse_shadows(body: str) -> dict[str, str]:
    """Extract shadow definitions as raw CSS strings. Supports list and table format."""
    shadows: dict[str, str] = {}
    # Try list format: - **name**: `value`
    pattern = re.compile(
        r"^-\s+\*\*(\w[\w-]*)\*\*:\s*`(.+?)`\s*$"
    )
    for line in body.splitlines():
        m = pattern.match(line.strip())
        if m:
            shadows[m.group(1)] = m.group(2)

    if shadows:
        return shadows

    # Fall back to table format: | Name | Value | ... |
    rows = [line.strip() for line in body.splitlines() if line.strip().startswith("|")]
    if len(rows) >= 3:
        for row in rows[2:]:
            cells = [c.strip() for c in row.split("|")]
            cells = [c for c in cells if c]
            if len(cells) >= 2:
                name = cells[0].strip().lower().replace(" ", "-")
                value = cells[1].strip()
                if value:
                    shadows[name] = value

    return shadows


def parse_design_md(filepath: str) -> dict:
    """Parse a DESIGN.md file and return structured token JSON."""
    path = Path(filepath)
    if not path.exists():
        print(f"Error: File not found: {filepath}", file=sys.stderr)
        sys.exit(1)

    if not path.is_file():
        print(f"Error: Not a file: {filepath}", file=sys.stderr)
        sys.exit(1)

    text = path.read_text(encoding="utf-8")
    if not text.strip():
        print(f"Error: File is empty: {filepath}", file=sys.stderr)
        sys.exit(1)

    sections = parse_sections(text)
    result: dict = {}

    # Colors — accept "Colors" or "Color Palette" as section name
    colors_body = sections.get("Colors") or sections.get("Color Palette")
    if colors_body:
        # Check for Light/Dark Mode subsections (e.g., ### Light Mode / ### Dark Mode)
        light_sub = extract_subsection(colors_body, "Light Mode")
        dark_sub = extract_subsection(colors_body, "Dark Mode")
        if light_sub:
            # Use Light Mode values as the default color tokens
            result["colors"] = parse_colors(light_sub)
            if dark_sub:
                result["colorsDark"] = parse_colors(dark_sub)
        else:
            # No subsections — parse the whole body as colors
            result["colors"] = parse_colors(colors_body)

    # Dark Mode as a top-level ## section (merged under colorsDark)
    if "Dark Mode" in sections and "colorsDark" not in result:
        result["colorsDark"] = parse_colors(sections["Dark Mode"])

    # Typography
    if "Typography" in sections:
        result["typography"] = parse_typography(sections["Typography"])

    # Spacing — accept "Spacing" or "Spacing Scale"
    spacing_body = sections.get("Spacing") or sections.get("Spacing Scale")
    if spacing_body:
        result["spacing"] = parse_px_values(spacing_body)

    # Border Radius — accept "Border Radius" or "Border Radii"
    radii_body = sections.get("Border Radius") or sections.get("Border Radii")
    if radii_body:
        result["radii"] = parse_px_values(radii_body)

    # Shadows
    if "Shadows" in sections:
        result["shadows"] = parse_shadows(sections["Shadows"])

    # Custom sections
    for header, body in sections.items():
        if header.startswith("Custom:"):
            custom_name = header.split(":", 1)[1].strip().lower()
            if "custom" not in result:
                result["custom"] = {}
            result["custom"][custom_name] = parse_list_tokens(body)

    if not result:
        print(
            "Warning: No recognized token sections found in DESIGN.md. "
            "Expected sections: Colors, Typography, Spacing, Border Radius, Shadows.",
            file=sys.stderr,
        )

    return result


def main() -> None:
    if len(sys.argv) < 2:
        print(
            "Usage: python3 parse-design-md.py <path-to-DESIGN.md>",
            file=sys.stderr,
        )
        sys.exit(1)

    filepath = sys.argv[1]
    tokens = parse_design_md(filepath)
    print(json.dumps(tokens, indent=2))


if __name__ == "__main__":
    main()
