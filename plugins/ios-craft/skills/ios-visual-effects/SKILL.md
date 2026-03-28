---
name: ios-visual-effects
description: >
  Visual effects from SwiftUI modifiers through Metal shaders. Use when the user wants
  glassmorphism, neon glow, particles, gradient mesh, blur effects, or custom GPU shaders.
  Covers SwiftUI native effects, Liquid Glass, Canvas drawing, CAEmitterLayer particles,
  and introductory Metal shaders with a parameter playground.
---

# iOS Visual Effects

## Workflow

1. **What effect?** — Identify the visual effect the user wants. Categorize: blur/glass, glow/shadow, gradient, particle, shader, or composite.
2. **SwiftUI-native effects** — Start with built-in modifiers. `.blur(radius:)`, `.shadow(color:radius:x:y:)`, `LinearGradient`/`RadialGradient`/`AngularGradient`/`MeshGradient`, `.blendMode()`, `.visualEffect { content, proxy in }`. See `references/swiftui-visual-effects-catalog.md` for 20 complete examples.
3. **Liquid Glass (iOS 26+)** — Apple's system-level glass material. Use `.glassEffect()` modifier for frosted glass that refracts content beneath it. Pairs with `.containerBackground` for depth. Check deployment target before suggesting.
4. **Canvas for custom drawing** — `Canvas { context, size in }` for performant custom 2D drawing. Supports paths, images, text, filters, blending. 60fps capable. Good for generative backgrounds, custom charts, particle-like effects without UIKit.
5. **CAEmitterLayer particles** — For real particle systems (snow, confetti, fire, bubbles). Wrap in `UIViewRepresentable`. See `references/caemitter-recipes.md` for 5 complete recipes.
6. **Metal shaders** — iOS 17+ shader modifiers: `.colorEffect(ShaderLibrary.myShader())`, `.distortionEffect(ShaderLibrary.myShader())`, `.layerEffect(ShaderLibrary.myShader())`. See `references/metal-shader-starter.md` for 5 beginner shaders with line-by-line MSL comments.
7. **Shader playground with sliders** — Build interactive previews with slider-controlled shader parameters. Bind `@State` float values to shader uniforms for real-time tweaking.
8. **Performance** — Use `.drawingGroup()` to flatten complex view hierarchies into a single Metal texture. Avoid stacking multiple `.blur()` modifiers. Profile with Instruments > Core Animation and GPU counters.
9. **Composition** — Combine effects layering: background Canvas + foreground SwiftUI views + overlay particle emitters + blend modes. Use `.compositingGroup()` to control how effects interact.

## Reference Files

- `references/swiftui-visual-effects-catalog.md` — 20 visual effects with pure SwiftUI code
- `references/metal-shader-starter.md` — 5 beginner Metal shaders with MSL comments + SwiftUI integration
- `references/caemitter-recipes.md` — 5 particle system recipes with UIViewRepresentable wrappers

## Cross-References

- Liquid Glass skills — for iOS 26+ glass material deep-dives
- `uikit-bridge` skill — for wrapping UIKit visual layers in SwiftUI
- `ios-performance-beginner` skill — for profiling visual effect impact
