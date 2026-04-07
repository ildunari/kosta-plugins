# Component Guidelines

This document explains the purpose of each component in this skill package and outlines their key parameters and behaviours. All SwiftUI examples assume an iOS 26 deployment target unless otherwise noted. Where possible, the components gracefully degrade on earlier OS versions.

## GlassCard

`GlassCard` presents content on a rounded glass surface. It exposes the following parameters:

- **variant** (`clear`, `tinted`, or `prominent`): controls the intensity of the glass style and whether a tint is applied. `clear` has minimal tint, `tinted` applies a subtle contrast scrim, and `prominent` uses a strong tint for maximum legibility.
- **cornerRadius** (`CGFloat`): determines the rounding of the card. Defaults to 20.
- **tintOpacity** (`Double`): adjusts the opacity of the tint when using the `tinted` or `prominent` variants. Recommended values range from 0.06–0.18 depending on the complexity of the backdrop. The component automatically chooses a dark or light base tint based on the environment colour scheme.

Use `.foregroundStyle(.primary)` and `.secondary` on text inside the card to leverage the material’s dynamic vibrancy. Avoid setting explicit colours.

On iOS 25 and earlier, `GlassCard` falls back to `.ultraThinMaterial` with a subtle stroke for definition.

## GlassButton

`GlassButton` wraps SwiftUI’s `.glass` and `.glassProminent` button styles and adds semantic meaning:

- **Kind**: `.primary` (prominent/tinted), `.secondary` (clear), or `.destructive` (tinted red). The button automatically chooses `.glassProminent` for primary and destructive actions.
- **Title**: passed via the initializer. Internally, the label uses a semibold font and appropriate padding. You can customise the content by composing your own `Button` and applying `.buttonStyle(.glass)` or `.glassProminent` directly.

All glass buttons respect the system’s pressed‑state scaling and spring animation. Use the `.tint(_:)` modifier to override the default accent colour for `.glassProminent` buttons.

## GlassSheet

`GlassSheet` is a convenience wrapper around `sheet(isPresented:)` that uses the system’s Liquid Glass presentation on iOS 26. You supply a binding that controls visibility, a set of detents (defaulting to `.medium` and `.large`), and a content builder. Inside the sheet, place your content on its own glass surface using a `GlassEffectContainer` if there are multiple controls. Avoid manually painting backgrounds—iOS manages the glass and morphing automatically.

On iOS 25 and earlier the sheet uses `.ultraThinMaterial` for its background.

## GlassTabBar

`GlassTabBar` constructs a floating tab bar from a list of items. Each item displays an SF Symbol and a title. The bar applies `glassEffect(.regular, in:)` to the container and uses `.glassProminent` for the selected tab and `.glass` for unselected tabs. You can bind the selected index via `@Binding`. Use `.accentColor` to control the tint of the selected tab.

## GlassToolbar

`GlassToolbarDemo` demonstrates how navigation and toolbars automatically adopt Liquid Glass on iOS 26. Place your buttons inside `ToolbarItemGroup` and apply `.buttonStyle(.glass)` or `.glassProminent` as appropriate. Do not add custom backgrounds—let the system supply the glass.

## GlassNavigation

`GlassNavigationDemo` shows navigation within a `NavigationStack`. The navigation bar automatically uses Liquid Glass, and buttons in the toolbar use `.glass` styles. The detail view includes a scrolling list of `GlassCard` elements to illustrate how content flows beneath the glass navigation bar.

## GlassEffectContainerExample

This example groups two glass buttons within a `GlassEffectContainer`. Grouping ensures that both buttons sample the same background, blend seamlessly, and can merge when moved closer together. Use the `spacing` parameter on the container to control when shapes start to fuse. On earlier OS versions the example falls back to two independent thin‑material buttons.

## GlassMorphingExample

`GlassMorphingExample` demonstrates how to morph between different glass shapes by assigning the same `glassEffectID` within a shared namespace. Tapping the button toggles between a compact arrangement (a circle and a rounded rectangle) and an expanded card. Because both states use the same ID, SwiftUI morphs the surfaces instead of fading them. On older systems, the example switches between the two shapes without morphing.

## UIKitGlassExamples

`UIKitGlassExamples` embeds UIKit glass effect views inside SwiftUI. The first subexample shows a single `UIGlassEffect` with a tint and a label placed on top. The second subexample demonstrates `UIGlassContainerEffect`, where two `UIVisualEffectView` instances share a sampling pass. Each subview includes an icon to illustrate vibrancy. These examples require iOS 26 or later; there is no fallback here—use the SwiftUI components for earlier OSes.

## Material & Vibrancy Examples

`MaterialVibrancyExamples` contrasts correct usage of dynamic foreground styles on glass (using `.foregroundStyle(.primary)`) with incorrect usage (hardcoded colours disable vibrancy). It also includes a UIKit equivalent using `UIGlassEffect` instead of `UIBlurEffect`.

## Accessibility & Preferences

`AccessibilityExamples` respects the **Reduce Transparency** accessibility setting. When enabled, the example replaces glass surfaces with opaque fills. It also reports the current **High Contrast** setting. All components in this skill honour system preferences for **Clear vs Tinted** glass and **Reduce Motion** (the latter disables bounce effects on interactive controls).