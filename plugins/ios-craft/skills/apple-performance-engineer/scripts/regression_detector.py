#!/usr/bin/env python3
"""
regression_detector.py
Compare performance metric JSON snapshots to detect regressions.

Usage:
  python regression_detector.py --baseline metrics_baseline.json --candidate metrics_new.json --out regression_report.json

The JSON format is free-form; this script looks for numeric leaf values and diffs them,
reporting any deltas above thresholds.
"""
import argparse, json, math

def flatten(prefix, obj, out):
    if isinstance(obj, dict):
        for k,v in obj.items():
            flatten(f"{prefix}.{k}" if prefix else k, v, out)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            flatten(f"{prefix}[{i}]", v, out)
    else:
        if isinstance(obj, (int, float)):
            out[prefix] = float(obj)

def detect(baseline, candidate, rel=0.15, abs_thr=0.0):
    issues = []
    for k, bv in baseline.items():
        if k in candidate:
            cv = candidate[k]
            dv = cv - bv
            if abs(dv) > max(abs_thr, abs(bv)*rel):
                issues.append({"key": k, "baseline": bv, "candidate": cv, "delta": dv, "pct": (dv/(bv if bv!=0 else 1.0))*100})
    return sorted(issues, key=lambda x: -abs(x["delta"]))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", required=True)
    ap.add_argument("--candidate", required=True)
    ap.add_argument("--out", default="regressions.json")
    ap.add_argument("--rel", type=float, default=0.15, help="Relative threshold (default 15%)")
    ap.add_argument("--abs", dest="abs_thr", type=float, default=0.0, help="Absolute threshold")
    args = ap.parse_args()

    base = json.load(open(args.baseline))
    cand = json.load(open(args.candidate))
    b_flat, c_flat = {}, {}
    flatten("", base, b_flat); flatten("", cand, c_flat)
    issues = detect(b_flat, c_flat, rel=args.rel, abs_thr=args.abs_thr)
    out = {"count": len(issues), "thresholds": {"rel": args.rel, "abs": args.abs_thr}, "issues": issues}
    with open(args.out, "w") as fh:
        json.dump(out, fh, indent=2)
    print(f"[ok] wrote {args.out}; regressions: {len(issues)}")

if __name__ == "__main__":
    main()
