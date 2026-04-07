# System Integration Guide

Liquid Glass is deeply integrated into iOS 26. Understanding how the system uses glass helps you avoid conflicts and embrace native behaviours.

## Bars and Toolbars

Navigation bars, toolbars and tab bars on iOS 26 use Liquid Glass automatically. You no longer need to apply `.background(.ultraThinMaterial)` or add custom blur views. The bar surfaces float above content and respond to scroll position via the system’s scroll‑edge effect. When adding buttons to these bars, use `.buttonStyle(.glass)` or `.glassProminent` to align with system styling. Avoid painting solid colours behind bars; this can break the scroll‑edge fade.

## Sheets and Popovers

Partial‑height sheets (e.g., `.medium` detent) are inset with a glass background by default. As the user drags the sheet to full height, the surface transitions to an opaque background anchored to the edges. Don’t add your own backgrounds inside a sheet—trust the system to manage the material. If you need additional layering inside a sheet, wrap controls in a `GlassEffectContainer` to group them.

## Tab Bars

iPhone tab bars can minimize on downward scroll, and accessories (e.g., Now Playing) can appear above them. The tab bar itself is a glass plane with rounded corners. Use a `GlassTabBar` or adopt the system tab bar by using `TabView` in SwiftUI and rely on the default styling.

## Clear vs Tinted Preference

The user can choose between **Clear** and **Tinted** glass in Settings: **Display & Brightness → Liquid Glass**. The clear option reduces opacity for a lighter look, whereas tinted increases opacity and adds a subtle scrim across surfaces. Apps adopting `glassEffect` inherit this preference automatically. Don’t hardcode opacity values based on assumptions about Light or Dark Mode.

## Accessibility & Motion

System accessibility settings such as **Reduce Transparency**, **Reduce Motion**, and **Increase Contrast** all affect Liquid Glass. When transparency is reduced, the system replaces bars and sheets with solid colours. Custom surfaces created with `glassEffect` should mirror this behaviour by switching to `Color` fills. When motion is reduced, disable bounce and flex animations on glass buttons.

## UIKit and AppKit

UIKit adds `UIGlassEffect` and `UIGlassContainerEffect` for embedding glass in `UIView` hierarchies. These classes manage tint, interactivity and materialize/dematerialize animations. On macOS 26, use `NSGlassEffectView` and `NSGlassEffectContainerView`. The system applies glass to window toolbars and sidebars automatically; avoid layering additional blur behind them.