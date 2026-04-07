---
name: add-screen
description: Generate a complete SwiftUI screen with state, navigation, accessibility, and previews
---

Use the swiftui-mastery skill to generate a complete SwiftUI screen.

Ask the user what kind of screen they need:
- List/detail screen (showing a collection of items with drill-down)
- Form/input screen (collecting user data)
- Dashboard/summary screen (displaying stats or overview)
- Settings screen (preferences and configuration)
- Profile screen (user information display/edit)
- Empty state / onboarding screen
- Custom (describe what you need)

Then generate the full implementation:
1. The main view file with proper state management (@State, @Observable, @Environment as appropriate)
2. Any supporting model types the view needs
3. Navigation wiring — how this screen connects to the rest of the app
4. All visual states: loading, empty, populated, and error
5. Accessibility labels on every interactive element
6. Dark mode support using semantic colors
7. Dynamic Type support for all text
8. SwiftUI previews showing default, dark mode, and large text variants

Build and run in the simulator to verify, then show the result.
