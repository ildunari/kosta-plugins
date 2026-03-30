---
name: stitch-convert
description: "This skill should be used when the user wants to convert Stitch HTML/CSS output to SwiftUI, React, or other framework code. It maps Tailwind classes and CSS properties to native framework equivalents using comprehensive mapping tables. Triggers: 'convert HTML to SwiftUI', 'translate Stitch output to code', 'implement a Stitch design', 'turn a screenshot into SwiftUI', 'convert to React'."
metadata:
  version: "1.0.0"
  author: stitch-studio
---

# Stitch Convert

You convert Stitch's HTML/CSS/Tailwind output into production-quality framework code, primarily SwiftUI. You use both the HTML structure and visual screenshots for accurate conversion.

### Conversion Pipeline

1. **Read inputs** -- HTML from Stitch (via MCP get_screen_code, file, or pasted), screenshot (via MCP get_screen_image or file)
2. **Analyze structure** -- identify the visual hierarchy from the HTML DOM
3. **Load DESIGN.md** -- if present, map hardcoded values to design tokens
4. **Map elements** -- use the conversion tables (references/tailwind-to-swiftui.md for Tailwind, references/css-to-swiftui.md for raw CSS)
5. **Generate code** -- produce SwiftUI (or target framework) following project conventions
6. **Verify** -- for Swift projects, run xcodebuild to confirm it compiles
7. **Review** -- compare generated code against the original screenshot, note any gaps

### SwiftUI Conversion Rules

- Use @Observable (not ObservableObject) for state
- LazyVStack/LazyHStack for scrollable lists
- AsyncImage for remote images, Image for local
- NavigationStack (not NavigationView)
- .task {} for async work (not .onAppear with Task {})
- Prefer system fonts (.title, .body, .caption) mapped from Tailwind text sizes
- Use design token references, not hardcoded values

### Conversion Accuracy

After generating SwiftUI:

1. Check for missing elements by comparing HTML element count vs SwiftUI view count
2. Verify color mapping -- every hex in HTML should map to a design token or explicit Color
3. Check spacing -- padding/margin values should use spacing tokens
4. Note any HTML patterns that don't have SwiftUI equivalents (add as comments)

### Multi-Framework Support

Primary: SwiftUI (Swift 6, iOS 17+)

Secondary (simpler conversion, less comprehensive):
- React (JSX + CSS modules)
- HTML (clean semantic HTML -- essentially reformatting Stitch output)

### Manual Mode (No MCP)

If no MCP, accept:
- Pasted HTML in a code block
- Screenshot file path
- Both (preferred for best accuracy)

### Anti-patterns

- Never generate SwiftUI without checking project conventions first
- Never ignore the screenshot -- HTML alone misses visual nuance
- Never output hardcoded colors/fonts when design tokens exist
- Never skip the build check for Swift projects
- Never convert pixel-perfect -- adapt to platform idioms (e.g., web horizontal scroll -> SwiftUI TabView or ScrollView(.horizontal))
