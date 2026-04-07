#!/usr/bin/env python3
"""
layout_profiler.py
Profile SwiftUI layout performance from exported signposts (Points of Interest / SwiftUI instrument).
Looks for repeated layout invalidations and long layout/compute intervals.

Usage:
  python layout_profiler.py --input exported_dir --out layout_report.json
"""
import argparse, os, json
from collections import defaultdict

LAYOUT_KEYS = ("layout", "body", "updateSubviews", "redraw", "invalidate")

def collect_signposts(root_dir):
    files = []
    for d, _, fns in os.walk(root_dir):
        for f in fns:
            if f.endswith(".json") and ("signpost" in f.lower() or "swiftui" in f.lower() or "points" in f.lower()):
                files.append(os.path.join(d, f))
    return files

def analyze_file(path):
    data = json.load(open(path, "r"))
    buckets = defaultdict(lambda: {"count":0, "total_ms":0.0, "max_ms":0.0})
    def walk(o):
        if isinstance(o, dict):
            if {"name","start","end"} <= set(o.keys()):
                name = o["name"].lower()
                if any(k in name for k in LAYOUT_KEYS):
                    dur = max(0.0, (o["end"] - o["start"])*1000.0 if o.get("end") and o.get("start") else 0.0)
                    rec = buckets[name]
                    rec["count"] += 1
                    rec["total_ms"] += dur
                    rec["max_ms"] = max(rec["max_ms"], dur)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(data)
    return { "file": path, "buckets": buckets }

def summarize(recs):
    totals = defaultdict(lambda: {"count":0,"total_ms":0.0,"max_ms":0.0})
    for r in recs:
        for name, stats in r["buckets"].items():
            totals[name]["count"] += stats["count"]
            totals[name]["total_ms"] += stats["total_ms"]
            totals[name]["max_ms"] = max(totals[name]["max_ms"], stats["max_ms"])
    ranking = sorted(totals.items(), key=lambda kv: (-kv[1]["total_ms"], -kv[1]["count"]))
    return [{"name": k, **v} for k,v in ranking]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", default="layout_report.json")
    args = ap.parse_args()

    files = collect_signposts(args.input)
    per = []
    for f in files:
        try:
            per.append(analyze_file(f))
        except Exception as e:
            per.append({"file": f, "error": str(e)})
    summary = summarize(per)
    report = {"files": files, "summary": summary[:20]}
    with open(args.out, "w") as fh:
        json.dump(report, fh, indent=2)
    print(f"[ok] wrote {args.out} (files: {len(files)})")

if __name__ == "__main__":
    main()
