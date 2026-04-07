# Performance & Testing Tips

Liquid Glass is lightweight compared to previous material implementations, but there are still best practices to ensure smooth interactions:

- **Group surfaces.** Use `GlassEffectContainer` to group adjacent glass elements. Grouping reduces the number of sampling passes and allows surfaces to merge gracefully. Avoid multiple isolated glass islands when they could live in a single container.
- **Animate transforms, not the effect.** Instead of animating blur radius or opacity on the glass itself, animate position, scale or the assignment of the effect. The API is optimized for `effectView.effect` transitions (UIKit) and `glassEffectID` morphing (SwiftUI).
- **Limit redraw regions.** Keep glass surfaces as small as necessary; large fullscreen overlays or multiple overlapping panes can trigger offscreen rendering.
- **Test on device.** Simulator previews are useful for layout, but only hardware reveals the true cost of blur and morphing. Profile with Instruments, focusing on Core Animation and offscreen compositing.
- **Respect user preferences.** Honour **Reduce Transparency** by replacing glass with solid fills, and **Reduce Motion** by disabling bounce and flex animations. Verify readability under both **Clear** and **Tinted** system glass settings.
- **Cache heavy backgrounds.** If your design places glass over video or complex parallax layers, consider caching the underlying content into a static image while the glass is visible.