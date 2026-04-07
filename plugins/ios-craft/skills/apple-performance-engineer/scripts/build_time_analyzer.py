#!/usr/bin/env python3
"""
build_time_analyzer.py
Analyze Xcode build logs / summaries to suggest optimizations.

Inputs supported (best effort):
  - Build Timing Summary text copied from Xcode's Report Navigator
  - xcbeautify/xcpretty logs containing "CompileSwiftSources" lines
  - XCLogParser JSON (subset)

Usage:
  python build_time_analyzer.py --input /path/to/build.log --out build_report.json
"""
import argparse, os, re, json, sys
from collections import defaultdict

RE_STEP = re.compile(r"(?P<secs>\d+\.\d+)s\s+(?P<step>CompileSwift|CompileSwiftSources|SwiftDriver|Ld|LinkStoryboards|MergeSwiftModule)\b.*?(?P<file>[A-Za-z0-9_./\-]+\.swift)?", re.I)
RE_FILE = re.compile(r"swiftc.*?-primary-file\s+([^ ]+\.swift)")
RE_SUMS = re.compile(r"^===.+?targets=\d+.+?total time: (?P<total>\d+\.\d+)s", re.I)

def parse_log(path):
    steps = []
    files = defaultdict(float)
    total = 0.0
    with open(path, "r", errors="ignore") as fh:
        for line in fh:
            m = RE_STEP.search(line)
            if m:
                secs = float(m.group("secs"))
                step = m.group("step")
                file = m.group("file") or ""
                steps.append((secs, step, file.strip()))
                if file:
                    files[file] += secs
            m2 = RE_FILE.search(line)
            if m2:
                files[m2.group(1)] += 0.0  # ensure presence
            m3 = RE_SUMS.search(line)
            if m3:
                try: total = float(m3.group("total"))
                except: pass
    return steps, files, total

def suggestions_from(files_map, steps):
    tips = []
    heavy = sorted(files_map.items(), key=lambda kv: -kv[1])[:10]
    if heavy:
        tips.append("Top slow Swift files: " + ", ".join(f"{os.path.basename(k)} ({v:.2f}s)" for k,v in heavy))
        tips.append("Consider adding type annotations or splitting large files to reduce type-checking time.")
    swift_driver = sum(secs for secs, step, _ in steps if step.lower().startswith("swiftdriver"))
    if swift_driver > 10.0:
        tips.append("SwiftDriver step is heavy; check incremental compilation and precompiled headers/module caching.")
    compile_total = sum(secs for secs, step, _ in steps if "compile" in step.lower())
    if compile_total > 0:
        tips.append("Enable Incremental builds for Debug and Whole Module Optimization for Release to balance compile time and runtime perf.")
    if any("Run script" in s for _, s, _ in steps):
        tips.append("Review Run Script phases; declare output files to avoid invalidating caches.")
    return tips

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", default="build_report.json")
    args = ap.parse_args()

    steps, files_map, total = parse_log(args.input)
    report = {
        "total_time": total if total else sum(s for s,_,_ in steps),
        "top_steps": sorted([{"secs": s, "step": st, "file": f} for s,st,f in steps], key=lambda x: -x["secs"])[:20],
        "heaviest_files": sorted([{"file": k, "secs": v} for k,v in files_map.items()], key=lambda x: -x["secs"])[:20],
        "suggestions": suggestions_from(files_map, steps)
    }
    with open(args.out, "w") as fh:
        json.dump(report, fh, indent=2)
    print(f"[ok] wrote {args.out}")

if __name__ == "__main__":
    main()
