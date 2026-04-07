# Liquid Glass Principles

This guide distills the core principles behind Apple’s Liquid Glass design language on iOS 26. Use these concepts to inform layout, grouping, motion and tint choices in your app.

## Goals

- **Preserve legibility** across vivid, dynamic backgrounds.
- **Communicate hierarchy** through glass style and elevation.
- **Unify surfaces** via grouping and morphing instead of stacking independent panes.
- **Keep motion purposeful** – flex and morph to signal state changes, not to decorate.

## Key Ideas

1. **Glass, not blur.** Liquid Glass is more than a blur pass; it bends, refracts and concentrates light. Use `glassEffect(_:in:)` rather than `Material` fills. Avoid layering multiple glass surfaces directly on top of each other.
2. **Styles convey hierarchy.** Use `.regular` for most surfaces, `.clear` for the lightest touch, and `.prominent` (via `tint(_:)`) for high‑contrast zones. Tints are semantic: reserve them for primary actions and legibility, not decoration.
3. **Group related elements.** Place adjacent glass elements into a `GlassEffectContainer`. Containers share a sampling region, unify tint, and allow surfaces to morph seamlessly when moving or merging. Without grouping, glass can sample itself, causing seams and performance hits.
4. **Coordinate transitions.** Attach a stable identifier with `glassEffectID(_:in:)` so SwiftUI can morph between shapes during navigation or state changes. Matching IDs across source and destination views produces a fluid transition rather than a dissolve.
5. **Trust vibrancy.** Use `.foregroundStyle(.primary)` and `.secondary` instead of hardcoded colours. Liquid Glass automatically adjusts contrast based on underlying content and system appearance.
6. **Respect system preferences.** Honour the user’s choice between **Clear** and **Tinted** glass (Settings → Display & Brightness → Liquid Glass) and accessibility options like **Reduce Transparency** and **Reduce Motion**. When transparency is reduced, swap glass surfaces for opaque fills.

## Grouping & Morphing Diagram

```
 GlassEffectContainer
 ├─ Glass Button A (id: "fab")
 └─ Glass Button B (id: "fab")

 Tap → morphs into

 GlassEffectContainer
 └─ Expanded Panel (id: "fab")
```

In this example both the compact buttons and the expanded panel use the same `glassEffectID` within a shared namespace. During the transition, SwiftUI morphs the surfaces rather than fading them. Grouping them inside a `GlassEffectContainer` ensures they sample the same content and merge gracefully as their spacing decreases.

## System Behaviour

On iOS 26, many system bars (navigation bars, toolbars, tab bars) automatically adopt Liquid Glass. Don’t paint extra backgrounds behind these controls—doing so can conflict with the system’s scroll‑edge effects. Partial‑height sheets also use glass by default; as a sheet expands to full screen, the background becomes opaque and anchors to the edges.

The system exposes a **Clear vs Tinted** preference. When the user chooses **Tinted**, glass surfaces across the OS become slightly more opaque to improve contrast. Apps that use official APIs inherit this preference automatically.

## Backwards Compatibility

For iOS 17–25, fall back to `.ultraThinMaterial` or `.thinMaterial` and add a subtle stroke to maintain definition. A helper like `glassOrMaterial(style:in:)` can encapsulate this fallback logic.