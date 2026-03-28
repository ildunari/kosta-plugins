---
name: design-audit
description: Review UI against design system, HIG, and accessibility standards
---

Perform a comprehensive design audit of the app's UI against the design system, Apple Human Interface Guidelines, and accessibility standards.

Scan the project and check each area:

1. **Design token usage** — Are colors, spacing, and typography coming from the design system or hardcoded? Find every hardcoded hex color, magic number spacing value, and inline font size. Replace them with design system tokens.

2. **Accessibility audit**:
   - Every interactive element has an accessibility label
   - Images have accessibility descriptions (or are marked as decorative)
   - Touch targets are at least 44x44 points
   - Color is never the only way to convey information
   - VoiceOver reads screens in a logical order
   - Dynamic Type is supported — text scales at every accessibility size without truncation or layout breakage

3. **Dark mode** — Every screen works in both light and dark mode. No white backgrounds in dark mode, no invisible text, no missing asset variants. Use semantic colors (like `.background`, `.label`, `.secondaryLabel`) instead of hardcoded values.

4. **Dynamic Type** — Increase the text size to the maximum accessibility size and check every screen. Text should wrap, not truncate. Layouts should adapt, not break.

5. **HIG compliance** — Navigation patterns match Apple conventions. Standard controls are used where appropriate (no custom back buttons that look different from system ones). Tab bar icons follow SF Symbol guidelines.

6. **Consistency** — Same spacing between similar elements across screens. Same button styles for same actions. Same error presentation pattern everywhere.

Report findings by severity: critical (accessibility failures, crashes), important (design system violations, HIG departures), and nice-to-have (polish items). Offer to fix each category.
