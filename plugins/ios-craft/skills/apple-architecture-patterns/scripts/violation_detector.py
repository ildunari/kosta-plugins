
#!/usr/bin/env python3
"""
violation_detector.py
Find layer violations and tight coupling in Swift projects.
"""
import os, re, argparse, json
from collections import defaultdict

UI_IMPORTS = re.compile(r'^\s*import\s+(SwiftUI|UIKit)', re.MULTILINE)
DATA_HINTS = re.compile(r'\b(URLSession|CoreData|Realm|SQLite|FileManager)\b')
CONCRETE_INJECTION = re.compile(r'init\([^)]*[A-Z][A-Za-z0-9_]+\s*\)')  # ctor with concrete types
PROTOCOL_DEF = re.compile(r'protocol\s+([A-Za-z0-9_]+)')
CLASS_DEF = re.compile(r'(class|struct)\s+([A-Za-z0-9_]+)')
IMPLEMENTS_PROTOCOL = re.compile(r':\s*([A-Za-z0-9_]+)')

def read(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return ""

def swift_files(root):
    for d, _, files in os.walk(root):
        for fn in files:
            if fn.endswith(".swift"):
                yield os.path.join(d, fn)

def detect(root):
    violations = []
    protocols = set()
    types = set()
    for f in swift_files(root):
        txt = read(f)
        if UI_IMPORTS.search(txt) and DATA_HINTS.search(txt):
            violations.append({"file": f, "type": "UI_touches_Data", "detail": "UI file references Data APIs"})
        # tight coupling: constructors accepting concrete classes in presentation/domain
        if CONCRETE_INJECTION.search(txt) and not "protocol" in txt:
            violations.append({"file": f, "type": "ConcreteCtorInjection", "detail": "Constructor injects concretes; prefer protocol"})
        for p in PROTOCOL_DEF.findall(txt):
            protocols.add(p)
        for _, t in CLASS_DEF.findall(txt):
            types.add(t)
    # coupling: classes conforming to concretes (n/a), or types directly referencing each other in many files
    # Provide summary
    return violations, sorted(protocols), sorted(types)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--path", required=True)
    ap.add_argument("--out", default="violations.json")
    args = ap.parse_args()

    violations, protocols, types = detect(args.path)
    out = {
        "root": os.path.abspath(args.path),
        "violations": violations,
        "protocols_seen": protocols,
        "types_seen": types,
        "advice": [
            "Introduce protocols at module boundaries and depend on abstractions.",
            "Move URLSession/CoreData/Realm usage into Data layer behind Repositories.",
            "Prefer constructor injection of protocols; avoid Service Locators in new code."
        ]
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print(json.dumps(out, indent=2))

if __name__ == "__main__":
    main()
