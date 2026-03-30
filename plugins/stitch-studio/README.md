# Stitch Studio

A Claude Code plugin that integrates Google Stitch (AI-powered UI design tool)
into coding workflows. Generate screens from text prompts, extract design tokens,
and convert to production code — especially SwiftUI.

## What It Does

Stitch generates high-fidelity UI screens from text descriptions, but only
exports HTML/CSS. This plugin bridges the gap:

- **Generate** — Enhance prompts with project context, platform conventions, and
  design tokens before sending to Stitch
- **Extract** — Pull design tokens from DESIGN.md into Swift, CSS, or Tailwind
  code
- **Convert** — Translate Stitch HTML/CSS output to SwiftUI using comprehensive
  mapping tables
- **Flow** — Generate multi-screen connected flows (onboarding, navigation, etc.)
- **Brand** — Bootstrap a design system from a URL or aesthetic description

## Installation

### Via Skills CLI

```bash
# Install all skills
npx skills add kostamilov/stitch-studio --global

# Install a specific skill
npx skills add kostamilov/stitch-studio --skill stitch-convert --global
```

### Via Claude Code Plugin

```bash
claude plugin install kostamilov/stitch-studio
```

### Via Skillsync

```bash
skillsync add kostamilov/stitch-studio
```

## Prerequisites

### Stitch MCP Server (recommended)

The plugin works best with the Stitch MCP server for direct generation:

```bash
npm install -g @_davideast/stitch-mcp
npx @_davideast/stitch-mcp init    # guided auth setup
npx @_davideast/stitch-mcp doctor  # verify config
```

The plugin includes `.mcp.json` that auto-configures the server when installed
as a plugin.

### Manual Mode (no MCP)

All skills work without MCP. Generate screens in your browser at
[stitch.withgoogle.com](https://stitch.withgoogle.com), then paste screenshots
or HTML into Claude Code.

## Skills

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `stitch-studio` | `/stitch`, "design a screen" | Orchestrator — routes to the right sub-skill |
| `stitch-generate` | "generate UI", "stitch me a..." | Prompt enhancement + screen generation |
| `stitch-tokens` | "extract tokens", "sync design system" | DESIGN.md ↔ code token synchronization |
| `stitch-convert` | "convert to SwiftUI" | HTML/CSS → SwiftUI with mapping tables |
| `stitch-flow` | "design a flow", "onboarding screens" | Multi-screen connected flows |
| `stitch-brand` | "set up design system" | Brand kit + design system bootstrap |

## Agents

| Agent | Purpose |
|-------|---------|
| `design-explorer` | Generate competing design variants in parallel |
| `token-mapper` | Focused token extraction from DESIGN.md |
| `conversion-reviewer` | Review SwiftUI output against original screenshot |

## Hooks

- **SessionStart** — Detects DESIGN.md and reports Stitch context
- **PostToolUse** — Logs credit usage after Stitch MCP calls

## Key Concepts

### DESIGN.md

The bridge between Stitch and your code. A markdown file containing design
tokens (colors, typography, spacing) that Stitch generates and your code
consumes. Place it at your project root or in a `Design/` directory.

### Credit Budget

Stitch provides 400 daily credits + 15 daily redesign credits. The plugin tracks
usage and warns at 75% consumption.

### Conversion Tables

The `stitch-convert` skill includes comprehensive Tailwind-to-SwiftUI and
CSS-to-SwiftUI mapping tables covering layout, spacing, typography, colors,
sizing, borders, effects, and interactive elements.

## Project Structure

```
stitch-studio/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── agents/
│   ├── design-explorer.md
│   ├── token-mapper.md
│   └── conversion-reviewer.md
├── hooks/
│   └── hooks.json
├── scripts/
│   ├── session-init.sh
│   └── credit-logger.sh
├── skills/
│   ├── stitch-studio/SKILL.md
│   ├── stitch-generate/
│   │   ├── SKILL.md
│   │   └── references/ios-prompting.md
│   ├── stitch-tokens/
│   │   ├── SKILL.md
│   │   ├── references/design-md-schema.md
│   │   ├── examples/DESIGN.md
│   │   └── scripts/parse-design-md.py
│   ├── stitch-convert/
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── tailwind-to-swiftui.md
│   │       └── css-to-swiftui.md
│   ├── stitch-flow/SKILL.md
│   └── stitch-brand/
│       ├── SKILL.md
│       └── examples/DESIGN.md
├── docs/
│   ├── skills-index.md
│   └── mcp-setup.md
├── .mcp.json
├── AGENTS.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## License

Apache 2.0 — see [LICENSE](LICENSE).
