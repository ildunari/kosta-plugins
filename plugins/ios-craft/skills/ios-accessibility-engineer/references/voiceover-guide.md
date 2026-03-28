# VoiceOver Implementation Guide

Complete guide to making your iOS app work well with VoiceOver.

## Navigation Order

VoiceOver reads elements in the order they appear in the accessibility hierarchy. By default, this follows the view hierarchy top-to-bottom, left-to-right.

### Controlling Order in SwiftUI

```swift
// Sort priority — higher numbers are read first
VStack {
    Text("Secondary info")
        .accessibilitySortPriority(0)

    Text("Read me first!")
        .accessibilitySortPriority(1)
}

// For tab-like interfaces, ensure the selected tab content reads after the tab bar
TabView {
    ContentView()
        .accessibilitySortPriority(0)
}
```

### Controlling Order in UIKit

```swift
// Set custom order with accessibilityElements
view.accessibilityElements = [titleLabel, subtitleLabel, actionButton, dismissButton]

// Or use shouldGroupAccessibilityChildren to keep related elements together
cardView.shouldGroupAccessibilityChildren = true
```

### Post-Layout Notifications

When content changes, tell VoiceOver to re-read:

```swift
// SwiftUI — announce a change
AccessibilityNotification.Announcement("Item added to cart")
    .post()

// UIKit — move focus to a specific element
UIAccessibility.post(notification: .layoutChanged, argument: newElement)

// UIKit — announce without moving focus
UIAccessibility.post(notification: .announcement, argument: "Item added to cart")

// UIKit — entire screen changed (navigation, modal)
UIAccessibility.post(notification: .screenChanged, argument: firstElement)
```

**When to use each:**

| Notification | Use when |
|-------------|----------|
| `.announcement` | Something changed but focus shouldn't move (toast, counter update) |
| `.layoutChanged` | Part of the screen changed (new element appeared, section expanded) |
| `.screenChanged` | Whole screen replaced (navigation push, modal presented) |

## Grouping Elements

### Combine into Single Element

When multiple views represent one logical item (e.g., a list row):

```swift
// SwiftUI
HStack {
    AsyncImage(url: user.avatarURL)
    VStack {
        Text(user.name)
        Text(user.role)
    }
    Spacer()
    Text(user.status)
}
.accessibilityElement(children: .combine)
// VoiceOver reads: "Avatar, John Smith, Engineer, Online"
```

### Ignore Children, Provide Custom Label

When the combined reading is awkward:

```swift
HStack {
    Image(systemName: "star.fill")
    Image(systemName: "star.fill")
    Image(systemName: "star.fill")
    Image(systemName: "star")
    Image(systemName: "star")
}
.accessibilityElement(children: .ignore)
.accessibilityLabel("Rating: 3 out of 5 stars")
```

### Contain Children (Keep Individual Navigation)

When each child should be navigable but grouped logically:

```swift
VStack {
    Text("Settings")
        .accessibilityAddTraits(.isHeader)
    Toggle("Notifications", isOn: $notifications)
    Toggle("Dark Mode", isOn: $darkMode)
}
.accessibilityElement(children: .contain)
```

## Custom Actions

Add extra actions to elements without cluttering the UI:

```swift
// SwiftUI
MessageRow(message: message)
    .accessibilityAction(named: "Reply") { reply(to: message) }
    .accessibilityAction(named: "Forward") { forward(message) }
    .accessibilityAction(named: "Delete") { delete(message) }
// VoiceOver: swipe up/down to cycle through actions, double-tap to execute

// UIKit
cell.accessibilityCustomActions = [
    UIAccessibilityCustomAction(name: "Reply") { _ in
        self.reply(to: message)
        return true
    },
    UIAccessibilityCustomAction(name: "Delete") { _ in
        self.delete(message)
        return true
    }
]
```

**When to use custom actions:**
- Swipe-to-delete in lists
- Long-press menus
- Multi-action cells (like, reply, share)
- Context menus
- Any action that requires a gesture VoiceOver users can't perform

## Adjustable Elements

For sliders, steppers, and other incrementable controls:

```swift
// SwiftUI
struct RatingPicker: View {
    @Binding var rating: Int

    var body: some View {
        HStack {
            ForEach(1...5, id: \.self) { star in
                Image(systemName: star <= rating ? "star.fill" : "star")
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Rating")
        .accessibilityValue("\(rating) out of 5 stars")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment:
                rating = min(5, rating + 1)
            case .decrement:
                rating = max(1, rating - 1)
            @unknown default:
                break
            }
        }
    }
}

// UIKit — implement these on a custom view
override var accessibilityTraits: UIAccessibilityTraits {
    return .adjustable
}

override func accessibilityIncrement() {
    rating = min(5, rating + 1)
    accessibilityValue = "\(rating) out of 5 stars"
}

override func accessibilityDecrement() {
    rating = max(1, rating - 1)
    accessibilityValue = "\(rating) out of 5 stars"
}
```

## Rotor Items

The rotor is a VoiceOver gesture (two-finger twist) that provides quick navigation through specific element types.

### Custom Rotor in SwiftUI

```swift
struct ArticleView: View {
    let sections: [Section]

    var body: some View {
        ScrollView {
            ForEach(sections) { section in
                Text(section.title)
                    .font(.title2)
                    .accessibilityAddTraits(.isHeader)
                Text(section.body)
            }
        }
        .accessibilityRotor("Sections") {
            ForEach(sections) { section in
                AccessibilityRotorEntry(section.title, id: section.id)
            }
        }
    }
}
```

### Custom Rotor in UIKit

```swift
let headingsRotor = UIAccessibilityCustomRotor(name: "Sections") { predicate in
    let direction = predicate.searchDirection
    let currentItem = predicate.currentItem

    // Find the next/previous heading based on direction
    let index = sections.firstIndex(where: { $0.id == currentItem.targetElement?.accessibilityIdentifier })
    let nextIndex = direction == .next ? (index ?? -1) + 1 : (index ?? sections.count) - 1

    guard sections.indices.contains(nextIndex) else { return nil }

    let target = sectionViews[nextIndex]
    return UIAccessibilityCustomRotorItemResult(targetElement: target, targetRange: nil)
}
view.accessibilityCustomRotors = [headingsRotor]
```

**Built-in rotor options** (automatically available if you mark elements correctly):
- Headings (`.isHeader` trait)
- Links (`.link` trait)
- Form controls
- Containers
- Text formatting (bold, italic)

## Modal and Alert Accessibility

### Modals

```swift
// SwiftUI — .sheet and .fullScreenCover handle this automatically
.sheet(isPresented: $showSettings) {
    SettingsView()
}

// UIKit — set modal accessibility
modalViewController.view.accessibilityViewIsModal = true
// This tells VoiceOver to ignore elements behind the modal
```

### Alerts with Custom Actions

```swift
// SwiftUI alerts are accessible by default
.alert("Delete Item?", isPresented: $showAlert) {
    Button("Delete", role: .destructive) { deleteItem() }
    Button("Cancel", role: .cancel) { }
} message: {
    Text("This cannot be undone.")
}
```

## Live Regions (Dynamic Content)

For content that updates without user interaction (timers, live scores, stock prices):

```swift
// SwiftUI
Text(timerValue)
    .accessibilityLabel("Timer: \(timerValue)")
    .accessibilityAddTraits(.updatesFrequently)

// UIKit
timerLabel.accessibilityTraits = .updatesFrequently
```

**Caution:** Don't mark too many elements as `.updatesFrequently` — VoiceOver will interrupt the user constantly. Use announcements for important but infrequent updates instead.

## Testing VoiceOver

### On Device (Required)

1. Enable: Settings → Accessibility → VoiceOver → On (or ask Siri "Turn on VoiceOver")
2. Shortcut: Settings → Accessibility → Accessibility Shortcut → VoiceOver (triple-click side button to toggle)

**Testing flow:**
1. Start at the first screen of your app
2. Swipe right through every element
3. Verify: every element has a meaningful label, correct trait, and appropriate hint
4. Double-tap every interactive element to verify it activates correctly
5. Test custom actions (swipe up/down on elements with custom actions)
6. Navigate to every screen
7. Test with the screen off (lock the screen — VoiceOver still works)

### Common VoiceOver Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| "Button" read without context | Missing label | Add `.accessibilityLabel()` |
| Decorative image read as "Image" | Not hidden | `.accessibilityHidden(true)` |
| Elements read in wrong order | View hierarchy order | Use `.accessibilitySortPriority()` |
| Can't reach an element | Hidden behind another view or not in hierarchy | Check `isAccessibilityElement` |
| Modal doesn't trap focus | Missing modal flag | `.accessibilityViewIsModal = true` (UIKit) |
| Screen change not announced | Missing notification | Post `.screenChanged` notification |
