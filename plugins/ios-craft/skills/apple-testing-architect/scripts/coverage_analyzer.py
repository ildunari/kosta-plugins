#!/usr/bin/env python3
"""
Coverage analyzer & reporter for Xcode `.xcresult` bundles.

Requires Xcode tools in PATH: `xcrun xccov` or `xcrun llvm-cov`.
Can enforce thresholds via coverage_config.json.
"""
import argparse, json, subprocess, os, sys

def run(cmd):
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{p.stderr}")
    return p.stdout

def from_xcresult(xcresult):
    cmd = ["xcrun", "xccov", "view", "--json", "--report", xcresult]
    return json.loads(run(cmd))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xcresult")
    ap.add_argument("--config", default="coverage_config.json")
    ap.add_argument("--summary", action="store_true")
    args = ap.parse_args()

    if not args.xcresult:
        print("Provide --xcresult", file=sys.stderr); sys.exit(2)

    data = from_xcresult(args.xcresult)
    total = sum(t.get("lineCoverage", 0.0) * t.get("executableLines", 0) for t in data.get("targets", []))
    lines = sum(t.get("executableLines", 0) for t in data.get("targets", []))
    pct = (total / lines) if lines else 0.0
    result = {"coverage": pct}

    if args.summary:
        print(json.dumps({"coverage": round(result["coverage"]*100, 2)}, indent=2))

    cfg = {}
    if os.path.exists(args.config):
        cfg = json.loads(open(args.config).read())
    thr = cfg.get("thresholds", {}).get("global")
    if thr is not None and result["coverage"] < thr:
        print(f"Coverage {result['coverage']:.2%} is below threshold {thr:.2%}", file=sys.stderr)
        sys.exit(3)

if __name__ == "__main__":
    main()
