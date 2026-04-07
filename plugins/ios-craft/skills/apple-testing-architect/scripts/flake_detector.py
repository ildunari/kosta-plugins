#!/usr/bin/env python3
"""
Run a test plan/scheme N times and compute flake rates per test identifier.

Requires: xcodebuild, xcresulttool.
"""
import argparse, subprocess, os, json, pathlib, collections, sys

def run(cmd, cwd=None):
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=cwd)
    if p.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{p.stderr}")
    return p.stdout

def summarize_xcresult(xcresult_path):
    cmd = ["xcrun", "xcresulttool", "get", "test-results", "tests", "--path", xcresult_path, "--format", "json"]
    out = run(cmd)
    data = json.loads(out)
    results = {}
    def walk(obj):
        if isinstance(obj, dict):
            if obj.get("_type", {}).get("_name") == "ActionTestMetadata":
                ident = obj.get("identifier", {}).get("_value")
                status = obj.get("testStatus", {}).get("_value")
                if ident: results[ident] = status
            for v in obj.values(): walk(v)
        elif isinstance(obj, list):
            for v in obj: walk(v)
    walk(data); return results

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace")
    ap.add_argument("--project")
    ap.add_argument("--scheme", required=True)
    ap.add_argument("--dest", required=True)
    ap.add_argument("--repeat", type=int, default=10)
    ap.add_argument("--result-dir", default="build/flake")
    args = ap.parse_args()

    pathlib.Path(args.result_dir).mkdir(parents=True, exist_ok=True)
    outcomes = collections.defaultdict(list)

    for i in range(args.repeat):
        bundle = os.path.join(args.result_dir, f"run_{i}.xcresult")
        cmd = ["xcodebuild", "test", "-scheme", args.scheme, "-destination", args.dest,
               "-resultBundlePath", bundle, "-quiet"]
        if args.workspace: cmd.extend(["-workspace", args.workspace])
        if args.project: cmd.extend(["-project", args.project])
        try: run(cmd)
        except Exception as e: print(e, file=sys.stderr)
        results = summarize_xcresult(bundle)
        for ident, status in results.items(): outcomes[ident].append(status)

    report = []
    for ident, statuses in outcomes.items():
        passes = sum(1 for s in statuses if s == "Success")
        fails = sum(1 for s in statuses if s != "Success")
        flake = 1.0 - (passes / max(1, len(statuses)))
        report.append({"test": ident, "runs": len(statuses), "passes": passes, "fails": fails, "flake_rate": round(flake, 3)})
    report.sort(key=lambda x: x["flake_rate"], reverse=True)

    out = os.path.join(args.result_dir, "flake_report.json")
    pathlib.Path(out).write_text(json.dumps(report, indent=2))
    print(f"Wrote {out}")
    for row in report[:10]:
        print(f"{row['flake_rate']:.0%}  {row['test']}  (fails={row['fails']}/{row['runs']})")

if __name__ == "__main__":
    main()
