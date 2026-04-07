# Accessibility Checklist – Liquid Glass

Use this checklist to ensure your Liquid Glass interfaces are inclusive and respect user preferences. Complete these checks in all app states and with a variety of backdrops.

- [ ] **Contrast:** Body text meets a minimum 4.5 : 1 contrast ratio, large text meets 3 : 1. Test against both light and dark wallpapers.
- [ ] **Vibrancy:** All text and icons use dynamic foreground styles (`.primary`, `.secondary`, etc.) rather than hard‑coded colours. Verify that vibrancy works on tinted glass.
- [ ] **Reduce Transparency:** When enabled (Settings → Accessibility → Display & Text Size), glass surfaces switch to opaque fills and remain legible. Ensure the alternative colours meet contrast requirements.
- [ ] **Clear vs Tinted:** Honor the system Liquid Glass preference (Settings → Display & Brightness → Liquid Glass). Surfaces should automatically adjust opacity. Do not force a tint when the user has chosen Clear.
- [ ] **Increase Contrast:** Confirm that `.primary` and `.secondary` styles respond to the **Increase Contrast** setting by boosting contrast appropriately.
- [ ] **Reduce Motion:** Provide static or subtle animations when **Reduce Motion** is enabled. Disable bounce and flex animations on glass buttons and morphing transitions.
- [ ] **Dynamic Type:** Verify layouts at all Dynamic Type sizes from XS through XXXL. Glass surfaces should expand or reflow to accommodate larger text without clipping.
- [ ] **Touch Targets:** Ensure all interactive elements on glass surfaces have hit areas of at least 44×44 pt and that transparency does not impede hit testing.
- [ ] **Haptics:** Use haptic feedback sparingly and only for meaningful interactions (e.g., pressing a prominent glass button) rather than every tap.
- [ ] **Grouping & Morphing:** When using `GlassEffectContainer` and `glassEffectID`, verify transitions are smooth and do not cause confusion. Provide alternate presentations (e.g., simple fades) on earlier OS versions or when motion is reduced.
