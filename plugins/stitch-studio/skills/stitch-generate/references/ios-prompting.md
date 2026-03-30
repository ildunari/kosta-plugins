# iOS-Specific Stitch Prompting Reference

## Screen Dimensions

| Device | Width x Height | Safe Area Top | Safe Area Bottom |
|--------|---------------|---------------|------------------|
| iPhone 15 Pro | 393 x 852 | 59pt | 34pt |
| iPhone 15 Pro Max | 430 x 932 | 59pt | 34pt |
| iPhone SE 3 | 375 x 667 | 20pt | 0pt |
| iPad Pro 11" | 834 x 1194 | varies | varies |
| iPad Pro 12.9" | 1024 x 1366 | varies | varies |

Default to **393x852** (iPhone 15 Pro) unless the user specifies a device.

## iOS UI Patterns to Request

Use these exact phrases in prompts to get native-feeling output:

- **NavigationStack with large title** that collapses to inline on scroll
- **Tab bar** with 4-5 items using SF Symbols icons, labels below icons
- **Sheet presentation** -- half-height (`.medium` detent) or full-height
- **Grouped List / Form** with section headers, rows, and section footers
- **Search bar** with scope buttons (e.g., All, Favorites, Recent)
- **Action sheet** rising from bottom with destructive option in red
- **Confirmation dialog** centered with title, message, and 2 buttons
- **Pull-to-refresh** indicator at top of scrollable content
- **Swipe actions** on list rows (leading: pin/flag, trailing: delete/archive)
- **Segmented control** in a toolbar or below the navigation bar
- **Context menu** on long-press with SF Symbol icons per action

## Prompt Templates

Fill in the bracketed sections. Each template includes the iOS platform suffix.

### 1. List Screen

```
iOS mobile app, 393x852. NavigationStack with large title "[Screen Name]".
Search bar at top. Grouped list with [N] sections.
Each row shows [icon/avatar] on left, [primary text] and [secondary text],
[accessory: chevron / toggle / badge] on right.
Tab bar at bottom with [tab items]. SF Pro font, 44pt touch targets, status bar visible.
```

### 2. Detail Screen

```
iOS mobile app, 393x852. NavigationStack with inline title "[Item Name]".
Back button top-left, [action button] top-right.
Hero section: [image/card/header with key info].
Below: grouped sections for [Section 1], [Section 2], [Section 3].
Each section has a header label and [content type: rows / text / stats].
Bottom: [primary action button / toolbar]. SF Pro font, safe area insets.
```

### 3. Settings Screen

```
iOS mobile app, 393x852. NavigationStack with large title "Settings".
Grouped Form with sections: [Account], [Preferences], [About].
Account section: profile row with avatar, name, email, chevron.
Preferences: rows with toggle switches for [setting 1], [setting 2].
[Picker row] with current value shown on right.
About section: version number, links. Destructive "Sign Out" button at bottom in red.
SF Pro font, native iOS toggle switches, status bar visible.
```

### 4. Chat / Messaging Screen

```
iOS mobile app, 393x852. NavigationStack with inline title showing [contact name]
and online status indicator. Back button and [call/info] button in nav bar.
Message list: sent messages right-aligned in [blue] bubbles, received left-aligned
in [gray] bubbles. Timestamps between message groups. Typing indicator with
three animated dots. Bottom composer bar with text field, attachment button,
and send button. Safe area insets, keyboard-aware layout.
```

### 5. Dashboard Screen

```
iOS mobile app, 393x852. NavigationStack with large title "[Dashboard Name]".
Top section: [N] KPI cards in horizontal scroll, each showing icon, value, label,
and trend indicator (up/down arrow with percentage).
Middle: [chart type: line/bar/pie] chart showing [data description].
Below: recent activity list with [N] rows, each showing [icon], [description],
[timestamp]. Tab bar at bottom. SF Pro font, status bar visible.
```

### 6. Onboarding Screen

```
iOS mobile app, 393x852. Full-screen onboarding step [N of total].
Large illustration or icon centered in top half.
Title: "[headline]". Subtitle: "[supporting text, 2 lines max]".
Page indicator dots showing current position.
Bottom: primary button "[CTA text]" full-width, skip button as text link below.
No navigation bar, no tab bar. Safe area insets respected.
```

## What to Avoid in iOS Prompts

| Don't Say | Say Instead | Why |
|-----------|------------|-----|
| "hamburger menu" | "tab bar" or "NavigationStack" | iOS never uses hamburger menus |
| "sidebar" (on iPhone) | "tab bar" or "full-screen list" | Sidebars are iPad-only |
| "tooltip" | "context menu" or "popover" | iOS uses long-press context menus |
| "toast notification" | "banner alert" or "snackbar-style banner" | iOS uses system banners |
| "floating action button" | "toolbar button" or "nav bar button" | FABs are an Android pattern |
| "dropdown menu" | "picker" or "action sheet" | iOS uses native pickers |
| "checkbox" | "checkmark row" or "toggle switch" | iOS lists use checkmarks, not checkboxes |
| "carousel" | "horizontal scroll view" or "paging scroll" | Be specific about scroll behavior |
| "card" (alone) | "grouped section" or "inset grouped list row" | Describe the iOS equivalent |

## Color Guidance for iOS

When specifying colors for iOS screens:

- **System backgrounds**: Use `#F2F2F7` (grouped background), `#FFFFFF` (card/row surface)
- **Dark mode backgrounds**: Use `#000000` (base), `#1C1C1E` (elevated), `#2C2C2E` (secondary)
- **System blue**: `#007AFF` for primary actions and links
- **Destructive red**: `#FF3B30` for delete/remove actions
- **System gray labels**: `#8E8E93` for secondary text
- Always specify both the color AND where it applies (background, text, accent, border)
