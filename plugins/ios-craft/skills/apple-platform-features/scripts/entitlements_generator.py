#!/usr/bin/env python3
"""
entitlements_generator.py

Generate Entitlements.plist and Info.plist capability snippets from JSON.

Example config (examples/entitlements_config.json):
{
  "app_groups": ["group.com.example.shared"],
  "associated_domains": ["applinks:example.com"],
  "push_notifications": true,
  "background_modes": ["fetch", "processing"],
  "keychain_access_groups": ["$(AppIdentifierPrefix)com.example.app"],
  "output_dir": "examples"
}
"""
import argparse, json, os, plistlib

def build_entitlements(cfg):
    ent = {}
    if cfg.get("app_groups"):
        ent["com.apple.security.application-groups"] = cfg["app_groups"]
    if cfg.get("associated_domains"):
        ent["com.apple.developer.associated-domains"] = cfg["associated_domains"]
    if cfg.get("push_notifications"):
        ent["aps-environment"] = "development"
    if cfg.get("keychain_access_groups"):
        ent["keychain-access-groups"] = cfg["keychain_access_groups"]
    return ent

def info_plist_snippet(cfg):
    bg_modes = cfg.get("background_modes", [])
    info = {
        "UIBackgroundModes": bg_modes
    }
    return info

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    args = ap.parse_args()
    with open(args.config, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    outdir = cfg.get("output_dir", "examples")
    os.makedirs(outdir, exist_ok=True)

    ent = build_entitlements(cfg)
    ent_path = os.path.join(outdir, "Entitlements.generated.plist")
    with open(ent_path, "wb") as f:
        plistlib.dump(ent, f)

    info = info_plist_snippet(cfg)
    info_path = os.path.join(outdir, "Info.generated.snippet.plist")
    with open(info_path, "wb") as f:
        plistlib.dump(info, f)

    print(f"[entitlements_generator] Wrote {ent_path}")
    print(f"[entitlements_generator] Wrote {info_path}")

if __name__ == "__main__":
    main()
