# Migrating to Liquid Glass on iOS 26

iOS 26 introduces Liquid Glass, replacing the Material APIs used in earlier releases. Migrating your app involves more than a simple API swap—Liquid Glass has different design principles and system integrations. This guide outlines the steps to adopt the new APIs smoothly.

## Audit Your Surfaces

1. **Identify custom blur or glass implementations.** Remove any custom shaders or `UIBlurEffect` backgrounds that were used to approximate frosted glass.
2. **Remove redundant backgrounds.** Bars, toolbars, tab bars and sheets adopt Liquid Glass automatically. Delete any manual `.background(.ultraThinMaterial)` modifiers on these elements; otherwise you may conflict with the system scroll‑edge effect.
3. **Find grouped controls.** Locate clusters of buttons or panels that visually belong together. These should be grouped using `GlassEffectContainer` in SwiftUI or `UIGlassContainerEffect` in UIKit.

## Adopt `glassEffect`

- Replace `.fill(.thinMaterial)`, `.regularMaterial`, etc., with `glassEffect(_:in:)` on iOS 26.
- Choose a style based on hierarchy: `.clear` for light surfaces, `.regular` for standard panels, and `.regular.tint(...)` (prominent) for high‑contrast cards. You can also call `.interactive()` on a style to add subtle motion feedback.
- Provide a fallback for earlier OS versions. Use `.background(.ultraThinMaterial, in:)` and a light stroke for definition when `#available(iOS 26, *)` evaluates to false.

## Group & Morph

- Wrap neighbouring glass elements in `GlassEffectContainer` so they sample the same content and merge organically when spaced closely.
- Use `glassEffectID(_:in:)` along with a `@Namespace` to coordinate transitions between different states. Both the source and destination must assign the same ID within the same namespace.

## Honour System Preferences

- iOS 26 exposes a **Clear vs Tinted** setting in **Display & Brightness → Liquid Glass**. Apps that use official APIs pick up this preference automatically; do not hardcode opacity values based on your own assumptions.
- Respect **Reduce Transparency** by switching glass surfaces to solid fills; respect **Reduce Motion** by disabling bounce or flex animations on glass buttons.

## Test Thoroughly

- Test your app in Light and Dark Mode, as well as Clear and Tinted glass preferences.
- Exercise interactive states with VoiceOver and Dynamic Type enabled. Ensure controls remain reachable and readable.
- Profile with Instruments to verify that grouping has reduced sampling passes. Avoid large overlapping glass surfaces; break them into smaller groups or use solid backgrounds where appropriate.