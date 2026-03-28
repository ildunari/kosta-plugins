---
name: ios-animation-guide
description: >
  Hands-on animation workshop. Use when the user wants their app to feel alive —
  button feedback, screen transitions, loading states, scroll effects, hero transitions.
  Covers implicit/explicit animations, springs, transitions, matched geometry, phase/keyframe
  animators, gesture-driven animation, and Lottie integration.
---

# iOS Animation Guide

## Workflow

1. **Diagnose intent** — What does the user want to animate? Button tap, screen transition, loading state, scroll effect, hero transition, something custom?
2. **Basics: implicit `.animation`** — Start with the simplest approach. Apply `.animation(.easeInOut, value:)` to a state change. Explain that SwiftUI watches the value and interpolates any changed properties.
3. **Spring physics** — Graduate to `.spring(response:dampingFraction:)` for natural feel. Refer to `references/spring-physics-visual-guide.md` for parameter combos. Default recommendation: `response: 0.5, dampingFraction: 0.7` (snappy without bounce).
4. **Explicit `withAnimation`** — When multiple views must animate together or different properties need different curves. Wrap state mutations in `withAnimation(.spring) { ... }`.
5. **Transitions** — `.transition(.slide)`, `.transition(.scale)`, `.transition(.asymmetric(...))` for insert/remove animations. Combine with `if`/`switch` and `withAnimation`.
6. **Matched geometry effect** — `@Namespace` + `.matchedGeometryEffect(id:in:)` for hero transitions between views. Warn: both source and destination must exist momentarily; use `if/else` not two `if` blocks.
7. **Navigation transitions (iOS 18+)** — `.navigationTransition(.zoom(sourceID:in:))` and `.matchedTransitionSource(id:in:)` for zoom transitions in `NavigationStack`.
8. **Scroll effects** — `.scrollTransition { content, phase in ... }` (iOS 17+) for parallax, scale, and opacity effects tied to scroll position.
9. **Gesture-driven animation** — Combine `DragGesture` with `.offset` and spring animation on `.onEnded` for swipe-to-dismiss, card stacks, pull-to-action.
10. **Phase animator (iOS 17+)** — `PhaseAnimator` for multi-step sequential animations (pulse, shake, bounce sequences). Each phase triggers the next automatically.
11. **Keyframe animator (iOS 17+)** — `KeyframeAnimator` for precise timeline control. Define keyframe tracks for each property (scale, rotation, offset) with exact timing.
12. **Lottie integration** — See `references/lottie-swiftui-integration.md` for adding complex vector animations from After Effects via lottie-ios SPM package.
13. **Loading states toolkit** — Skeleton shimmers, pulsing placeholders, spinner alternatives. Use `.redacted(reason: .placeholder)` with shimmer overlay for skeleton screens.
14. **Performance warnings** — Avoid animating `.frame` changes (triggers layout passes). Prefer `.scaleEffect`, `.offset`, `.opacity`, `.rotationEffect` — these are GPU-composited. Use `.drawingGroup()` for complex view hierarchies. Profile with Instruments > Core Animation.

## Reference Files

- `references/animation-recipes.md` — 20 copy-paste recipes organized by use case
- `references/spring-physics-visual-guide.md` — Spring parameter combos with feel descriptions
- `references/lottie-swiftui-integration.md` — Step-by-step Lottie setup for SwiftUI

## Cross-References

- `apple-swiftui-mastery` skill — animation sections for deeper theory
- SwiftUI expert skill — animation reference material
