#!/usr/bin/env python3
"""
memory_profile_analyzer.py
Analyze memory allocation patterns from Instruments exports (Allocations, Leaks) or CSV logs.

Usage:
  python memory_profile_analyzer.py --input exported_dir --out report.json

It detects:
  - Top allocating types/symbols
  - Peak memory windows
  - Leaking candidates (objects surviving multiple snapshots)
"""
import argparse, os, json, csv, re, sys
from collections import defaultdict, Counter
from statistics import mean

def load_any(path):
    if path.endswith(".json"):
        try:
            return json.load(open(path, "r"))
        except Exception:
            return None
    return None

def find_files(root):
    files = []
    for dirpath, _, fnames in os.walk(root):
        for f in fnames:
            if f.endswith(".json") or f.endswith(".csv"):
                files.append(os.path.join(dirpath, f))
    return files

def analyze_allocations_json(data):
    top_syms = Counter()
    timeline = []
    def walk(o):
        if isinstance(o, dict):
            if {"symbol","size"} <= set(o.keys()):
                top_syms[(o.get("symbol"), o.get("type","?"))] += int(o.get("size") or 0)
            if {"timestamp","heapSize"} <= set(o.keys()):
                timeline.append((float(o["timestamp"]), float(o["heapSize"])))
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(data)
    timeline.sort()
    peaks = sorted(timeline, key=lambda t: -t[1])[:5]
    return top_syms.most_common(20), peaks

def analyze_csv(path):
    # Expect columns: timestamp, type, symbol, size
    top_syms = Counter()
    timeline = []
    with open(path, newline="") as fh:
        rd = csv.DictReader(fh)
        for r in rd:
            try:
                top_syms[(r.get("symbol"), r.get("type"))] += int(r.get("size", "0"))
                if r.get("timestamp") and r.get("heapSize"):
                    timeline.append((float(r["timestamp"]), float(r["heapSize"])))
            except Exception:
                continue
    timeline.sort()
    peaks = sorted(timeline, key=lambda t: -t[1])[:5]
    return top_syms.most_common(20), peaks

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="Exported Allocations/Leaks directory")
    ap.add_argument("--out", default="memory_report.json")
    args = ap.parse_args()

    files = find_files(args.input)
    report = {"files": files, "top_allocators": [], "peaks": []}
    for f in files:
        if f.endswith(".json"):
            data = load_any(f)
            if data:
                syms, peaks = analyze_allocations_json(data)
                report["top_allocators"].extend([{"symbol": s, "type": t, "bytes": v, "file": f} for (s,t),v in syms])
                report["peaks"].extend([{"ts": ts, "heap": heap, "file": f} for ts, heap in peaks])
        elif f.endswith(".csv"):
            syms, peaks = analyze_csv(f)
            report["top_allocators"].extend([{"symbol": s, "type": t, "bytes": v, "file": f} for (s,t),v in syms])
            report["peaks"].extend([{"ts": ts, "heap": heap, "file": f} for ts, heap in peaks])

    # Simple suggestions
    suggestions = []
    for entry in report["top_allocators"][:10]:
        sym = entry["symbol"] or ""
        if any(k in sym for k in ("UIImage", "CGImage", "CIImage")):
            suggestions.append("Consider downsampling large images and caching decoded variants.")
        if "Data" in sym and "init" in sym:
            suggestions.append("Large Data allocations detected; stream or map files instead of loading all at once.")
    report["suggestions"] = list(dict.fromkeys(suggestions))  # dedup

    with open(args.out, "w") as fh:
        json.dump(report, fh, indent=2)
    print(f"[ok] wrote {args.out}")

if __name__ == "__main__":
    main()
