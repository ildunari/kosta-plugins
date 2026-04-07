# Morphing Guide

Liquid Glass is not static; surfaces can flex, stretch and merge in response to user interaction. SwiftUI exposes `glassEffectID(_:in:)` to coordinate these transitions. This guide explains how to create fluid morphing effects.

## The Basics

`glassEffectID` attaches a stable identifier to a view’s glass surface. When two views with the same ID appear in a transition (such as a `NavigationLink` push or a state change), SwiftUI interpolates between the shapes rather than cross‑fading them. The IDs must live inside the same namespace (`@Namespace`) for the framework to relate them.

```swift
@Namespace private var ns
@State private var expanded = false

var body: some View {
    GlassEffectContainer(spacing: 12) {
        if expanded {
            RoundedRectangle(cornerRadius: 16)
                .frame(height: 90)
                .glassEffect(.regular, in: .rect(cornerRadius: 16))
                .glassEffectID("card", in: ns)
        } else {
            HStack(spacing: 12) {
                Circle()
                    .frame(width: 48, height: 48)
                    .glassEffect(.regular, in: .circle)
                    .glassEffectID("card", in: ns)
                RoundedRectangle(cornerRadius: 12)
                    .frame(height: 48)
                    .glassEffect(.regular, in: .rect(cornerRadius: 12))
                    .glassEffectID("card", in: ns)
            }
        }
    }
}
```

## Guidelines

- **Use a container.** The surfaces you are morphing should live inside a `GlassEffectContainer`. Without grouping, SwiftUI cannot easily determine how the sampling regions should merge.
- **Consistency is key.** Use the same ID string for both the source and destination views. Assign the ID to the element you want to morph, not its container.
- **Keep the namespace alive.** Store your `@Namespace` on a long‑lived parent view. If the namespace goes out of scope, the system cannot correlate the surfaces.
- **Animate with springs.** Morphing transitions respond well to spring animations (`.spring(response:dampingFraction:)`) because they give the material weight. Avoid overly stiff or bouncy values.
- **Fallback gracefully.** On pre‑iOS 26 devices, where `glassEffectID` is unavailable, fallback to cross‑fading between two independent shapes or skip the morph entirely.

## Advanced Techniques

- **Multiple IDs.** You can assign different IDs to different parts of a container to orchestrate complex morphs. For example, a FAB (floating action button) that expands into a panel might use one ID for the background and another for the icon.
- **Matched transitions.** Combine `glassEffectID` with other matched‑geometry effects like `.matchedGeometryEffect(id:in:)` to align content while the surface morphs.
- **Morphing across navigation.** When pushing or popping a view in a `NavigationStack`, assign the same `glassEffectID` to surfaces in both the source and destination to get a morph instead of a fade.