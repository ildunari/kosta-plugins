#!/usr/bin/env python3
"""
notification_generator.py

Generate notification handling code (UNUserNotificationCenter) and categories/actions from JSON.

Example config (examples/notification_config.json):
{
  "categories": [{
    "identifier": "ORDER",
    "actions": [
      {"id": "MARK_DONE", "title": "Mark as Done", "foreground": true},
      {"id": "SNOOZE", "title": "Snooze 10m", "foreground": false, "destructive": false}
    ]
  }],
  "output_dir": "swift/notifications"
}
"""
import argparse, json, os

MANAGER_TEMPLATE = """\
import Foundation
import UserNotifications
import UIKit

final class NotificationsManager: NSObject, UNUserNotificationCenterDelegate {{
    func requestAuthorization() async throws {{
        let center = UNUserNotificationCenter.current()
        let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
        if granted {{
            await MainActor.run {{ UIApplication.shared.registerForRemoteNotifications() }}
        }}
        center.delegate = self
        registerCategories()
    }}

    private func registerCategories() {{
{categories_block}
    }}

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {{
        return [.banner, .sound]
    }}

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {{
        let id = response.actionIdentifier
        switch id {{
{switch_cases}
        default: break
        }}
    }}
}}
"""

def action_expr(act):
    opts = []
    if act.get("foreground"): opts.append(".foreground")
    if act.get("destructive"): opts.append(".destructive")
    if act.get("authenticationRequired"): opts.append(".authenticationRequired")
    opts_expr = "[" + ", ".join(opts) + "]" if opts else "[]"
    return f'UNNotificationAction(identifier: "{act["id"]}", title: "{act["title"]}", options: {opts_expr})'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    args = ap.parse_args()
    with open(args.config, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    outdir = cfg.get("output_dir", "swift/notifications")
    os.makedirs(outdir, exist_ok=True)

    cat_blocks = []
    switch_cases = []
    for cat in cfg.get("categories", []):
        actions_code = ",\n            ".join(action_expr(a) for a in cat.get("actions", []))
        cat_block = f"""        let {cat["identifier"].lower()} = UNNotificationCategory(
            identifier: "{cat["identifier"]}",
            actions: [
            {actions_code}
            ],
            intentIdentifiers: [],
            options: []
        )
        UNUserNotificationCenter.current().setNotificationCategories([{cat["identifier"].lower()}])"""
        cat_blocks.append(cat_block)

        for a in cat.get("actions", []):
            switch_cases.append(f'        case "{a["id"]}": print("Action {a["id"]} tapped")')

    content = MANAGER_TEMPLATE.format(
        categories_block="\n\n".join(cat_blocks),
        switch_cases="\n".join(switch_cases)
    )

    outfile = os.path.join(outdir, "NotificationsManager.swift")
    with open(outfile, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[notification_generator] Wrote {outfile}")

if __name__ == "__main__":
    main()
