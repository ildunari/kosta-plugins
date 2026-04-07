#!/usr/bin/env python3
import json, argparse

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--schema", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    with open(args.schema) as f:
        schema = json.load(f)

    lines = ["erDiagram"]
    for m in schema.get("models", []):
        lines.append(f"  {m['name'].upper()} {{")
        for a in m.get("attributes", []):
            t = a["type"]
            name = a["name"]
            extra = " PK" if a.get("unique") else ""
            lines.append(f"    {t} {name}{extra}")
        lines.append("  }")
    for m in schema.get("models", []):
        for r in m.get("relationships", []):
            src = m["name"].upper()
            dst = r["destination"].upper()
            if r.get("toMany", False):
                lines.append(f"  {src} ||--o{{ {dst} : {r['name']}")
            else:
                lines.append(f"  {src} ||--|| {dst} : {r['name']}")
    with open(args.out, "w") as f:
        f.write("\n".join(lines))
    print(f"Wrote Mermaid ER diagram to {args.out}")

if __name__ == "__main__":
    main()
