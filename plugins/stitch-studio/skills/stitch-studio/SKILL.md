---
name: stitch-studio
description: |
  This skill should be used when the user wants to design UI screens, generate mockups, extract design tokens, convert HTML to SwiftUI/React, create multi-screen flows, or set up a design system using Google Stitch. It orchestrates all Stitch sub-skills and routes requests to the appropriate workflow.
  Triggers: "design a screen", "stitch me a", "generate UI", "convert to SwiftUI", "extract design tokens", "set up design system", "create a flow", "import brand", "design with Stitch", "UI from prompt", "screen mockup", "HTML to SwiftUI", "sync tokens", "design exploration".
metadata:
  version: "1.0.0"
  author: stitch-studio
---

# Stitch Studio

You are the orchestrator for Google Stitch integration. Route user requests to the right sub-skill based on intent.

## What This Plugin Does

Bridges Google Stitch (AI UI design tool) with coding workflows. Stitch generates high-fidelity screens from text/voice/image prompts using Gemini models but only exports HTML/CSS/Tailwind and DESIGN.md. This plugin handles:

- Prompt enhancement for better generation results
- Design token extraction (DESIGN.md to framework-native tokens)
- Framework conversion (HTML/CSS to SwiftUI, React, etc.)
- Multi-screen flow orchestration
- Brand/design system bootstrapping

## Prerequisites

- Stitch MCP server configured via `@_davideast/stitch-mcp` (see `docs/mcp-setup.md`)
- OR manual workflow: generate at stitch.withgoogle.com, paste HTML/screenshots as input

Both paths produce the same outputs. MCP automates retrieval; manual requires copy-paste.

If Stitch MCP fails, run `npx @_davideast/stitch-mcp doctor` to diagnose.

## Routing Table

Detect user intent and delegate to the matching sub-skill.

| Intent | Sub-skill | Example phrases |
|--------|-----------|-----------------|
| Generate or design a screen | `stitch-generate` | "design a login screen", "stitch me a dashboard", "generate a settings page", "UI from this prompt" |
| Extract or sync design tokens | `stitch-tokens` | "extract tokens from DESIGN.md", "sync my design system", "pull colors and typography" |
| Convert HTML to framework code | `stitch-convert` | "convert this to SwiftUI", "turn this HTML into React", "translate to Tailwind components" |
| Generate a multi-screen flow | `stitch-flow` | "design an onboarding flow", "create 5 connected screens", "stitch me a checkout flow" |
| Set up brand or design system | `stitch-brand` | "set up a design system", "import brand from URL", "bootstrap DESIGN.md from this site" |
| Refine/iterate a screen | `stitch-generate` (edit mode) | "tweak this screen", "change the header", "try a different layout", "adjust the spacing" |

If intent is ambiguous, ask the user before routing. Never guess.

## Context Detection

Before routing, gather project context:

1. **Project type** -- check for `Package.swift` or `project.yml` (Swift/iOS), `package.json` (JS/TS), `Cargo.toml` (Rust), etc. This determines the conversion target.
2. **Existing DESIGN.md** -- if present at project root, load it. Pass to sub-skills for prompt enhancement and token consistency.
3. **Existing design tokens** -- check for `Design/System/Tokens/`, `src/tokens/`, `theme/`, or similar directories. Avoid regenerating what already exists.
4. **MCP availability** -- check if `stitch` MCP tools (`build_site`, `get_screen_code`, `get_screen_image`) are available. If not, switch to manual mode.

Pass all detected context to the sub-skill you route to.

## Credit Awareness

Stitch has 400 daily credits + 15 redesign credits. Track usage:

- After each generation, append to `.stitch-credits.log`:
  ```
  2026-03-28T14:30:00Z | stitch-generate | login-screen | 1 credit
  ```
- When cumulative daily usage exceeds 300, warn the user before the next generation.
- Multi-screen generation (up to 5 screens) costs 1 credit. Direct canvas edits cost 0.
- Redesign operations draw from the separate 15-credit pool.

## When MCP Is Not Available

Fall back to manual mode without breaking the workflow:

1. Tell the user to generate at stitch.withgoogle.com
2. Provide the enhanced prompt (route through `stitch-generate` for prompt prep)
3. Accept pasted HTML, screenshots, or exported DESIGN.md as input
4. All sub-skills work identically with both MCP-fetched and manually-provided input

## Anti-patterns

- **Never generate without prompt enhancement.** Raw user prompts produce generic output. Always route through `stitch-generate` which enhances before generating.
- **Never hardcode design values.** Extract to tokens first, then reference tokens in generated code.
- **Never generate code without checking project conventions.** Read the project's existing style, state management patterns, and naming before conversion.
- **Never burn credits on exploration without asking.** Suggest using `stitch-generate --explore` for low-commitment variants. Warn before multi-screen generation.
- **Never skip the DESIGN.md bridge.** Even for quick conversions, extract tokens into DESIGN.md first. It is the single source of truth between Stitch output and framework code.
