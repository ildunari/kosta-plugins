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
| **ios-craft** | Complete iOS development companion — 18 expert skills, 6 agents, 12 commands covering SwiftUI, concurrency, architecture, Liquid Glass, networking, testing, performance, and App Store submission. | `claude plugin install ios-craft` |
| **productivity-forge** | Compliance-grade document verification — 9-step agentic loop, Claim Ledger, 13 reviewer agents, 8 domain support. For grants, legal, financial, medical docs. | `claude plugin install productivity-forge` |
| **stitch-studio** | Google Stitch integration — UI design generation, token extraction, SwiftUI/React conversion | `claude plugin install stitch-studio` |
| **doodle-art-animation** | Hand-inked, field-notebook explainer films drawn in canvas code and rendered to MP4 with synthesized sound. Needs Node 18+, Playwright (Chromium), ffmpeg and Python 3 with numpy. | `claude plugin install doodle-art-animation` |
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
