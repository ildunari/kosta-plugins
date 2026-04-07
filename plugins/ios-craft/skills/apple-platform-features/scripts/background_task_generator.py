#!/usr/bin/env python3
"""
background_task_generator.py

Generate registration and scheduling helpers for BGTaskScheduler from JSON.

Example config (examples/background_task_config.json):
{
  "identifiers": {
    "refresh": "com.example.app.refresh",
    "processing": "com.example.app.processing"
  },
  "output_dir": "swift/background_tasks"
}
"""
import argparse, json, os

TEMPLATE = """\
import Foundation
import BackgroundTasks

enum BGIdentifiers {{
    static let refresh = "{refresh}"
    static let processing = "{processing}"
}}

func registerBackgroundTasks() {{
    BGTaskScheduler.shared.register(forTaskWithIdentifier: BGIdentifiers.refresh, using: nil) {{ task in
        scheduleAppRefresh()
        Task {{
            await refreshData()
            task.setTaskCompleted(success: true)
        }}
    }}

    BGTaskScheduler.shared.register(forTaskWithIdentifier: BGIdentifiers.processing, using: nil) {{ task in
        scheduleProcessing()
        Task {{
            await doProcessingWork()
            task.setTaskCompleted(success: true)
        }}
    }}
}}

func scheduleAppRefresh() {{
    let req = BGAppRefreshTaskRequest(identifier: BGIdentifiers.refresh)
    req.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
    try? BGTaskScheduler.shared.submit(req)
}}

func scheduleProcessing() {{
    let req = BGProcessingTaskRequest(identifier: BGIdentifiers.processing)
    req.requiresNetworkConnectivity = true
    req.requiresExternalPower = false
    req.earliestBeginDate = Date(timeIntervalSinceNow: 30 * 60)
    try? BGTaskScheduler.shared.submit(req)
}}

@MainActor
func refreshData() async {{
    // TODO: Fetch and persist updates
}}

@MainActor
func doProcessingWork() async {{
    // TODO: Heavy processing while backgrounded
}}
"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    args = ap.parse_args()
    with open(args.config, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    outdir = cfg.get("output_dir", "swift/background_tasks")
    os.makedirs(outdir, exist_ok=True)

    ids = cfg.get("identifiers", {})
    content = TEMPLATE.format(
        refresh=ids.get("refresh", "com.example.app.refresh"),
        processing=ids.get("processing", "com.example.app.processing")
    )

    outfile = os.path.join(outdir, "BackgroundTasks.swift")
    with open(outfile, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[background_task_generator] Wrote {outfile}")

if __name__ == "__main__":
    main()
