#!/usr/bin/env python3
"""
app_intent_generator.py

Generate App Intents and optional App Shortcuts collections from a JSON config.

Example config (examples/app_intent_config.json):
{
  "intent_name": "AddTaskIntent",
  "title": "Add Task",
  "description": "Create a task with priority and due date.",
  "parameters": [
    {"name": "titleText", "type": "String", "title": "Title"},
    {"name": "priority", "type": "Int", "title": "Priority", "default": 1},
    {"name": "due", "type": "Date", "title": "Due", "default": "now+3600"}
  ],
  "phrases": ["Add a task", "Create task"],
  "output_dir": "swift/app_intents"
}
"""
import argparse, json, os, textwrap

INTENT_HEADER = """\
import AppIntents

struct {intent_name}: AppIntent {{
    static var title: LocalizedStringResource = "{title}"
    static var description = IntentDescription("{description}")
{parameters}

    static var parameterSummary: some ParameterSummary {{
        Summary("{summary}")
    }}

    func perform() async throws -> some IntentResult {{
        // TODO: Implement actual side-effect
        return .result(value: "{title} complete")
    }}
}}
"""

PARAM_LINE = "    @Parameter(title: \"{title}\") var {name}: {type}\n"
PARAM_LINE_DEFAULT = "    @Parameter(title: \"{title}\", default: {default}) var {name}: {type}\n"

def render_params(params):
    lines = []
    for p in params:
        default = p.get("default")
        if default is None:
            lines.append(PARAM_LINE.format(**p))
        else:
            if isinstance(default, str) and default.startswith("now"):
                default_expr = "Date.now.addingTimeInterval(3600)" if "+3600" in default else "Date.now"
            elif isinstance(default, str):
                default_expr = f"\"{default}\""
            else:
                default_expr = str(default)
            lines.append(PARAM_LINE_DEFAULT.format(title=p["title"], name=p["name"], type=p["type"], default=default_expr))
    return "".join(lines)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True, help="Path to JSON config")
    args = ap.parse_args()
    with open(args.config, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    outdir = cfg.get("output_dir", "swift/app_intents")
    os.makedirs(outdir, exist_ok=True)

    intent_name = cfg["intent_name"]
    title = cfg.get("title", intent_name)
    description = cfg.get("description", "")
    params = cfg.get("parameters", [])
    summary = cfg.get("summary", "Run {title}".format(title=title))

    intent_code = INTENT_HEADER.format(
        intent_name=intent_name,
        title=title,
        description=description,
        parameters=render_params(params),
        summary=summary
    )

    outfile = os.path.join(outdir, f"{intent_name}.swift")
    with open(outfile, "w", encoding="utf-8") as f:
        f.write(intent_code)

    print(f"[app_intent_generator] Wrote {outfile}")

if __name__ == "__main__":
    main()
