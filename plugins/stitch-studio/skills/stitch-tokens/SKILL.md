---
name: stitch-tokens
description: "This skill should be used when the user wants to extract design tokens from DESIGN.md and generate platform-specific token files (Swift, CSS custom properties, Tailwind config). It provides bidirectional sync between Stitch design tokens and code. Triggers: 'extract tokens', 'sync design system', 'generate color constants', 'generate typography constants', 'convert DESIGN.md to code', 'pull colors and typography', 'update my colors', 'regenerate theme file', 'token file is outdated', 'sync colors from DESIGN.md'."
metadata:
  version: "1.0.0"
  author: stitch-studio
---

# Stitch Tokens

You extract design tokens from DESIGN.md files and generate type-safe, platform-specific token code. You also detect drift between DESIGN.md and existing code tokens.

### Reference Files

| File | Read when... |
|------|-------------|
| `references/design-md-schema.md` | Checking DESIGN.md structure or extending it |
| `scripts/parse-design-md.py` | Automating token extraction from DESIGN.md |
| `examples/DESIGN.md` | Seeing a complete example design system |

### Extract Mode (DESIGN.md → Code)

1. Read DESIGN.md (from project root, Design/ directory, or user-specified path)
2. Parse into structured categories: colors, typography, spacing, radii, shadows, layout
3. Detect project type (Swift, CSS, Tailwind, React)
4. Generate token files for detected platform(s)
5. If existing token files exist, show a diff before writing
6. Write files only after user confirmation

### Import Mode (URL → DESIGN.md → Code)

1. User provides a URL or DESIGN.md content
2. If URL: guide user to use Stitch's Brand Kit import, then provide the DESIGN.md
3. Run Extract mode on the result

### Drift Detection

Compare existing code tokens against DESIGN.md:

- Colors that exist in code but not in DESIGN.md (orphans)
- Colors in DESIGN.md not yet in code (missing)
- Values that differ between DESIGN.md and code (conflicts)
- Report as a table with recommendations

### Platform-Specific Generation

**Swift (iOS/macOS):**

- Generate Color extensions with hex initializer
- Generate Font constants using `.system(size:weight:)`
- Generate spacing/radius CGFloat constants
- Generate a Theme `@Observable` object that groups all tokens
- Follow project conventions if existing `Design/System/` structure found

**CSS Custom Properties:**

- Generate `:root` block with `--color-*`, `--font-*`, `--spacing-*` variables
- Include dark mode via `prefers-color-scheme` media query

**Tailwind:**

- Generate `theme.extend` block for `tailwind.config.js`
- Map colors, fonts, spacing to Tailwind naming conventions

### Token Naming Convention

- Colors: primary, secondary, background, surface, error, text-primary, text-secondary, accent, border, muted
- Typography: heading1-4, body, bodyLarge, caption, overline, code
- Spacing: xs(4), sm(8), md(16), lg(24), xl(32), xxl(48)
- Radii: sm(4), md(8), lg(12), xl(16), full(9999)

### Anti-patterns

- Never hardcode hex values in generated views — always reference tokens
- Never overwrite existing token files without showing diff first
- Never generate tokens without checking for an existing design system structure
