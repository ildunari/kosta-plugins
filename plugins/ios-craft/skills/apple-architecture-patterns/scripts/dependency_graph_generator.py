
#!/usr/bin/env python3
"""
dependency_graph_generator.py
Generate dependency graphs (Mermaid or DOT) for Swift projects based on imports and simple cross-file references.
"""
import os, re, argparse, sys
from collections import defaultdict

IMPORT_RE = re.compile(r'^\s*import\s+([A-Za-z0-9_\.]+)', re.MULTILINE)
TYPE_REF_RE = re.compile(r'\b(class|struct|enum|protocol)\s+([A-Za-z0-9_]+)')

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

def build_graph(root):
    modules = defaultdict(set)  # file -> imported modules
    declared_types = {}         # type -> file
    for f in swift_files(root):
        txt = read(f)
        for m in IMPORT_RE.findall(txt):
            modules[f].add(m)
        for _, tname in TYPE_REF_RE.findall(txt):
            declared_types[tname] = f
    # Infer file-to-file references if a type name appears in another file
    refs = defaultdict(set)     # file -> set(files it references)
    type_use = re.compile(r'\b([A-Z][A-Za-z0-9_]+)\b')  # naive
    for f in swift_files(root):
        txt = read(f)
        for ident in set(type_use.findall(txt)):
            if ident in declared_types and declared_types[ident] != f:
                refs[f].add(declared_types[ident])
    return modules, refs

def to_mermaid(mods, refs, out):
    lines = ["```mermaid", "graph LR"]
    # nodes
    files = sorted(set(list(mods.keys()) + list(refs.keys())))
    id_map = {f: f"n{idx}" for idx, f in enumerate(files)}
    for f in files:
        name = os.path.basename(f)
        lines.append(f'  {id_map[f]}["{name}"]')
    # edges: imports as dotted, refs as solid
    for f, modules in mods.items():
        for m in modules:
            lines.append(f'  {id_map[f]} -- "{m}" --> {id_map[f]}')
    for f, outs in refs.items():
        for g in outs:
            lines.append(f'  {id_map[f]} --> {id_map[g]}')
    lines.append("```")
    with open(out, "w", encoding="utf-8") as fp:
        fp.write("\n".join(lines))

def to_dot(mods, refs, out):
    lines = ["digraph G {", '  rankdir=LR;']
    files = sorted(set(list(mods.keys()) + list(refs.keys())))
    id_map = {f: f"n{idx}" for idx, f in enumerate(files)}
    for f in files:
        label = os.path.basename(f)
        lines.append(f'  {id_map[f]} [label="{label}"];')
    for f, outs in refs.items():
        for g in outs:
            lines.append(f'  {id_map[f]} -> {id_map[g]};')
    lines.append("}")
    with open(out, "w", encoding="utf-8") as fp:
        fp.write("\n".join(lines))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--path", required=True)
    ap.add_argument("--format", choices=["mermaid", "dot"], default="mermaid")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    mods, refs = build_graph(args.path)
    if args.format == "mermaid":
        to_mermaid(mods, refs, args.out)
        print(f"Wrote Mermaid graph to {args.out}")
    else:
        to_dot(mods, refs, args.out)
        print(f"Wrote DOT graph to {args.out}")

if __name__ == "__main__":
    main()
