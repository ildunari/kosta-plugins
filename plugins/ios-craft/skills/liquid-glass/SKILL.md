---
name: Liquid Glass
description: >
  THE comprehensive skill for Apple's Liquid Glass design language introduced in iOS 26+,
  macOS 26+, tvOS 26+, and watchOS 26+. Use this skill whenever the user wants to adopt,
  implement, review, improve, or migrate to Liquid Glass in a SwiftUI, UIKit, or AppKit project.
  Triggers on: Liquid Glass, glassEffect, GlassEffectContainer, glassEffectID, glass button styles,
  glass morphing, iOS 26 design, iOS 26 UI, macOS 26 design, translucency, glass effects,
  material design iOS 26, UIGlassEffect, NSGlassEffectView, Reduce Transparency, glass surfaces,
  glass cards, glass buttons, glass sheets, glass tab bars, glass toolbars, WWDC 2025 design,
  Apple glass design language, or any request to make an app look like iOS 26. Use even when the
  user doesn't say "Liquid Glass" but is clearly asking about the new Apple design style or
  iOS 26 visual design patterns. Only adopt Liquid Glass when explicitly requested — do not
  proactively convert existing UI. Supersedes apple-ios-liquid-glass-ux, apple-liquid-glass-ux,
  and swiftui-liquid-glass. Do not use for general Apple UI work that is not specifically about
  Liquid Glass.
tags: [liquid-glass, ios26, macos26, swiftui, uikit, appkit, design-system, accessibility, animations, translucency, glass]
---

<!-- Merged from: apple-ios-liquid-glass-ux, apple-liquid-glass-ux, swiftui-liquid-glass (2026-03-30). Source directories archived 2026-04-01. -->

# Liquid Glass

The complete skill for Apple's Liquid Glass design language on iOS 26+, macOS 26+, tvOS 26+, and watchOS 26+. Covers UX principles, SwiftUI/UIKit/AppKit APIs, design tokens, accessibility, morphing transitions, and migration from older Materials.

**Important:** Only adopt Liquid Glass when the user explicitly requests it. Do not proactively convert existing `Material`-based UI to glass effects.

## Workflow Decision Tree

Choose the path matching the request:

### 1) Review an existing feature
- Inspect where Liquid Glass should and should not be used
- Verify correct modifier order, shape usage, and container placement
- Check `#available(iOS 26, *)` handling and sensible fallbacks
- Run through the Review Checklist below

### 2) Improve a feature using Liquid Glass
- Identify target components for glass treatment (surfaces, chips, buttons, cards)
- Refactor to use `GlassEffectContainer` where multiple glass elements coexist
- Introduce `.interactive()` only for tappable or focusable elements
- Apply the accessibility preferences handling

### 3) Implement a new feature using Liquid Glass
- Design glass surfaces and interactions first (shape, prominence, grouping)
- Add glass modifiers after layout and appearance modifiers
- Add morphing transitions only when the view hierarchy changes with animation

### 4) Migrate from older iOS (Material → Liquid Glass)
1. **Audit and purge** — remove old `Material` fills (`.thinMaterial`, `.regularMaterial`) and custom blur shaders; eliminate redundant backgrounds on bars and sheets
2. **Adopt `glassEffect`** — replace material fills; choose style (`.clear`, `.regular`, `.regular.tint`)
3. **Coordinate morphs** — use `glassEffectID` with a shared namespace; without IDs SwiftUI fades instead of morphing
4. **Fallback gracefully** — guard with `if #available(iOS 26, macOS 26, *)` and provide `.ultraThinMaterial` for older OS
5. **Respect preferences** — handle Reduce Transparency, Increase Contrast, Reduce Motion, Clear vs Tinted, Dynamic Type
6. **Platform-specific** — on macOS migrate `NSVisualEffectView` → `NSGlassEffectView`; on iOS migrate `UIVisualEffectView` → `UIGlassEffect`

For a detailed migration plan: `docs/ios26-migration.md` and `docs/macos26-migration.md`.

---

## Design Principles

1. **Hierarchy via style** — Express elevation: `.clear` for light surfaces, `.regular` for standard panels, `.regular.tint(...)` (prominent) for high-contrast zones. Reserve tints for meaning (primary CTA, destructive actions).
2. **Group related elements** — Wrap adjacent glass elements in `GlassEffectContainer` to unify sampling and tint. Grouping reduces performance overhead and enables surfaces to merge gracefully.
3. **Coordinate transitions** — Use `glassEffectID` with a shared `@Namespace` to morph surfaces during navigation or state changes. Without IDs, SwiftUI fades surfaces.
4. **Vibrancy through dynamic colours** — Use `.foregroundStyle(.primary, .secondary, .tertiary)` so the system adjusts contrast on glass. Avoid hardcoded colours.
5. **Motion for meaning** — Animate with springs. Keep micro-interactions subtle (< 250 ms). Disable flex/bounce when Reduce Motion is on.
6. **Accessibility by design** — Honour Reduce Transparency, Increase Contrast, Reduce Motion, Clear vs Tinted preferences, and Dynamic Type. See `accessibility/checklist.md`.

## When to Use (and When Not to Use) Liquid Glass

**Good fit:** navigation bars, toolbars, tab bars, cards, panels, sheets — anywhere you want to separate foreground content from rich or dynamic backdrops while keeping context visible.

**Avoid:** long-form text, dense tables, and anywhere readability is paramount. Always replace glass with opaque fills when Reduce Transparency is enabled.

---

## API Quick Reference

### SwiftUI APIs (Cross-Platform: iOS 26+, macOS 26+, tvOS 26+, watchOS 26+)

| API | Purpose | Notes |
|-----|---------|-------|
| `glassEffect(_ style: Glass = .regular, in shape: some InsettableShape)` | Apply Liquid Glass with a style (`.clear`, `.regular`, `.regular.tint(color)`) and shape | Replaces `.fill(.thinMaterial)` and Material fills |
| `GlassEffectContainer(spacing:)` | Group glass elements to share a sampling region, unify tint, and morph when spacing collapses | Use `spacing` to control merge distance |
| `glassEffectID(_ id: some Hashable, in namespace: Namespace.ID)` | Tag a surface for coordinated morphing across views or states | Source and destination must share the same ID and namespace |
| `.buttonStyle(.glass)` / `.buttonStyle(.glassProminent)` | Glass-aware button styles; prominent adds a tint for higher contrast | Use `.tint(_:)` to override accent colour |
| `ConcentricRectangle` | Shape that creates concentric rounded rectangles matching container curvature | For controls nested inside panels |
| `backgroundExtensionEffect()` | Extends content appearance under sidebars/inspectors | iOS 26+, macOS 26+ |
| `safeAreaBar(edge:alignment:spacing:content:)` | Register custom bars to use scroll-edge effects | iOS 26+, macOS 26+ |

### UIKit APIs (iOS/iPadOS 26+)

| API | Purpose |
|-----|---------|
| `UIGlassEffect(style:)` | Add Liquid Glass to `UIView`; set `tintColor` or `isInteractive` |
| `UIGlassContainerEffect()` | Group UIKit glass views to unify sampling and merge surfaces |
| `UIButton.Configuration.glass()` | Standard glass button for UIKit |
| `UIButton.Configuration.prominentGlass()` | High-contrast glass button variant |
| `UIBackgroundExtensionView` | Extends backgrounds under sidebars |

### AppKit APIs (macOS 26+)

| API | Purpose |
|-----|---------|
| `NSGlassEffectView` | `NSView` subclass for native macOS Liquid Glass |
| `NSBackgroundExtensionView` | Extends backgrounds under sidebars and inspectors |
| `NSButton.BezelStyle.glass` | Glass button style for AppKit |

### Backwards Compatibility

For iOS 17–25 and macOS 14–15, fall back to `.ultraThinMaterial` or `.thinMaterial` with a light stroke:

```swift
extension View {
    func glassOrMaterial(
        style: Glass = .regular,
        shape: some InsettableShape = RoundedRectangle(cornerRadius: 12)
    ) -> some View {
        if #available(iOS 26, macOS 26, *) {
            self.glassEffect(style, in: shape)
        } else {
            self
                .background(.ultraThinMaterial, in: shape)
                .overlay {
                    shape.strokeBorder(.white.opacity(0.2), lineWidth: 0.5)
                }
        }
    }
}
```

---

## Core Guidelines

- Prefer native Liquid Glass APIs over custom blurs
- Use `GlassEffectContainer` when multiple glass elements coexist on the same surface
- Apply `.glassEffect(...)` **after** layout and visual modifiers
- Use `.interactive()` only for elements that respond to touch/pointer
- Keep shapes consistent across related elements for a cohesive look
- Always gate with `#available(iOS 26, *)` and provide a non-glass fallback

---

## Quick Code Snippets

### Basic glass surface with fallback

```swift
if #available(iOS 26, *) {
    Text("Hello")
        .padding()
        .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 16))
} else {
    Text("Hello")
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
}
```

### Grouped glass elements (GlassEffectContainer)

```swift
GlassEffectContainer(spacing: 24) {
    HStack(spacing: 24) {
        Image(systemName: "scribble.variable")
            .frame(width: 72, height: 72)
            .font(.system(size: 32))
            .glassEffect()
        Image(systemName: "eraser.fill")
            .frame(width: 72, height: 72)
            .font(.system(size: 32))
            .glassEffect()
    }
}
```

### Prominent glass button

```swift
Button("Confirm") { }
    .buttonStyle(.glassProminent)
```

### Morphing transition with glassEffectID

```swift
@Namespace private var glassNamespace
@State private var isExpanded = false

// Compact state
if !isExpanded {
    Text("Tap to expand")
        .padding()
        .glassEffect()
        .glassEffectID("panel", in: glassNamespace)
} else {
    VStack { /* expanded content */ }
        .padding()
        .glassEffect()
        .glassEffectID("panel", in: glassNamespace)
}
```

### Cross-platform panel

```swift
struct GlassPanelView: View {
    var body: some View {
        if #available(iOS 26, macOS 26, *) {
            content
                .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        } else {
            content
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(.white.opacity(0.2), lineWidth: 0.5)
                }
        }
    }
    var content: some View {
        VStack {
            Text("Cross-Platform Glass").font(.headline)
            Text("Works on iOS, macOS, tvOS, and watchOS").font(.caption).foregroundStyle(.secondary)
        }
        .padding()
    }
}
```

---

## Review Checklist

- **Availability:** `#available(iOS 26, *)` present with fallback UI
- **Composition:** Multiple glass views wrapped in `GlassEffectContainer`
- **Modifier order:** `glassEffect` applied after layout/appearance modifiers
- **Interactivity:** `.interactive()` only where user interaction exists
- **Transitions:** `glassEffectID` used with `@Namespace` for morphing
- **Consistency:** Shapes, tinting, and spacing aligned across the feature
- **Accessibility:** Reduce Transparency handled; no hardcoded colours on glass

## Implementation Checklist

- [ ] Define target elements and desired glass prominence (`.clear`, `.regular`, or prominent/tinted)
- [ ] Wrap grouped glass elements in `GlassEffectContainer` and tune spacing
- [ ] Use `.glassEffect(.regular.tint(...).interactive(), in: .rect(cornerRadius: ...))` as needed
- [ ] Use `.buttonStyle(.glass)` / `.buttonStyle(.glassProminent)` for action buttons
- [ ] Add morphing transitions with `glassEffectID` when view hierarchy changes
- [ ] Provide fallback materials/visuals for iOS 17–25 / macOS 14–15
- [ ] Run accessibility checklist (`accessibility/checklist.md`)

---

## Platform-Specific Guidance

### iOS/iPadOS

- Tab bars, navigation bars, and toolbars automatically adopt glass — avoid painting custom backgrounds behind them
- Half sheets are inset to show content beneath; use `GlassEffectContainer` to group controls in sheets
- Search fields in toolbars adopt glass; use semantic search tab role for separate search tabs
- Use `.buttonStyle(.glass)` for toolbar and bar buttons

### macOS

- Windows adopt rounder corners automatically; glass integrates with standard window controls
- Use `NavigationSplitView` and `inspector(isPresented:content:)` for glass sidebars and inspectors
- `backgroundExtensionEffect()` creates seamless edge-to-edge content in split views
- Use `NSGlassEffectView` for direct AppKit integration (see components below)

```swift
class GlassViewController: NSViewController {
    override func loadView() {
        let glassView = NSGlassEffectView(frame: NSRect(x: 0, y: 0, width: 300, height: 400))
        self.view = glassView
        let label = NSTextField(labelWithString: "macOS Glass Surface")
        glassView.addSubview(label)
    }
}
```

### tvOS

- Glass activates when elements gain focus; use `.focusable()` for custom controls
- Standard buttons automatically adopt glass on focus
- Requires Apple TV 4K (2nd generation) or newer

```swift
Button("Action") { }
    .buttonStyle(.glass)
    .focusable()
```

### watchOS

- Glass limited to system controls; most glass effects are automatic via system
- Focus on accessibility over decoration

---

## System Integration Notes

**iOS 26:** Avoid painting custom backgrounds behind system bars (nav bar, tab bar, toolbar) — conflicts with the system's scroll-edge effect. The system's Clear vs Tinted preference adjusts glass opacity OS-wide.

**macOS 26:** Use standard system APIs (`NavigationSplitView`, `NSSplitViewController`) for automatic glass integration. The system manages window control (traffic lights) positioning over glass surfaces.

**tvOS 26:** Standard focus APIs give glass effects automatically on focus.

**watchOS 26:** Standard system components deliver glass automatically.

More details: `docs/system-integration.md`

---

## Components Available

### SwiftUI Components (Cross-Platform)
- **GlassCard** — flexible card with `.clear`, `.tinted`, and `.prominent` variants
- **GlassButton** — semantic buttons using `.glass`/`.glassProminent`; kinds map to tints
- **GlassSheet** — `sheet(isPresented:)` wrapper with system Liquid Glass background
- **GlassTabBar** — floating tab bar with glass background and glass-styled buttons
- **GlassToolbarDemo** — navigation/toolbar adopting glass automatically
- **GlassNavigationDemo** — `NavigationStack` with glass navigation bar
- **GlassEffectContainerExample** — unified sampling/merging demonstration
- **GlassMorphingExample** — morphing between compact and expanded surfaces via `glassEffectID`
- **MaterialVibrancyExamples** — correct vs incorrect foreground styles on glass
- **AccessibilityExamples** — Reduce Transparency handling

### UIKit Components (iOS/iPadOS)
- **UIKitGlassExamples** — `UIGlassEffect` and `UIGlassContainerEffect` embedded in SwiftUI
- **UIKitGlassButton** — `UIButton.Configuration.glass()` and `.prominentGlass()`
- **UIKitBackgroundExtension** — `UIBackgroundExtensionView` for sidebar extension

### AppKit Components (macOS)
- **NSGlassEffectViewExample** — AppKit glass in macOS apps
- **SidebarGlassExample** — macOS sidebar with glass in `NSSplitViewController`
- **InspectorGlassExample** — inspector panel with `NSGlassEffectView`
- **WindowChromeExample** — glass titlebar with automatic traffic light positioning
- **BackgroundExtensionExample** — content extending under glass sidebars
- **AppKitGlassButton** — `NSButton.BezelStyle.glass`

Component source files live in `components/`. Demo app in `examples/DemoApp/`.

---

## Reference Files

| Path | Contents |
|------|----------|
| `references/liquid-glass.md` | Full API reference with code examples and checklist |
| `docs/liquid-glass-principles.md` | Design philosophy and when/why to use glass |
| `docs/component-guidelines.md` | Component-specific usage guidance |
| `docs/ios26-migration.md` | Step-by-step migration from iOS 25 and earlier |
| `docs/macos26-migration.md` | Step-by-step migration on macOS |
| `docs/accessibility-guide.md` | Accessibility implementation details |
| `docs/dark-mode-patterns.md` | Dark mode / light adaptation patterns |
| `docs/morphing-guide.md` | `glassEffectID` morphing deep-dive |
| `docs/system-integration.md` | System bar and chrome integration |
| `docs/performance-tips.md` | Performance optimization for glass effects |
| `accessibility/checklist.md` | Comprehensive accessibility verification checklist |
| `design-tokens/colors.json` | Semantic colour token definitions |
| `design-tokens/spacing.json` | Spacing scale tokens |
| `design-tokens/animations.json` | Animation preset tokens |
| `design-tokens/Colors.swift` | Swift type-safe colour token definitions |

### Further Reading (WWDC 2025)
- **Session 219 – Meet Liquid Glass:** Introduction, physics, and high-level guidelines
- **Session 323 – Build a SwiftUI app with the new design:** SwiftUI APIs and migration strategies
- **Session 284 – Build a UIKit app with the new design:** `UIGlassEffect` and UIKit integration
- **Session 310 – Build an AppKit app with the new design:** `NSGlassEffectView` and macOS patterns

Official docs:
- [Adopting Liquid Glass (developer.apple.com)](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
- [Applying Liquid Glass to custom views (Tutorial)](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
- [Materials – Human Interface Guidelines](https://developer.apple.com/design/Human-Interface-Guidelines/materials)
