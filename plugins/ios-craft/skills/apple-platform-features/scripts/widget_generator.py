#!/usr/bin/env python3
"""
widget_generator.py

Generate a complete WidgetKit scaffold (timeline, entries, configuration, previews).
Reads a JSON config, writes Swift files into the target directory.

Example config (examples/widget_config.json):
{
  "widget_kind": "WeatherWidget",
  "bundle_prefix": "com.example.app",
  "families": ["systemSmall", "systemMedium", "systemLarge"],
  "use_app_intent": false,
  "output_dir": "swift/widgets"
}
"""
import argparse, json, os, textwrap
from datetime import datetime

WIDGET_TEMPLATE = """\
import WidgetKit
import SwiftUI

struct {entry_name}: TimelineEntry {{
    let date: Date
    {entry_extra_fields}
}}

struct {provider_name}: TimelineProvider {{
    func placeholder(in context: Context) -> {entry_name} {{
        {placeholder_return}
    }}
    func getSnapshot(in context: Context, completion: @escaping ({entry_name}) -> Void) {{
        completion({snapshot_return})
    }}
    func getTimeline(in context: Context, completion: @escaping (Timeline<{entry_name}>) -> Void) {{
        var entries: [{entry_name}] = []
        let currentDate = Date()
        for hourOffset in 0..<5 {{
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            entries.append({entry_name}(date: entryDate{entry_extra_ctor}))
        }}
        completion(Timeline(entries: entries, policy: .atEnd))
    }}
}}

struct {view_name}: View {{
    var entry: {entry_name}
    var body: some View {{
        VStack(alignment: .leading) {{
            Text("\\(entry.date.formatted())").font(.caption)
            {body_content}
        }}
        .padding()
    }}
}}

struct {config_name}: Widget {{
    let kind: String = "{widget_kind}"

    var body: some WidgetConfiguration {{
        StaticConfiguration(kind: kind, provider: {provider_name}()) {{ entry in
            {view_name}(entry: entry)
        }}
        .configurationDisplayName("{widget_kind}")
        .description("Auto-generated widget.")
        .supportedFamilies([{families_list}])
    }}
}}

#Preview(as: .systemSmall) {{
    {config_name}()
}} timeline: {{
    {entry_name}(date: .now{entry_extra_ctor})
}}
"""

INTENT_TEMPLATE = """\
import WidgetKit
import SwiftUI
import AppIntents

struct {entry_name}: TimelineEntry {{
    let date: Date
    let configuration: ConfigurationAppIntent
}}

struct {provider_name}: AppIntentTimelineProvider {{
    typealias Entry = {entry_name}

    func placeholder(in context: Context) -> Entry {{
        Entry(date: .now, configuration: .init())
    }}

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> Entry {{
        Entry(date: .now, configuration: configuration)
    }}

    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<Entry> {{
        let start = Date()
        let entries = (0..<5).map {{ idx in
            Entry(date: Calendar.current.date(byAdding: .hour, value: idx, to: start)!, configuration: configuration)
        }}
        return Timeline(entries: entries, policy: .atEnd)
    }}
}}

struct {view_name}: View {{
    var entry: {entry_name}
    var body: some View {{
        VStack {{
            Text("Hello, \\(entry.configuration.exampleText)")
            Text(entry.date, style: .time)
        }}
        .padding()
    }}
}}

struct {config_name}: Widget {{
    var body: some WidgetConfiguration {{
        AppIntentConfiguration(kind: "{widget_kind}", intent: ConfigurationAppIntent.self, provider: {provider_name}()) {{ entry in
            {view_name}(entry: entry)
        }}
        .configurationDisplayName("{widget_kind}")
        .description("Intent-configurable widget.")
        .supportedFamilies([{families_list}])
    }}
}}

#Preview(as: .systemMedium) {{
    {config_name}()
}} timeline: {{
    {entry_name}(date: .now, configuration: .init())
}}
"""

INTENT_SUPPORT = """\
import AppIntents

struct ConfigurationAppIntent: WidgetConfigurationIntent {{
    static var title: LocalizedStringResource = "Widget Configuration"
    @Parameter(title: "Greeting Text") var exampleText: String
    static var parameterSummary: some ParameterSummary {{
        Summary("Show \\(\$exampleText)")
    }}
    init(exampleText: String = "World") {{ self.exampleText = exampleText }}
}}
"""

def families_to_expr(families):
    items = [f".{f}" for f in families]
    return ", ".join(items) if items else ".systemSmall"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True, help="Path to widget JSON config")
    args = ap.parse_args()
    with open(args.config, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    widget_kind = cfg.get("widget_kind", "SampleWidget")
    use_intent = bool(cfg.get("use_app_intent", False))
    families = cfg.get("families", ["systemSmall", "systemMedium"])
    outdir = cfg.get("output_dir", "swift/widgets")
    os.makedirs(outdir, exist_ok=True)

    entry_name = f"{widget_kind}Entry"
    provider_name = f"{widget_kind}Provider"
    view_name = f"{widget_kind}EntryView"
    config_name = f"{widget_kind}"

    families_expr = families_to_expr(families)
    if use_intent:
        content = INTENT_TEMPLATE.format(
            entry_name=entry_name,
            provider_name=provider_name,
            view_name=view_name,
            config_name=config_name,
            widget_kind=widget_kind,
            families_list=families_expr,
        )
        # Add intent support file
        with open(os.path.join(outdir, f"{widget_kind}Intent.swift"), "w", encoding="utf-8") as f:
            f.write(INTENT_SUPPORT)
    else:
        content = WIDGET_TEMPLATE.format(
            entry_name=entry_name,
            entry_extra_fields="let value: Int = 42",
            provider_name=provider_name,
            placeholder_return=f"{entry_name}(date: .now, value: 42)",
            snapshot_return=f"{entry_name}(date: .now, value: 42)",
            entry_extra_ctor=", value: 42",
            view_name=view_name,
            body_content='Text("Value: \\(entry.value)")',
            config_name=config_name,
            widget_kind=widget_kind,
            families_list=families_expr,
        )

    outfile = os.path.join(outdir, f"{widget_kind}.swift")
    with open(outfile, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[widget_generator] Wrote {outfile}")
    if use_intent:
        print(f"[widget_generator] Wrote {os.path.join(outdir, f'{widget_kind}Intent.swift')}")

if __name__ == "__main__":
    main()
