# Kosta's Claude Code Plugins

Central marketplace for all my Claude Code plugins. Add this once and install
any plugin from it.

## Setup

```bash
claude plugin marketplace add ildunari/kosta-plugins
```

## Available Plugins

| Plugin | Description | Install |
|--------|-------------|---------|
| **ios-craft** | Complete iOS development companion — 15 skills, 6 agents, 12 commands covering the full lifecycle from project setup to App Store. Built for beginners. | `claude plugin install ios-craft` |
| **verification-forge** | Compliance-grade document verification — 9-step agentic loop, Claim Ledger, 13 reviewer agents, 8 domain support. For grants, legal, financial, medical docs. | `claude plugin install verification-forge` |
| **stitch-studio** | Google Stitch integration — UI design generation, token extraction, SwiftUI/React conversion | `claude plugin install stitch-studio` |
| **subagent-forge** | Research-first subagent orchestration — product scouting, GitHub audits, QA critique | `claude plugin install subagent-forge` |

## Adding New Plugins

To add a new plugin to this marketplace:

1. Create the plugin repo with `.claude-plugin/plugin.json`
2. Add an entry to `.claude-plugin/marketplace.json` in this repo
3. Push — all machines with this marketplace will see the new plugin on next update

## Updating

```bash
claude plugin marketplace update kosta-plugins
```
