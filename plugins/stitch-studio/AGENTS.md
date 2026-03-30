# Stitch Studio — Agent Instructions

This plugin integrates Google Stitch with Claude Code for AI-powered UI design
generation and code conversion.

## For Agents Working On This Plugin

### Structure

- `skills/` — 6 skills, each in its own directory with SKILL.md
- `agents/` — 3 agent definitions (design-explorer, token-mapper, conversion-reviewer)
- `hooks/` — lifecycle hooks (SessionStart, PostToolUse)
- `scripts/` — shell scripts called by hooks
- `.claude-plugin/` — plugin manifest and marketplace config
- `.mcp.json` — Stitch MCP server definition

### Naming Convention

All skills are prefixed `stitch-`. Agent files use kebab-case. The `name` field
in every SKILL.md and agent frontmatter must match its directory/file name.

### Key Dependency

The Stitch MCP server (`@_davideast/stitch-mcp`) is the runtime dependency. All
skills fall back to manual mode when MCP is unavailable.

### Testing

1. Validate structure: `claude plugin validate .`
2. Test locally: `claude --plugin-dir . --debug`
3. Check skill triggering: say "design a screen" and verify stitch-studio routes
4. Check MCP: `/mcp` to verify stitch server connection

### Skill Architecture

```
stitch-studio (orchestrator)
├── stitch-generate (screen generation + prompt enhancement)
├── stitch-tokens (DESIGN.md ↔ code token sync)
├── stitch-convert (HTML/CSS → SwiftUI/React)
├── stitch-flow (multi-screen connected flows)
└── stitch-brand (design system bootstrap)
```

The orchestrator detects intent and routes to the appropriate sub-skill. Sub-skills
can also be invoked directly via `/stitch-generate`, `/stitch-convert`, etc.
