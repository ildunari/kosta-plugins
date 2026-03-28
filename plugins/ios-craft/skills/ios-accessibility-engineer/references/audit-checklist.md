# Accessibility Audit Checklist

15-item audit with pass/fail criteria and fix patterns. Test every screen in your app against this list.

## How to Use

For each item, test the criteria. If it fails, apply the fix. Mark pass/fail per screen.

---

### 1. Every Interactive Element Has a Label

**Test:** Turn on VoiceOver, swipe through every element. Does VoiceOver say something meaningful for each button, link, and control?

**Pass criteria:** Every interactive element announces a clear, descriptive label. No "Button", "Image", or silence.

**Fail patterns and fixes:**

| VoiceOver reads | Fix |
|----------------|-----|
| "Button" | Add `.accessibilityLabel("Descriptive name")` |
| "Image" | Add label or `.accessibilityHidden(true)` if decorative |
| Nothing (element skipped) | Set `isAccessibilityElement = true` |
| Icon name ("chevron.right") | Replace with meaningful label ("Show details") |

---

### 2. Decorative Elements Are Hidden

**Test:** Swipe through the screen. Are you stopped on decorative dividers, background images, or ornamental icons?

**Pass criteria:** VoiceOver skips all non-informative elements.

**Fix:**
```swift
// SwiftUI
Image("decorative-line").accessibilityHidden(true)
// UIKit
decorativeView.isAccessibilityElement = false
```

---

### 3. Headers Are Marked as Headers

**Test:** Use VoiceOver's rotor (two-finger twist) and select "Headings". Swipe up/down. Can you navigate between sections?

**Pass criteria:** All section titles are reachable via the Headings rotor.

**Fix:**
```swift
// SwiftUI
Text("Section Title").accessibilityAddTraits(.isHeader)
// UIKit
sectionLabel.accessibilityTraits = .header
```

---

### 4. Logical Reading Order

**Test:** Swipe right through the entire screen. Is the order logical? Does it follow the visual layout?

**Pass criteria:** Elements read in the order a sighted user would scan them: title, then content, then actions.

**Fix:**
```swift
// SwiftUI
.accessibilitySortPriority(1) // Higher = read first
// UIKit
view.accessibilityElements = [first, second, third]
```

---

### 5. Dynamic Type Support

**Test:** Settings → Accessibility → Display & Text Size → Larger Text → Maximum size. Open every screen.

**Pass criteria:** All text scales up. Nothing is clipped, truncated, or overlapping. Layouts reflow if needed.

**Fail patterns:**

| Issue | Fix |
|-------|-----|
| Text clipped | Remove fixed height constraints on text containers |
| Text overlapping | Use Auto Layout with >= constraints |
| Custom font doesn't scale | Use `UIFontMetrics` or `.custom(name:size:relativeTo:)` |
| Layout breaks completely | Consider `@ScaledMetric` for spacing and a scrollable layout |

---

### 6. Color Contrast Meets Minimum

**Test:** Use Xcode Accessibility Inspector → Audit, or check manually with a contrast checker tool.

**Pass criteria:**
- Body text: 4.5:1 ratio against background
- Large text (18pt+): 3:1 ratio
- UI controls (buttons, icons): 3:1 ratio

**Fix:** Darken text colors or lighten backgrounds. Test both light and dark mode.

---

### 7. Information Not Conveyed by Color Alone

**Test:** Look at the app in grayscale (Settings → Accessibility → Display & Text Size → Color Filters → Grayscale). Can you still understand all information?

**Pass criteria:** Error states, success states, status indicators, and categories are distinguishable without color (using icons, text, shapes, or patterns).

**Fix:** Add icons, text labels, or different shapes alongside color coding.

```swift
// Bad: red text only
Text("Error").foregroundColor(.red)

// Good: icon + text + color
Label("Error: Invalid email", systemImage: "exclamationmark.circle")
    .foregroundColor(.red)
```

---

### 8. Touch Targets Are Large Enough

**Test:** Can you comfortably tap every button and control? Use Accessibility Inspector to check frame sizes.

**Pass criteria:** All interactive elements have a minimum 44x44 point touch target.

**Fix:**
```swift
// SwiftUI — expand touch area without changing visual size
Button(action: doSomething) {
    Image(systemName: "xmark")
        .frame(width: 44, height: 44)
}

// UIKit
button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
```

---

### 9. Reduced Motion Respected

**Test:** Settings → Accessibility → Motion → Reduce Motion → On. Navigate through the app.

**Pass criteria:** No sliding transitions, bouncing animations, or parallax effects. Functional animations (loading spinners) still work but are simplified.

**Fix:**
```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion
.animation(reduceMotion ? .none : .spring(), value: state)
```

---

### 10. Custom Controls Are Accessible

**Test:** Can VoiceOver users interact with every custom control (custom sliders, toggles, pickers, rating widgets)?

**Pass criteria:** Custom controls announce their role, current value, and support the expected interaction (adjustable controls respond to swipe up/down).

**Fix:** Add `.accessibilityAdjustableAction` for value-based controls, custom actions for multi-action controls.

---

### 11. Modals Trap Focus

**Test:** Present a modal or alert. Can VoiceOver navigate to elements behind the modal?

**Pass criteria:** VoiceOver stays within the modal. Elements behind it are not reachable.

**Fix:**
```swift
// UIKit
modalView.accessibilityViewIsModal = true
// SwiftUI .sheet and .alert handle this automatically
```

---

### 12. Screen Changes Announced

**Test:** Navigate between screens with VoiceOver on. Is the new screen announced? Does focus move to a logical starting point?

**Pass criteria:** VoiceOver announces the new screen (title or first element) and focus lands at the top.

**Fix:**
```swift
// UIKit — post notification after navigation
UIAccessibility.post(notification: .screenChanged, argument: firstElement)
```

---

### 13. Dynamic Content Updates Announced

**Test:** Trigger actions that update content (add to cart, submit form, error appears). Does VoiceOver tell the user what happened?

**Pass criteria:** Important changes are announced. Non-critical updates don't interrupt.

**Fix:**
```swift
// SwiftUI
AccessibilityNotification.Announcement("Item added to cart").post()
// UIKit
UIAccessibility.post(notification: .announcement, argument: "Item added to cart")
```

---

### 14. Form Fields Have Labels and Error States

**Test:** Navigate through any form. Does each field announce its purpose? When validation fails, does VoiceOver read the error?

**Pass criteria:** Each text field announces its label. Error messages are associated with the field they apply to.

**Fix:**
```swift
// SwiftUI
TextField("Email", text: $email)
    .accessibilityLabel("Email address")
    .accessibilityValue(emailError ?? "")
    .accessibilityHint(emailError != nil ? "Error: \(emailError!)" : "Enter your email")
```

---

### 15. Gestures Have Alternatives

**Test:** Can every gesture-based action (swipe to delete, pinch to zoom, drag to reorder) be performed without the gesture?

**Pass criteria:** Every gesture has a button, menu item, or custom action alternative.

**Fix:** Add accessibility custom actions as alternatives:
```swift
.accessibilityAction(named: "Delete") { deleteItem() }
.accessibilityAction(named: "Move up") { moveItemUp() }
```

---

## Audit Summary Template

| # | Check | Screen 1 | Screen 2 | Screen 3 |
|---|-------|----------|----------|----------|
| 1 | Labels on all elements | | | |
| 2 | Decorative elements hidden | | | |
| 3 | Headers marked | | | |
| 4 | Logical reading order | | | |
| 5 | Dynamic Type support | | | |
| 6 | Color contrast | | | |
| 7 | Not color-only info | | | |
| 8 | 44pt touch targets | | | |
| 9 | Reduced motion | | | |
| 10 | Custom controls accessible | | | |
| 11 | Modal focus trapping | | | |
| 12 | Screen changes announced | | | |
| 13 | Dynamic content announced | | | |
| 14 | Form labels and errors | | | |
| 15 | Gesture alternatives | | | |

Mark each cell: PASS, FAIL, or N/A.
