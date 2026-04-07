
#!/usr/bin/env python3
"""
architecture_analyzer.py
Analyze a Swift project tree to infer architecture usage (MVVM, TCA, Clean, VIPER, Coordinators, Repository, DI)
and detect basic boundary violations.

Heuristics-based (fast) and dependency-free.
"""
import os, re, json, argparse
from collections import defaultdict

ARCH_KEYS = {
    "mvvm": ["ViewModel", "@ObservedObject", "@StateObject", "class .*ViewModel", "ObservableObject"],
    "tca":  ["import ComposableArchitecture", "Store<", "Reducer", "@Reducer", "@ObservableState", "Effect", "ReducerProtocol"],
    "clean": ["UseCase", "Interactor", "Entities", "Repositories", "Repository", "RepositoryImpl", "Data Sources"],
    "viper": ["Presenter", "Interactor", "Router", "Entity", "protocol .*Presenter", "protocol .*Interactor"],
    "coordinator": ["class .*Coordinator", "protocol .*Coordinator", "func start\\(", "childCoordinators"],
    "repository": ["protocol .*Repository", "class .*Repository", "struct .*Repository"],
    "di": ["Swinject", "DependencyContainer", "resolve\\(", "register\\(", "@Dependency", "@Environment"]
}

LAYER_HINTS = {
    "ui": ["import SwiftUI", "import UIKit", "ViewController", "SwiftUI.View"],
    "domain": ["UseCase", "Interactor", "Entity", "Entities"],
    "data": ["URLSession", "CoreData", "Realm", "SQLite", "RepositoryImpl", "DataSource"]
}

CROSS_LAYER_FORBIDDEN = [
    ("ui", "data"),   # UI importing Data directly
    # Domain should not import UI
    ("domain", "ui"),
]

def read_file(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return ""

def scan_swift_files(root):
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if fn.endswith(".swift"):
                yield os.path.join(dirpath, fn)

def match_any(patterns, text):
    for p in patterns:
        if re.search(p, text):
            return True
    return False

def detect_architectures(root):
    counts = defaultdict(int)
    files_for_arch = defaultdict(list)
    for path in scan_swift_files(root):
        content = read_file(path)
        for key, patterns in ARCH_KEYS.items():
            if match_any(patterns, content):
                counts[key] += 1
                files_for_arch[key].append(path)
    # infer primary
    primary = None
    if counts:
        primary = max(counts.items(), key=lambda kv: kv[1])[0]
    return counts, files_for_arch, primary

def classify_layer(text):
    # return set of layer labels found in this file
    found = set()
    for layer, hints in LAYER_HINTS.items():
        if match_any(hints, text):
            found.add(layer)
    return found

def detect_layer_violations(root):
    violations = []
    for path in scan_swift_files(root):
        content = read_file(path)
        layers = classify_layer(content)
        # coarse: if ui & data appear together in a file → potential breach
        if "ui" in layers and "data" in layers:
            violations.append({"type": "ui-data_samedir", "file": path, "detail": "UI and Data hints in same file"})
        # if domain uses UI symbols
        if "domain" in layers and "ui" in layers:
            violations.append({"type": "domain-imports-ui", "file": path, "detail": "Domain code references UI framework"})
    return violations

def compute_hotspots(files_for_arch):
    # find files that overlap multiple architectures (mixed responsibilities)
    overlaps = []
    buckets = defaultdict(set)
    for arch, files in files_for_arch.items():
        for f in files:
            buckets[f].add(arch)
    for f, kinds in buckets.items():
        if len(kinds) > 1:
            overlaps.append({"file": f, "architectures": sorted(kinds)})
    return overlaps

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--path", required=True, help="Path to Swift project root")
    ap.add_argument("--out", default="architecture_report.json", help="Output JSON path")
    args = ap.parse_args()

    counts, files_for_arch, primary = detect_architectures(args.path)
    violations = detect_layer_violations(args.path)
    overlaps = compute_hotspots(files_for_arch)

    report = {
        "root": os.path.abspath(args.path),
        "architectures_detected": counts,
        "primary_architecture_guess": primary,
        "files_per_architecture": files_for_arch,
        "layer_violations": violations,
        "cross_architecture_overlaps": overlaps,
        "advice": []
    }

    # Advice
    if violations:
        report["advice"].append("Found potential layer violations. Consider introducing protocols and moving Data access behind Repositories.")
    if overlaps:
        report["advice"].append("Files mixing architectural roles detected. Split responsibilities (e.g., extract ViewModel, move reducers).")
    if primary == "mvvm" and counts.get("coordinator", 0) == 0:
        report["advice"].append("MVVM detected but no Coordinators. Consider adopting Coordinators for navigation.")
    if primary == "tca" and counts.get("di", 0) == 0:
        report["advice"].append("TCA detected. Ensure dependencies are injected via the TCA Dependency system or a container.")

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
