#!/usr/bin/env python3
"""
accessibility_checker.py
Compute WCAG contrast ratios between text and background colors, validate against AA/AAA,
and propose fixes (tint, material thickness, foreground style).

Usage:
  python accessibility_checker.py --fg #FFFFFF --bg #000000 --size body
  python accessibility_checker.py --json design-tokens/colors.json
"""
import argparse, json, re, sys, math
from dataclasses import dataclass

HEX_RE = re.compile(r"^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")

@dataclass
class ContrastResult:
    ratio: float
    pass_aa: bool
    pass_aaa: bool
    suggestion: str

def srgb_to_linear(c):
    c = c / 255.0
    return c/12.92 if c <= 0.04045 else ((c + 0.055)/1.055) ** 2.4

def parse_color(hexstr):
    if not HEX_RE.match(hexstr):
        raise ValueError(f"Invalid hex color: {hexstr}")
    hexstr = hexstr.replace("#","")
    if len(hexstr) == 8:
        hexstr = hexstr[2:]  # ignore alpha for contrast, treat separately with tint
    r = int(hexstr[0:2], 16)
    g = int(hexstr[2:4], 16)
    b = int(hexstr[4:6], 16)
    return r, g, b

def relative_luminance(rgb):
    r, g, b = rgb
    rl = srgb_to_linear(r)
    gl = srgb_to_linear(g)
    bl = srgb_to_linear(b)
    return 0.2126*rl + 0.7152*gl + 0.0722*bl

def contrast_ratio(fg_hex, bg_hex):
    L1 = relative_luminance(parse_color(fg_hex))
    L2 = relative_luminance(parse_color(bg_hex))
    L_light = max(L1, L2)
    L_dark = min(L1, L2)
    return (L_light + 0.05) / (L_dark + 0.05)

def evaluate(ratio, size="body"):
    # AA: 4.5 for body, 3.0 for large; AAA: 7.0 for body, 4.5 for large
    if size in ("title","large","display"):
        pass_aa = ratio >= 3.0
        pass_aaa = ratio >= 4.5
    else:
        pass_aa = ratio >= 4.5
        pass_aaa = ratio >= 7.0
    return pass_aa, pass_aaa

def advise(ratio, size):
    if size in ("title","large","display"):
        targets = (3.0, 4.5)
    else:
        targets = (4.5, 7.0)
    if ratio >= targets[1]:
        return "Meets AAA ✅"
    if ratio >= targets[0]:
        return "Meets AA ✅; consider a tinted scrim for complex backdrops"
    # Suggest ways to improve contrast without referencing legacy Material APIs.
    return "Increase contrast: use a prominent glass style, add a tinted scrim, or elevate the foreground style"

def check_pair(fg, bg, size):
    r = contrast_ratio(fg, bg)
    aa, aaa = evaluate(r, size)
    return ContrastResult(ratio=r, pass_aa=aa, pass_aaa=aaa, suggestion=advise(r, size))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fg", help="Foreground color hex")
    ap.add_argument("--bg", help="Background color hex")
    ap.add_argument("--size", default="body", choices=["body","title","large","display"])
    ap.add_argument("--json", help="Optional: validate all pairs in a tokens file")
    args = ap.parse_args()

    if args.json:
        with open(args.json, "r", encoding="utf-8") as f:
            data = json.load(f)
        pairs = [
            ("#FFFFFF", data["bg"]["base"]["dark"]),
            (data["fg"]["secondary"]["light"], data["bg"]["elevated"]["light"]),
            (data["accent"]["primary"]["light"], data["bg"]["base"]["light"]),
        ]
        for i,(fg,bg) in enumerate(pairs, 1):
            res = check_pair(fg, bg, "body")
            print(f"[Pair {i}] ratio={res.ratio:.2f} AA={res.pass_aa} AAA={res.pass_aaa} • {res.suggestion}")
        sys.exit(0)

    if not (args.fg and args.bg):
        print("Provide --fg and --bg or --json", file=sys.stderr)
        sys.exit(2)

    res = check_pair(args.fg, args.bg, args.size)
    print(f"Contrast ratio: {res.ratio:.2f}")
    print(f"Pass AA: {res.pass_aa}  Pass AAA: {res.pass_aaa}")
    print(res.suggestion)

if __name__ == "__main__":
    main()
