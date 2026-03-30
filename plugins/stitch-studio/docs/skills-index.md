# Stitch Studio — Skills Index

| Skill | Layer | Description |
|-------|-------|-------------|
| stitch-studio | Orchestrator | Routes user intent to the right sub-skill. Detects project type, DESIGN.md, MCP availability. |
| stitch-generate | Generation | Enhances prompts with platform context and design tokens, then generates screens via Stitch. |
| stitch-tokens | Extraction | Parses DESIGN.md into structured tokens and generates Swift, CSS, or Tailwind code. |
| stitch-convert | Conversion | Converts Stitch HTML/CSS output to SwiftUI using Tailwind and CSS mapping tables. |
| stitch-flow | Generation | Generates multi-screen connected flows, handles chunking for flows > 5 screens. |
| stitch-brand | Setup | Bootstraps a design system from a URL or aesthetic description via Stitch Brand Kit. |

## Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| design-explorer | sonnet | Parallel variant exploration (2-3 competing designs) |
| token-mapper | haiku | Focused DESIGN.md parsing and token file generation |
| conversion-reviewer | sonnet | Reviews SwiftUI output for visual accuracy and token compliance |

## Hooks

| Event | Type | Purpose |
|-------|------|---------|
| SessionStart | command | Detect DESIGN.md, report Stitch context |
| PostToolUse | command | Log credit usage for stitch MCP tools |
