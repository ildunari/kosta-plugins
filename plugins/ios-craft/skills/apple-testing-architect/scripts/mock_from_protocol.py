#!/usr/bin/env python3
"""
Generate a simple Spy/Stub mock for a Swift protocol file.

Usage:
  python3 mock_from_protocol.py --input Sources/MyApp/Networking/APIClient.swift     --protocol APIClient --out Tests/Mocks/APIClientMock.swift

Limitations:
- Regex-based, handles common method/property signatures
- Does not evaluate conditional compilation / generics constraints
"""
import argparse, re, pathlib, sys

PROTOCOL_RE = re.compile(r'protocol\s+(?P<name>[A-Za-z_]\w*)\s*:\s*[^{}]*\{(?P<body>.*?)\}', re.S)
FUNC_RE = re.compile(r'func\s+(?P<name>[A-Za-z_]\w*)\s*\((?P<params>[^)]*)\)\s*(?:->\s*(?P<ret>[^ \n{]+))?', re.M)
PROP_RE = re.compile(r'var\s+(?P<name>[A-Za-z_]\w*)\s*:\s*(?P<type>[^ {]+)\s*\{(?P<access>[^}]*)\}', re.M)

def to_param_list(params):
    params = params.strip()
    if not params: return "", ""
    pieces, call = [], []
    for i, p in enumerate(params.split(",")):
        pp = p.strip()
        if not pp: continue
        parts = pp.split(":")
        left = parts[0].strip().split()
        if len(left) == 2:
            label, name = left
        else:
            label = "_" if i == 0 else f"p{i}"
            name = left[0]
        t = parts[1].strip() if len(parts) > 1 else "Any"
        pieces.append(f"{label} {name}: {t}")
        call.append(f"{name}")
    return ", ".join(pieces), ", ".join(call)

def gen_mock(proto_name, body):
    funcs = FUNC_RE.findall(body)
    props = PROP_RE.findall(body)
    lines = [f"final class {proto_name}Mock: {proto_name} {{"]
    for name, params, ret in funcs:
        lines.append(f"    private(set) var {name}Calls: [(timestamp: Date, args: ({params or ''}))] = []")
    for name, typ, acc in props:
        lines.append(f"    var {name}: {typ} = {{ fatalError(\"Set {name} in tests\") }}()")
    lines.append("")
    for name, params, ret in funcs:
        param_list, call_args = to_param_list(params)
        ret_stmt = f" -> {ret}" if ret and ret.lower() != "void" else ""
        lines.append(f"    func {name}({param_list}){ret_stmt} {{")
        lines.append(f"        {name}Calls.append((Date(), ({params or ''})))")
        if ret and ret.lower() != "void":
            lines.append(f"        fatalError(\"Provide stub for return of {name}\")")
        lines.append("    }")
        lines.append("")
    lines.append("}")
    return "\n".join(lines)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--protocol", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    src = pathlib.Path(args.input).read_text(encoding="utf-8", errors="ignore")
    for m in PROTOCOL_RE.finditer(src):
        name = m.group("name")
        if name == args.protocol:
            content = gen_mock(name, m.group("body"))
            out = pathlib.Path(args.out)
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text("import Foundation\n\n" + content + "\n", encoding="utf-8")
            print(f"Generated mock for protocol {name} at {out}")
            return

    print(f"Protocol {args.protocol} not found in {args.input}", file=sys.stderr)
    sys.exit(1)

if __name__ == "__main__":
    main()
