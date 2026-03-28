# SwiftUI Color Token Patterns

Two approaches to adaptive colors (light/dark mode) with complete implementation examples.

---

## Approach 1: Programmatic Color Init

Define colors directly in Swift. Best for small-to-medium projects or when you want everything in code.

### Colors.swift

```swift
import SwiftUI

enum DSColor {
    // MARK: - Backgrounds
    static let background = Color(light: .init(hex: "#FFFFFF"), dark: .init(hex: "#000000"))
    static let surface = Color(light: .init(hex: "#F8F9FA"), dark: .init(hex: "#1C1C1E"))
    static let surfaceSecondary = Color(light: .init(hex: "#F0F1F3"), dark: .init(hex: "#2C2C2E"))
    static let surfaceElevated = Color(light: .init(hex: "#FFFFFF"), dark: .init(hex: "#2C2C2E"))

    // MARK: - Text
    static let textPrimary = Color(light: .init(hex: "#1A1A1A"), dark: .init(hex: "#F5F5F5"))
    static let textSecondary = Color(light: .init(hex: "#6B7280"), dark: .init(hex: "#9CA3AF"))
    static let textTertiary = Color(light: .init(hex: "#9CA3AF"), dark: .init(hex: "#6B7280"))

    // MARK: - Brand
    static let accent = Color(light: .init(hex: "#3B82F6"), dark: .init(hex: "#60A5FA"))
    static let accentSubtle = Color(light: .init(hex: "#EFF6FF"), dark: .init(hex: "#1E3A5F"))

    // MARK: - Semantic
    static let success = Color(light: .init(hex: "#22C55E"), dark: .init(hex: "#4ADE80"))
    static let warning = Color(light: .init(hex: "#F59E0B"), dark: .init(hex: "#FBBF24"))
    static let error = Color(light: .init(hex: "#EF4444"), dark: .init(hex: "#F87171"))
    static let info = Color(light: .init(hex: "#3B82F6"), dark: .init(hex: "#60A5FA"))

    // MARK: - Borders & Dividers
    static let border = Color(light: .init(hex: "#E5E7EB"), dark: .init(hex: "#374151"))
    static let divider = Color(light: .init(hex: "#F3F4F6"), dark: .init(hex: "#1F2937"))
}
```

### Color Extension for Light/Dark Init

```swift
extension Color {
    init(light: Color, dark: Color) {
        self.init(uiColor: UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark
                ? UIColor(dark)
                : UIColor(light)
        })
    }
}
```

### Hex Color Extension

```swift
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)

        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}
```

---

## Approach 2: Asset Catalog Colors

Define colors in the Xcode asset catalog. Best for larger teams, Figma integration, or when designers manage colors.

### Setup Steps

1. Open `Assets.xcassets`
2. Right-click > New Color Set
3. Name it semantically: `surface`, `textPrimary`, `accent`, etc.
4. In the Attributes Inspector, set Appearances to "Any, Dark"
5. Set light color in "Any Appearance" and dark color in "Dark Appearance"
6. For high contrast: set Appearances to "Any, Dark" and check "High Contrast"

### Swift Wrapper

```swift
enum DSColor {
    static let background = Color("background")
    static let surface = Color("surface")
    static let surfaceSecondary = Color("surfaceSecondary")
    static let textPrimary = Color("textPrimary")
    static let textSecondary = Color("textSecondary")
    static let accent = Color("accent")
    static let success = Color("success")
    static let warning = Color("warning")
    static let error = Color("error")
    static let border = Color("border")
}
```

### Pros & Cons

| | Programmatic | Asset Catalog |
|---|---|---|
| Version control | Full diff visibility | Binary plist, harder to diff |
| Designer handoff | Manual sync | Figma plugins can export directly |
| High contrast | Extra `UIColor` init work | Built-in Appearances toggle |
| Build time | Slightly faster | Negligible difference |
| Discoverability | Search code | Visual preview in Xcode |

---

## High Contrast Variants

For accessibility, provide increased contrast versions.

### Programmatic Approach

```swift
extension Color {
    init(light: Color, dark: Color, lightHC: Color, darkHC: Color) {
        self.init(uiColor: UIColor { traitCollection in
            let isDark = traitCollection.userInterfaceStyle == .dark
            let isHC = traitCollection.accessibilityContrast == .high

            switch (isDark, isHC) {
            case (false, false): return UIColor(light)
            case (false, true): return UIColor(lightHC)
            case (true, false): return UIColor(dark)
            case (true, true): return UIColor(darkHC)
            }
        })
    }
}

// Usage:
// static let textSecondary = Color(
//     light: .init(hex: "#6B7280"),
//     dark: .init(hex: "#9CA3AF"),
//     lightHC: .init(hex: "#4B5563"),
//     darkHC: .init(hex: "#D1D5DB")
// )
```

---

## Complete Colors.swift (12 Semantic Colors)

```swift
import SwiftUI

/// Design system color tokens. All colors are adaptive (light/dark).
/// Usage: `Text("Hello").foregroundStyle(DSColor.textPrimary)`
enum DSColor {
    // 1. Background — full-screen canvas
    static let background = Color(light: .init(hex: "#FFFFFF"), dark: .init(hex: "#000000"))

    // 2. Surface — cards, sheets, grouped content areas
    static let surface = Color(light: .init(hex: "#F8F9FA"), dark: .init(hex: "#1C1C1E"))

    // 3. Surface Secondary — nested content, table cells, secondary panels
    static let surfaceSecondary = Color(light: .init(hex: "#F0F1F3"), dark: .init(hex: "#2C2C2E"))

    // 4. Text Primary — headings, body text, primary labels
    static let textPrimary = Color(light: .init(hex: "#1A1A1A"), dark: .init(hex: "#F5F5F5"))

    // 5. Text Secondary — subtitles, descriptions, metadata
    static let textSecondary = Color(light: .init(hex: "#6B7280"), dark: .init(hex: "#9CA3AF"))

    // 6. Text Tertiary — placeholders, disabled text, timestamps
    static let textTertiary = Color(light: .init(hex: "#9CA3AF"), dark: .init(hex: "#6B7280"))

    // 7. Accent — primary actions, links, active states
    static let accent = Color(light: .init(hex: "#3B82F6"), dark: .init(hex: "#60A5FA"))

    // 8. Success — confirmations, positive feedback, completed states
    static let success = Color(light: .init(hex: "#22C55E"), dark: .init(hex: "#4ADE80"))

    // 9. Warning — caution states, pending actions
    static let warning = Color(light: .init(hex: "#F59E0B"), dark: .init(hex: "#FBBF24"))

    // 10. Error — destructive actions, validation errors
    static let error = Color(light: .init(hex: "#EF4444"), dark: .init(hex: "#F87171"))

    // 11. Border — card borders, input outlines, separators
    static let border = Color(light: .init(hex: "#E5E7EB"), dark: .init(hex: "#374151"))

    // 12. Divider — section dividers, list separators
    static let divider = Color(light: .init(hex: "#F3F4F6"), dark: .init(hex: "#1F2937"))
}
```

---

## Environment-Based Theming (Advanced)

For apps that support multiple themes beyond light/dark:

```swift
struct Theme {
    let background: Color
    let surface: Color
    let textPrimary: Color
    let accent: Color
    // ... all tokens
}

extension Theme {
    static let standard = Theme(
        background: DSColor.background,
        surface: DSColor.surface,
        textPrimary: DSColor.textPrimary,
        accent: DSColor.accent
    )
}

private struct ThemeKey: EnvironmentKey {
    static let defaultValue = Theme.standard
}

extension EnvironmentValues {
    var theme: Theme {
        get { self[ThemeKey.self] }
        set { self[ThemeKey.self] = newValue }
    }
}

// Usage:
// @Environment(\.theme) private var theme
// Text("Hello").foregroundStyle(theme.textPrimary)
```
