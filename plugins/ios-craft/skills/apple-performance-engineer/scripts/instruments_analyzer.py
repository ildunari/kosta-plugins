#!/usr/bin/env python3
"""
instruments_analyzer.py
Parse and analyze data exported from Instruments (.trace via `xcrun xctrace export`).

Usage:
  python instruments_analyzer.py --input /path/to/trace.trace --export out_dir
  python instruments_analyzer.py --exported-json /path/to/export_dir --report report.json

Notes:
  - This script does NOT execute `xctrace`. It assumes you've exported:
      xcrun xctrace export --input your.trace --output exported_dir --toc
      xcrun xctrace export --input your.trace --output exported_dir --xpath '<xpath>'
  - It understands two kinds of inputs:
      1) A .trace file + we only produce suggestions on which XPath tables to export
      2) An exported folder with JSON/XML tables from Time Profiler / Points of Interest / Allocations
"""
import argparse, json, os, re, sys
from collections import defaultdict, Counter
import xml.etree.ElementTree as ET

def load_toc_xml(toc_path: str):
    if not os.path.exists(toc_path):
        return None
    try:
        tree = ET.parse(toc_path)
        return tree.getroot()
    except Exception as e:
        print(f"[warn] failed to parse toc xml: {e}", file=sys.stderr)
        return None

def scan_exported_tables(export_dir: str):
    """Return (tables, signposts) discovered in exported_dir."""
    tables = []
    signposts = []
    for root, _, files in os.walk(export_dir):
        for nm in files:
            path = os.path.join(root, nm)
            if nm.endswith(".json"):
                tables.append(path)
                if "signpost" in nm.lower() or "points-of-interest" in nm.lower():
                    signposts.append(path)
            elif nm.endswith(".xml") and "toc" in nm.lower():
                # ignore toc duplicates
                pass
    return tables, signposts

def summarize_time_profiler(json_path: str):
    """Summarize hotspots from a time-profiler style JSON export.
       The schema depends on Xcode version; we do best-effort parsing.
    """
    try:
        data = json.load(open(json_path, "r"))
    except Exception as e:
        return {"file": json_path, "error": f"json load failed: {e}"}
    # Heuristics: look for 'samples' or 'rows' with 'symbol' and 'self' or 'total' time
    hotspots = []
    def walk(obj):
        if isinstance(obj, dict):
            keys = set(obj.keys())
            if {"symbol", "self", "total"} <= keys or {"symbol", "selfWeight"} <= keys:
                sym = obj.get("symbol")
                self_t = obj.get("self", obj.get("selfWeight"))
                total_t = obj.get("total", obj.get("totalWeight", self_t))
                hotspots.append((sym, float(self_t or 0.0), float(total_t or self_t or 0.0)))
            for v in obj.values():
                walk(v)
        elif isinstance(obj, list):
            for v in obj:
                walk(v)
    walk(data)
    hotspots.sort(key=lambda x: (-x[2], -x[1]))
    top = hotspots[:20]
    return {
        "file": json_path,
        "top": [{"symbol": s, "self": self_t, "total": total_t} for s, self_t, total_t in top],
        "count": len(hotspots),
    }

def summarize_signposts(json_path: str):
    """Look for long intervals and frequent events by signpost name/category."""
    try:
        data = json.load(open(json_path, "r"))
    except Exception as e:
        return {"file": json_path, "error": f"json load failed: {e}"}
    by_name = defaultdict(lambda: {"count":0, "total_ms":0.0, "max_ms":0.0})
    def walk(obj):
        if isinstance(obj, dict):
            if {"name","start","end"} <= set(obj.keys()):
                dur = max(0.0, (obj["end"] - obj["start"])*1000.0 if obj["end"] and obj["start"] else 0.0)
                rec = by_name[obj["name"]]
                rec["count"] += 1
                rec["total_ms"] += dur
                rec["max_ms"] = max(rec["max_ms"], dur)
            for v in obj.values():
                walk(v)
        elif isinstance(obj, list):
            for v in obj:
                walk(v)
    walk(data)
    ranking = sorted(by_name.items(), key=lambda kv: (-kv[1]["max_ms"], -kv[1]["total_ms"]))
    top = [{"name": k, **v} for k,v in ranking[:20]]
    return {"file": json_path, "top_signposts": top, "groups": len(by_name)}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", help="Path to .trace (toc only hints)")
    ap.add_argument("--exported-json", help="Directory of exported JSON/XML tables")
    ap.add_argument("--report", default="instruments_report.json")
    args = ap.parse_args()

    report = {"hints": [], "summaries": []}
    if args.input:
        # Provide example XPath users can run to export data
        report["hints"].append({
            "tip": "Export table of contents to discover tables",
            "cmd": f"xcrun xctrace export --input '{args.input}' --toc"
        })
        report["hints"].append({
            "tip": "Export time profiler tables (example XPath)",
            "cmd": f"xcrun xctrace export --input '{args.input}' --output exported --xpath '/trace-toc/run[@number=\"1\"]/data/table[@schema]'"
        })

    if args.exported-json:
        tables, signposts = scan_exported_tables(args.exported-json)
        for t in tables:
            if "time" in t.lower() or "profile" in t.lower():
                report["summaries"].append(summarize_time_profiler(t))
        for sp in signposts:
            report["summaries"].append(summarize_signposts(sp))
        report["files_scanned"] = len(tables)

    with open(args.report, "w") as fh:
        json.dump(report, fh, indent=2)
    print(f"[ok] wrote {args.report}")

if __name__ == "__main__":
    main()
