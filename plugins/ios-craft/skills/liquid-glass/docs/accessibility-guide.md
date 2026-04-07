# Accessibility Guide

Liquid Glass surfaces must remain legible and usable for everyone. Follow these guidelines to support users with diverse accessibility needs.

## Respect Platform Settings

- **Reduce Transparency**: when enabled (Settings → Accessibility → Display & Text Size), replace glass surfaces with opaque fills. Use a dark or light solid colour that matches your app’s theme and maintain a minimum 4.5:1 contrast ratio for body text.
- **Increase Contrast**: adopt the system’s dynamic colours; avoid hardcoded tints. `Color.primary` and `.secondary` automatically adjust contrast on glass.
- **Reduce Motion**: disable springy flex and bounce animations. Prefer simple fades or static state changes when this setting is on (Settings → Accessibility → Motion).
- **Clear vs Tinted**: honour the system Liquid Glass preference (Settings → Display & Brightness → Liquid Glass). When **Tinted** is selected, glass surfaces should be slightly more opaque to improve contrast. Apps that use `glassEffect` adopt this automatically.
- **Dynamic Type**: use `@ScaledMetric` or `.font(.footnote)` with built‑in styles. Glass surfaces should expand or contract to accommodate larger fonts.

## Contrast & Vibrancy

- Use hierarchical foreground styles (`.primary`, `.secondary`, `.tertiary`) to let the system apply the correct contrast on glass. Avoid specifying custom colours on text unless you also adjust contrast manually.
- When text sits on a tinted glass surface, verify that both dark and light wallpapers meet accessibility targets. Increase the tint opacity (use the `prominent` style) if necessary.
- Provide descriptive accessibility labels for icons placed on glass buttons. VoiceOver should convey the button’s purpose, not just its icon name.

## Touch Targets

- Maintain a minimum touch area of 44×44 pt for tappable elements. Glass buttons in this skill meet this requirement via built‑in padding.

## Testing Checklist

Use the `accessibility_checker.py` script (provided in `scripts/`) to scan your views. Additionally, manually verify:

- Legibility on vivid wallpapers, photos and video backdrops.
- Behaviour under **Light** and **Dark** appearance.
- **Clear** versus **Tinted** system glass preferences.
- States of **Reduce Transparency**, **Increase Contrast**, and **Reduce Motion**.
- Dynamic Type sizes from XS to XXXL.