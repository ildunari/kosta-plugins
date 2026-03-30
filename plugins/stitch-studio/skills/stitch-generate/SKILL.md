---
name: stitch-generate
description: "This skill should be used when the user wants to generate UI screens from text descriptions using Google Stitch. It enhances prompts with project context, design tokens, and platform-specific conventions (iOS dimensions, safe areas, native controls). Triggers: 'design a screen', 'generate UI', 'create a mockup', 'prototype a layout', 'explore design variants', 'stitch me a'."
metadata:
  version: "1.0.0"
  author: stitch-studio
---

# Stitch Generate

## Role

You generate UI screens via Google Stitch, bridging the gap between rough ideas and production-quality design references. Your primary value is prompt enhancement -- turning vague requests into specific, platform-aware prompts that produce usable output on the first try.

## Prompt Enhancement Pipeline

This is the core workflow. Never send a raw user prompt to Stitch. Always enhance it first.

### Step 1: Detect Platform

Check the project for platform signals:
- `*.swift`, `project.yml`, `*.xcodeproj` --> iOS/iPadOS
- `package.json`, `*.tsx`, `*.vue` --> Web
- `AndroidManifest.xml`, `*.kt` --> Android
- If ambiguous, ask the user.

### Step 2: Load Design Tokens

Look for `DESIGN.md`, `Design/System/`, `tokens.json`, or equivalent in the project root. If found, extract:
- Color palette (primary, secondary, surface, text colors)
- Typography scale (font families, sizes, weights)
- Spacing values (padding, margins, gaps)
- Corner radii, elevation/shadow values

### Step 3: Enhance the Prompt

Build the enhanced prompt in this order:

1. **Design tokens prefix** (if DESIGN.md exists):
   `"Use these exact colors: [palette]. Fonts: [type scale]. Spacing: [values]."`

2. **User's intent** -- rewritten for specificity:
   - Replace "a dashboard" with "a data dashboard with 3 KPI cards, a line chart, and a data table"
   - Replace "a settings page" with "a grouped settings list with toggle switches, section headers, and footer text"
   - Replace "a chat screen" with "a messaging interface with message bubbles, timestamps, typing indicator, and a bottom composer bar"

3. **Platform suffix** -- appended automatically:
   - **iOS**: `"iOS mobile app, 390x844 viewport, bottom tab navigation, safe area insets, 44pt minimum touch targets, SF Pro font, native iOS controls (toggle switches, segmented controls), status bar visible, no hamburger menus"`
   - **iPad**: `"iPadOS tablet app, 1024x1366 viewport, sidebar navigation, multitasking-aware layout, larger touch targets"`
   - **Web**: `"Responsive web application, 1440px desktop viewport, top navigation bar, 8px grid system, system font stack"`

4. **Keep the enhanced prompt under 5,000 characters.**

### Step 4: Generate

If Stitch MCP is available:
- Use `create_screens` with the enhanced prompt
- Wait for generation to complete

If Stitch MCP is unavailable, switch to Manual Mode (see below).

### Step 5: Retrieve Artifacts

- `get_screen_image` -- capture the screenshot
- `get_screen_code` -- get the HTML/CSS/JS source

### Step 6: Save Artifacts

Store to the project's design directory:
```
Design/Prototyping/stitch-outputs/<YYYY-MM-DD>-<description>/
  prompt.md          # The enhanced prompt used
  screenshot.png     # Generated screenshot
  code.html          # Source code from Stitch
  notes.md           # Any observations or next steps
```

## Variant Exploration

When the user says "explore", "show me options", "try different styles", or similar:

1. Generate 2-3 prompt variations from the same base request:
   - Variation A: Clean/minimal aesthetic
   - Variation B: Rich/detailed with more visual hierarchy
   - Variation C: Bold/distinctive with stronger color usage
2. Present screenshots side by side with brief descriptions of each approach
3. Let user pick a winner, then offer refinement or conversion to production code

## Manual Mode (No MCP)

When Stitch MCP tools are not connected:

1. Output the fully enhanced prompt in a fenced code block for the user to paste into [stitch.withgoogle.com](https://stitch.withgoogle.com)
2. Tell the user: "Paste this into Stitch, then share the result back here (HTML code or screenshot)"
3. When user shares back:
   - Save artifacts to the standard output directory
   - Offer to convert the HTML to SwiftUI / React / production code
   - Suggest refinement prompts if the output needs adjustment

## Prompt Enhancement Rules

**Structure first, details second.** Start prompts with layout structure (grid, columns, sections), then describe individual components within each section.

**Specific content, not placeholders.** Use realistic data: "Revenue: $142,350" not "Lorem ipsum". Name real actions: "Add to Cart", "Share", "Mark Complete". Stitch produces better layouts when content length is realistic.

**Name components explicitly.** Say "data table with sortable column headers" not "a list of items". Say "segmented control with 3 segments: Day, Week, Month" not "some tabs". Say "circular progress indicator at 73%" not "a progress bar".

**One change per refinement.** When iterating on a generated screen, change ONE thing per prompt. Multiple changes cause Stitch to recreate the layout from scratch, losing what worked.

**Dark mode requires explicit colors.** Don't just say "dark mode". Say "dark background (#1C1C1E), light text (#FFFFFF primary, #8E8E93 secondary), darker card surfaces (#2C2C2E)".

**For iOS screens:** see `references/ios-prompting.md` for device dimensions, native patterns, and fill-in-the-blank templates.

## Anti-Patterns

- **Never send vague prompts.** "Make me a dashboard" will produce generic output. Always enhance first.
- **Never combine layout + component changes.** When refining, pick one. Layout changes and component changes in the same prompt cause full regeneration.
- **Never regenerate when 80% right.** Use `edit_screens` to refine specific elements instead of starting over.
- **Never ignore existing design tokens.** If the project has a DESIGN.md or token file, use those exact values. Consistency across screens matters more than any single screen looking good.
- **Never skip the save step.** Always persist the prompt, screenshot, and code. Future sessions need this context.
