# DESIGN.md Schema Reference

This document describes the structure that Stitch outputs when generating a DESIGN.md file from a brand kit, URL import, or manual creation. The parser in `scripts/parse-design-md.py` uses this schema to extract tokens.

## Parsing Strategy

The parser is section-header-based. It splits the file on `##` headers, then extracts key-value pairs from each section. This means:

- Section headers (`## Colors`, `## Typography`, etc.) determine the token category
- Within each section, tokens are listed as markdown list items or table rows
- Hex colors are detected via `#` prefix followed by 3 or 6 hex characters
- Numeric values with `px` suffix are parsed as pixel measurements
- Font weight keywords (`bold`, `semibold`, `medium`, `regular`, `light`) map to platform weight constants

## Section Headers and Their Purpose

| Header | Purpose | Token Type |
|--------|---------|------------|
| `## Colors` | Semantic color palette with hex values | color |
| `## Typography` | Font families, sizes, weights, and line heights | typography |
| `## Spacing` | Spacing scale values in px | spacing |
| `## Border Radius` | Corner radius values in px | radii |
| `## Shadows` | Box shadow definitions (offset, blur, spread, color) | shadows |
| `## Components` | Component-level token compositions (optional) | composite |
| `## Dark Mode` | Dark mode color overrides (optional) | color |

## Token Format Examples

### Colors

```markdown
## Colors

- **primary**: `#2563EB` — Main brand color for buttons and links
- **secondary**: `#7C3AED` — Accent for highlights and badges
- **background**: `#FFFFFF` — Page and card backgrounds
- **surface**: `#F8FAFC` — Elevated surface backgrounds
- **error**: `#DC2626` — Destructive actions and error states
- **text-primary**: `#0F172A` — Headings and body text
- **text-secondary**: `#64748B` — Captions and muted text
- **accent**: `#F59E0B` — Attention-drawing elements
- **border**: `#E2E8F0` — Dividers and input borders
- **muted**: `#94A3B8` — Disabled and placeholder text
```

The parser extracts the bold name as the token key and the backtick-wrapped hex value as the token value. The description after the em dash is ignored during parsing but preserved for documentation generation.

### Typography

```markdown
## Typography

| Level | Size | Weight | Family | Line Height |
|-------|------|--------|--------|-------------|
| heading1 | 32px | bold | Inter | 1.2 |
| heading2 | 24px | semibold | Inter | 1.3 |
| heading3 | 20px | semibold | Inter | 1.3 |
| body | 16px | regular | Inter | 1.5 |
| caption | 13px | regular | Inter | 1.4 |
```

Typography can also appear as a list format:

```markdown
- **heading1**: 32px / bold / Inter / 1.2
- **body**: 16px / regular / Inter / 1.5
```

### Spacing

```markdown
## Spacing

- **xs**: `4px`
- **sm**: `8px`
- **md**: `16px`
- **lg**: `24px`
- **xl**: `32px`
- **xxl**: `48px`
```

### Border Radius

```markdown
## Border Radius

- **sm**: `4px`
- **md**: `8px`
- **lg**: `12px`
- **xl**: `16px`
- **full**: `9999px`
```

### Shadows

```markdown
## Shadows

- **sm**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **md**: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`
- **lg**: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)`
```

### Dark Mode (Optional)

```markdown
## Dark Mode

- **background**: `#0F172A`
- **surface**: `#1E293B`
- **text-primary**: `#F1F5F9`
- **text-secondary**: `#94A3B8`
- **border**: `#334155`
```

Only colors that differ from the light theme need to be listed. Unlisted colors inherit from the main `## Colors` section.

### Components (Optional)

```markdown
## Components

### Button
- background: primary
- text: #FFFFFF
- radius: md
- padding: sm md

### Card
- background: surface
- border: 1px solid border
- radius: lg
- padding: md
- shadow: sm
```

Component tokens reference other tokens by name (e.g., `primary`, `md`). The parser resolves these references during generation.

## Extending with Custom Sections

You can add custom sections using the `## Custom: SectionName` pattern:

```markdown
## Custom: Animations

- **duration-fast**: `150ms`
- **duration-normal**: `300ms`
- **duration-slow**: `500ms`
- **easing-default**: `cubic-bezier(0.4, 0, 0.2, 1)`
```

Custom sections are parsed into a `custom` key in the JSON output, keyed by the section name in lowercase.

## Complete DESIGN.md Example (~50 lines)

See `examples/DESIGN.md` for a full, realistic example with all sections populated.
