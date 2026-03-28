---
name: ios-design-system
description: >
  Build a SwiftUI design system from scratch. Use when setting up colors, typography,
  spacing tokens, and a component library. Can extract tokens from Figma or screenshots.
  Produces Swift files for design tokens and reusable components with dark mode,
  Dynamic Type, and accessibility built in.
---

# iOS Design System

## Workflow

1. **Assess starting point** — Where are tokens coming from? Figma file (use Figma MCP)? Screenshot (use `visual-analyzer` skill)? Brand guidelines PDF? Or building from scratch with no existing design? This determines the first step.

2. **Color palette generation** — If starting from scratch, pick a primary brand color and derive a full palette: primary, secondary, accent, plus neutral grays. Generate 5-9 shades per hue (50-900 scale). If extracting from source, identify the exact colors used.

3. **Color tokens (adaptive light/dark)** — Define semantic color tokens that map to the palette: `background`, `surface`, `surfaceSecondary`, `textPrimary`, `textSecondary`, `textTertiary`, `border`, `divider`, `accent`, `success`, `warning`, `error`, `info`. Each token has light and dark variants. See `references/swiftui-color-tokens-patterns.md` for implementation patterns.

4. **Typography scale** — Define a type scale with semantic names: `largeTitle`, `title1`, `title2`, `title3`, `headline`, `body`, `callout`, `subheadline`, `footnote`, `caption1`, `caption2`. Map to system fonts or custom fonts with specific sizes, weights, and line heights. Ensure Dynamic Type support with `.font(.system(...))` or `@ScaledMetric`.

5. **Spacing scale** — Define a spacing scale based on a 4pt or 8pt grid: `xxxs` (2), `xxs` (4), `xs` (8), `sm` (12), `md` (16), `lg` (24), `xl` (32), `xxl` (48), `xxxl` (64). Implement as a `Spacing` enum with static properties.

6. **Corner radii and shadows** — Define corner radius tokens: `small` (4-6), `medium` (8-12), `large` (16-20), `full` (capsule). Define shadow tokens with semantic meaning: `subtle`, `medium`, `elevated`, `floating`. Each shadow has color, radius, x, y values for light and dark modes.

7. **Component library** — Build 5-8 starter components using the tokens. See `references/component-library-starter.md` for complete implementations. Every component must support: default/pressed/disabled states, dark mode, accessibility labels, Dynamic Type, and SwiftUI previews.

8. **SF Symbols guide** — Select appropriate SF Symbols for the component library. See `references/sf-symbols-cheatsheet.md` for top 50 symbols by category, rendering modes, and variable value usage.

9. **Preview showcase** — Create a `DesignSystemShowcase` view that displays all tokens and components in a scrollable catalog. This serves as living documentation.

10. **Integration instructions** — Provide clear guidance on: file organization (one file per concern or grouped?), how to import and use tokens in feature code, how to add new components following the same patterns, and how to keep tokens in sync with design tools.

## Reference Files

- `references/swiftui-color-tokens-patterns.md` — Adaptive color patterns with light/dark and high contrast
- `references/sf-symbols-cheatsheet.md` — Top 50 symbols, rendering modes, variable values
- `references/component-library-starter.md` — 8 complete components with states, dark mode, accessibility

## Cross-References

- `visual-analyzer` skill — extract design tokens from screenshots or mockups
- Figma MCP — pull tokens directly from Figma files
- `design-system-patterns` — general design system architecture patterns
