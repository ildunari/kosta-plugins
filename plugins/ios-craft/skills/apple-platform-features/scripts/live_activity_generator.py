#!/usr/bin/env python3
"""
live_activity_generator.py

Generate ActivityKit boilerplate for Live Activities, including attributes and Dynamic Island layout.

Example config (examples/live_activity_config.json):
{
  "activity_name": "Delivery",
  "attributes": [{"name":"orderNumber","type":"String"}],
  "state": [{"name":"minutesRemaining","type":"Int"},{"name":"stage","type":"String"}],
  "output_dir": "swift/live_activities"
}
"""
import argparse, json, os

ATTRIBUTES_TEMPLATE = """\
import ActivityKit
import WidgetKit
import SwiftUI

struct {name}Attributes: ActivityAttributes {{
    public struct ContentState: Codable, Hashable {{
{state_fields}
    }}
{attr_fields}
}}

# iOS version requirement for Live Activities. Adjust this string when targeting newer OS releases.
@available(iOS 17.0, *)
struct {name}LiveActivity: Widget {{
    var body: some WidgetConfiguration {{
        ActivityConfiguration(for: {name}Attributes.self) {{ context in
            VStack {{
                Text("\\(context.attributes.{first_attr_title})")
                Text("\\(context.state.{first_state})")
            }}
            .padding()
        }} dynamicIsland: {{ context in
            DynamicIsland {{
                DynamicIslandExpandedRegion(.leading) {{ Text("•") }}
                DynamicIslandExpandedRegion(.center) {{ Text("\\(context.state.{first_state})") }}
                DynamicIslandExpandedRegion(.trailing) {{ Text("\\(context.attributes.{first_attr_title})") }}
            }} compactLeading: {{
                Text("•")
            }} compactTrailing: {{
                Text("\\(context.state.{first_state})")
            }} minimal: {{
                Text("•")
            }}
        }}
    }}
}}
"""

def to_field_line(name, typ):
    return f"        var {name}: {typ}"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    args = ap.parse_args()
    with open(args.config, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    name = cfg.get("activity_name", "Sample")
    attrs = cfg.get("attributes", [])
    state = cfg.get("state", [])
    outdir = cfg.get("output_dir", "swift/live_activities")
    os.makedirs(outdir, exist_ok=True)

    state_fields = "\n".join([to_field_line(i["name"], i["type"]) for i in state]) or "        // no state"
    attr_fields = "\n".join([to_field_line(i["name"], i["type"]) for i in attrs]) or "    // no attributes"

    first_attr = attrs[0]["name"] if attrs else "id"
    first_state = state[0]["name"] if state else "status"

    content = ATTRIBUTES_TEMPLATE.format(
        name=name,
        state_fields=state_fields,
        attr_fields=attr_fields,
        first_attr_title=first_attr,
        first_state=first_state
    )

    outfile = os.path.join(outdir, f"{name}LiveActivity.swift")
    with open(outfile, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[live_activity_generator] Wrote {outfile}")

if __name__ == "__main__":
    main()
