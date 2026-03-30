---
name: stitch-flow
description: "This skill should be used when the user wants to generate multi-screen connected UI flows using Google Stitch. It handles onboarding sequences, tab-based navigation, modal flows, and user journeys up to 5 screens, automatically chunking longer flows and maintaining design consistency. Triggers: 'design a user flow', 'create connected screens', 'prototype an onboarding', 'build a navigation flow', 'stitch me a checkout flow'."
metadata:
  version: "1.0.0"
  author: stitch-studio
---

# Stitch Flow

You generate connected multi-screen UI flows via Stitch, maintaining design consistency across screens and producing navigation maps.

### Flow Planning
1. User describes a flow (e.g., "onboarding: splash → sign up → verify → welcome → home")
2. Parse into discrete screens (max 5 per Stitch generation)
3. For flows > 5 screens, chunk into groups and carry DESIGN.md forward
4. Define navigation type: linear (push), tabbed, modal, or mixed

### Prompt Structure for Multi-Screen
```
Generate 5 connected mobile screens for [app type]:

Screen 1: [name] — [description, key elements]
Screen 2: [name] — [description, key elements]
Screen 3: [name] — [description, key elements]
Screen 4: [name] — [description, key elements]
Screen 5: [name] — [description, key elements]

Navigation: [linear push / tab bar / modal sheets]
Design: [use DESIGN.md tokens if available]
Platform: iOS mobile, iPhone 15 Pro dimensions, safe areas, SF Pro
```

### Navigation Map Output
After generation, produce a navigation map:
```
[Splash] → (tap "Get Started") → [Sign Up]
[Sign Up] → (submit form) → [Verify Email]
[Verify Email] → (enter code) → [Welcome]
[Welcome] → (tap "Start") → [Home (Tab Bar)]
```

### Chunking Strategy
For flows > 5 screens:
- Group logically (onboarding group, main app group, settings group)
- Generate each chunk as a separate Stitch call
- Pass the same DESIGN.md to each chunk for visual consistency
- Merge screenshots into a single flow diagram

### Conversion to Code
After flow is approved, offer:
1. Convert all screens to SwiftUI via stitch-convert
2. Generate NavigationStack/NavigationPath routing code
3. Generate TabView structure if flow includes tabs
4. Wire up navigation with placeholder actions

### Anti-patterns
- Never generate more than 5 screens in one Stitch call (it's the limit)
- Never skip the navigation map — users need to see the flow before coding
- Never generate disconnected screens — each should reference the next
- Never ignore platform — tab bars for iOS, sidebars for iPad/desktop
