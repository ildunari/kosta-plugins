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
