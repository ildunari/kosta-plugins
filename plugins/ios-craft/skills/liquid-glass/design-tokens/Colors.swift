// Colors.swift — generated mapping for tokens
import SwiftUI

public struct LGTheme {
    public static func color(_ key: String, scheme: ColorScheme) -> Color {
        switch (key, scheme) {
        case ("bg.base", .light): return Color(red: 0.0431, green: 0.0431, blue: 0.0431)
        case ("bg.base", .dark): return Color(red: 0.0431, green: 0.0431, blue: 0.0431)
        case ("bg.elevated", .light): return Color(red: 0.0706, green: 0.0706, blue: 0.0706)
        case ("bg.elevated", .dark): return Color(red: 0.063, green: 0.063, blue: 0.063)
        case ("bg.scrim", .light): return Color.black.opacity(0.4)
        case ("bg.scrim", .dark): return Color.black.opacity(0.6)
        case ("fg.primary", .light): return .white
        case ("fg.primary", .dark): return .white
        case ("fg.secondary", .light): return Color.white.opacity(0.8)
        case ("fg.secondary", .dark): return Color.white.opacity(0.8)
        case ("fg.tertiary", .light): return Color.white.opacity(0.6)
        case ("fg.tertiary", .dark): return Color.white.opacity(0.6)
        case ("accent.primary", .light): return Color(red: 0.039, green: 0.518, blue: 1.0)
        case ("accent.primary", .dark): return Color(red: 0.039, green: 0.518, blue: 1.0)
        case ("accent.secondary", .light): return Color(red: 0.392, green: 0.824, blue: 1.0)
        case ("accent.secondary", .dark): return Color(red: 0.392, green: 0.824, blue: 1.0)
        case ("state.success", .light): return Color(red: 0.2039, green: 0.7804, blue: 0.3490)
        case ("state.success", .dark): return Color(red: 0.2039, green: 0.7804, blue: 0.3490)
        case ("state.warning", .light): return Color(red: 1.0, green: 0.839, blue: 0.039)
        case ("state.warning", .dark): return Color(red: 1.0, green: 0.839, blue: 0.039)
        case ("state.error", .light): return Color(red: 1.0, green: 0.2706, blue: 0.2275)
        case ("state.error", .dark): return Color(red: 1.0, green: 0.2706, blue: 0.2275)
        // Liquid Glass tint levels have been updated for iOS 26.
        // Clear retains maximum translucency; regular provides subtle contrast; prominent increases opacity for legibility.
        case ("glass.tint.clear", .light), ("glass.tint.clear", .dark):
            return Color.black.opacity(0.0)
        case ("glass.tint.regular", .light), ("glass.tint.light", .light):
            // Backwards compatibility: treat 'light' as 'regular'.
            return Color.black.opacity(0.08)
        case ("glass.tint.regular", .dark), ("glass.tint.light", .dark):
            return Color.white.opacity(0.10)
        case ("glass.tint.prominent", .light), ("glass.tint.dark", .light):
            // Backwards compatibility: treat 'dark' as 'prominent'.
            return Color.black.opacity(0.20)
        case ("glass.tint.prominent", .dark), ("glass.tint.dark", .dark):
            return Color.black.opacity(0.40)
        default: return .white
        }
    }
}
