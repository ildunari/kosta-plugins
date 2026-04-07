#!/usr/bin/env python3
"""
spacing_validator.py
Validate spacing and sizing against a canonical scale.

Given a file or snippet of numbers (e.g., paddings, corner radii), this script checks whether values
conform to a provided scale (default 4/8-based) and suggests nearest valid tokens.
"""
import argparse, sys, re, json
from dataclasses import dataclass

DEFAULT_SCALE = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96]

@dataclass
class Finding:
    value: float
    nearest: int
    distance: float
    ok: bool
    context: str

def nearest_token(value, scale):
    nearest = min(scale, key=lambda s: abs(s - value))
    return nearest, abs(nearest - value)

def parse_numbers(text):
    # Match numbers like 12, 12.0, 12.5 in typical Swift/JSON snippets
    return [float(m.group(0)) for m in re.finditer(r"\b\d+(?:\.\d+)?\b", text)]

def load_inputs(paths):
    snippets = []
    for p in paths:
        with open(p, "r", encoding="utf-8") as f:
            snippets.append((p, f.read()))
    return snippets

def validate(snippet_text, scale, context="<stdin>"):
    findings = []
    for num in parse_numbers(snippet_text):
        n, d = nearest_token(num, scale)
        ok = (abs(num - n) < 0.01)  # exact-ish match
        findings.append(Finding(value=num, nearest=n, distance=d, ok=ok, context=context))
    return findings

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--files", nargs="*", help="Files to scan (Swift/JSON/MD)")
    ap.add_argument("--scale", default=",".join(map(str, DEFAULT_SCALE)),
                    help="Comma-separated scale, default 4/8 system")
    args = ap.parse_args()

    scale = [int(x) for x in args.scale.split(",") if x.strip()]
    findings = []

    if args.files:
        for path, text in load_inputs(args.files):
            findings.extend(validate(text, scale, path))
    else:
        text = sys.stdin.read()
        findings.extend(validate(text, scale))

    # Report
    bad = [f for f in findings if not f.ok]
    print(f"Checked {len(findings)} numeric values.")
    if bad:
        print(f"{len(bad)} values are off-scale:\n")
        for f in bad[:200]:
            print(f"  {f.value:g}  → nearest {f.nearest}  (Δ {f.distance:g})   [{f.context}]")
        if len(bad) > 200:
            print(f"... {len(bad)-200} more")
        sys.exit(2)
    else:
        print("All values conform to the spacing scale ✅")
        sys.exit(0)

if __name__ == "__main__":
    main()
