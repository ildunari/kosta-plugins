---
name: ios-accessibility-engineer
description: >
  Accessibility implementation and auditing. Use when adding VoiceOver support,
  Dynamic Type, accessibility labels, or auditing existing views. Walks through
  making an app usable for everyone.
---

# iOS Accessibility Engineering

Guide the user through making their app accessible to everyone, including people who use VoiceOver, have limited vision, motor impairments, or cognitive differences.

## Workflow

### 1. Why Accessibility Matters

Beyond being the right thing to do:
- **15-20% of people** have some form of disability
- Apple requires accessibility support in their Human Interface Guidelines
- Accessible apps tend to have better UX for everyone (larger tap targets, clearer hierarchy, better contrast)
- Government and enterprise contracts often require WCAG compliance
- VoiceOver users leave reviews — both good and bad

### 2. VoiceOver Basics

VoiceOver is iOS's built-in screen reader. It reads the screen aloud and lets users navigate by touch.

**How VoiceOver navigation works:**
- Swipe right: move to next element
- Swipe left: move to previous element
- Double-tap: activate the focused element
- Three-finger swipe: scroll

**Every interactive element needs three things:**

| Property | What VoiceOver reads | Example |
|----------|---------------------|---------|
| **Label** | The name of the element | "Profile photo" |
| **Value** | Current state (if applicable) | "Selected" or "50%" |
| **Hint** | What happens when activated | "Double tap to open profile" |

See `references/voiceover-guide.md` for the complete implementation guide.

### 3. Labels, Hints, and Traits

**SwiftUI:**

```swift
// Basic label
Image(systemName: "heart.fill")
    .accessibilityLabel("Favorite")

// Label + hint
Button("Buy") {
    purchase()
}
.accessibilityLabel("Buy \(item.name)")
.accessibilityHint("Double tap to add to cart")

// Custom value
Slider(value: $volume, in: 0...100)
    .accessibilityValue("\(Int(volume)) percent")

// Traits
Text("Welcome")
    .accessibilityAddTraits(.isHeader)

// Hide decorative elements
Image("decorative-line")
    .accessibilityHidden(true)
```

**UIKit:**

```swift
button.accessibilityLabel = "Favorite"
button.accessibilityHint = "Double tap to add to favorites"
button.accessibilityTraits = .button

// For images that convey information
imageView.isAccessibilityElement = true
imageView.accessibilityLabel = "Chart showing upward trend"

// For decorative images
decorativeView.isAccessibilityElement = false
```

**Common traits:**

| Trait | When to use |
|-------|-------------|
| `.button` | Tappable elements (applied automatically to Button) |
| `.isHeader` | Section headers (critical for navigation) |
| `.isSelected` | Currently selected item in a group |
| `.link` | Opens a URL or navigates away |
| `.image` | Non-decorative images |
| `.staticText` | Read-only text (default for Text/UILabel) |
| `.adjustable` | Sliders, steppers — swipe up/down to adjust |
| `.notEnabled` | Disabled controls |

### 4. Dynamic Type

Dynamic Type lets users choose their preferred text size. Your app should respect it.

**SwiftUI (works automatically with system fonts):**

```swift
// These automatically scale with Dynamic Type
Text("Hello")
    .font(.body)      // Scales

Text("Title")
    .font(.title)     // Scales

// Custom fonts need explicit scaling
Text("Custom")
    .font(.custom("Avenir", size: 16, relativeTo: .body))

// Fixed size (opt out — use sparingly)
Text("Badge")
    .font(.system(size: 12))
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)  // Cap maximum size
```

**UIKit:**

```swift
label.font = UIFont.preferredFont(forTextStyle: .body)
label.adjustsFontForContentSizeCategory = true

// Custom font with scaling
let customFont = UIFont(name: "Avenir", size: 16)!
label.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: customFont)
label.adjustsFontForContentSizeCategory = true
```

**Layout rules for Dynamic Type:**
- Use Auto Layout constraints that allow text containers to grow
- Never set fixed heights on labels
- Test with the largest accessibility size (Settings → Accessibility → Larger Text → max)
- Ensure nothing gets clipped or overlaps at large sizes

### 5. Color Contrast

Minimum contrast ratios (WCAG AA):
- **Normal text**: 4.5:1 contrast ratio
- **Large text** (18pt+ or 14pt+ bold): 3:1 contrast ratio
- **UI components** (buttons, icons): 3:1 contrast ratio

**Check contrast programmatically:**

```swift
extension UIColor {
    /// Returns the relative luminance of the color
    var luminance: CGFloat {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0
        getRed(&r, green(&g, blue: &b, alpha: nil)

        func adjust(_ c: CGFloat) -> CGFloat {
            c <= 0.03928 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
        }

        return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b)
    }

    /// Contrast ratio between two colors (1:1 to 21:1)
    func contrastRatio(with other: UIColor) -> CGFloat {
        let l1 = max(luminance, other.luminance)
        let l2 = min(luminance, other.luminance)
        return (l1 + 0.05) / (l2 + 0.05)
    }
}
```

**Support Increase Contrast setting:**

```swift
// Check if user has "Increase Contrast" enabled
if UIAccessibility.isDarkerSystemColorsEnabled {
    // Use higher contrast color variants
}

// SwiftUI
@Environment(\.colorSchemeContrast) var contrast
// contrast == .increased → use higher contrast colors
```

### 6. Reduced Motion

Some users experience motion sickness from animations. Respect their preference.

**SwiftUI:**

```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion

var body: some View {
    Circle()
        .animation(reduceMotion ? nil : .spring(), value: isExpanded)
}

// Or use the built-in modifier
Text("Hello")
    .transition(.opacity)  // Crossfade instead of slide when reduce motion is on
```

**UIKit:**

```swift
if UIAccessibility.isReduceMotionEnabled {
    // Use simple fade instead of complex animation
    UIView.animate(withDuration: 0.2) {
        view.alpha = 1
    }
} else {
    // Full spring animation
    UIView.animate(withDuration: 0.5, delay: 0, usingSpringWithDamping: 0.7, initialSpringVelocity: 0.5) {
        view.transform = .identity
    }
}
```

**Rules:**
- Replace sliding/bouncing with fades
- Remove parallax effects
- Disable auto-playing videos/animations
- Keep functional animations (progress bars, loading indicators) — just simplify them

### 7. Accessibility Containers

Group related elements so VoiceOver reads them as a unit:

**SwiftUI:**

```swift
// Group a card's elements into a single VoiceOver element
HStack {
    Image(item.icon)
    VStack(alignment: .leading) {
        Text(item.name)
        Text(item.price)
    }
}
.accessibilityElement(children: .combine)
// VoiceOver reads: "Coffee icon, Latte, $4.50"

// Or create a completely custom reading
HStack { ... }
    .accessibilityElement(children: .ignore)
    .accessibilityLabel("\(item.name), \(item.price)")
    .accessibilityAddTraits(.isButton)
    .accessibilityHint("Double tap to add to order")
```

**Custom navigation order:**

```swift
VStack {
    header
    content
    footer
}
.accessibilityElement(children: .contain)
.accessibilitySortPriority(1)  // Higher = read first
```

### 8. Accessibility Inspector

Xcode's Accessibility Inspector helps you audit your app without being a VoiceOver expert.

**How to open it:**
Xcode → Open Developer Tool → Accessibility Inspector

**Three key features:**

1. **Inspection mode** (crosshair icon): Hover over any element to see its accessibility properties (label, value, traits, frame)

2. **Audit** (triangle icon): Automatically scans the current screen for issues:
   - Missing labels
   - Insufficient contrast
   - Small touch targets
   - Missing traits

3. **Settings** (gear icon): Test accessibility settings without changing device settings:
   - Dynamic Type size
   - Reduce Motion
   - Increase Contrast
   - Bold Text

**Testing workflow:**
1. Run your app in Simulator
2. Open Accessibility Inspector
3. Click the Audit button on each screen
4. Fix all warnings
5. Use Inspection mode to verify custom elements read correctly
6. Test the full flow with VoiceOver on a physical device (Simulator VoiceOver is not reliable)

### 9. Audit Checklist

See `references/audit-checklist.md` for the complete 15-item audit checklist.

**Quick pre-release check:**
1. Turn on VoiceOver on a real device
2. Navigate through every screen using only swipe gestures
3. Can you complete every core user flow?
4. Does every element have a meaningful label?
5. Are headers marked as headers?
6. Does the app work at the largest Dynamic Type size?

## Common Mistakes

- Setting `accessibilityLabel` to the same text as a button's title — redundant, VoiceOver already reads button titles
- Using color alone to convey information (red = error, green = success) — add text or icons too
- Forgetting to mark decorative images as `accessibilityHidden(true)` — VoiceOver reads "Image" for unlabeled images
- Not testing with a real device — Simulator VoiceOver behavior differs from actual hardware
- Setting accessibility labels on container views instead of individual elements — makes navigation confusing
