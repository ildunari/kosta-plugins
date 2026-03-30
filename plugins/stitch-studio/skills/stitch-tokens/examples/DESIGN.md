# Flowstate — Design System

A modern productivity app for focused work sessions, task management, and team collaboration.

## Colors

- **primary**: `#2563EB` — Interactive elements, buttons, active states
- **secondary**: `#7C3AED` — Badges, tags, accent highlights
- **background**: `#FFFFFF` — Page and panel backgrounds
- **surface**: `#F8FAFC` — Cards, popovers, elevated containers
- **error**: `#DC2626` — Destructive actions, validation errors
- **text-primary**: `#0F172A` — Headings and body copy
- **text-secondary**: `#64748B` — Captions, timestamps, helper text
- **accent**: `#F59E0B` — Notifications, streak counters, highlights

## Dark Mode

- **primary**: `#3B82F6`
- **secondary**: `#8B5CF6`
- **background**: `#0F172A`
- **surface**: `#1E293B`
- **error**: `#EF4444`
- **text-primary**: `#F1F5F9`
- **text-secondary**: `#94A3B8`
- **accent**: `#FBBF24`

## Typography

| Level | Size | Weight | Family | Line Height |
|-------|------|--------|--------|-------------|
| heading1 | 32px | bold | Inter | 1.2 |
| heading2 | 24px | semibold | Inter | 1.3 |
| heading3 | 20px | semibold | Inter | 1.3 |
| bodyLarge | 18px | regular | Inter | 1.5 |
| body | 16px | regular | Inter | 1.5 |
| caption | 13px | medium | Inter | 1.4 |

## Spacing

- **xs**: `4px`
- **sm**: `8px`
- **md**: `16px`
- **lg**: `24px`
- **xl**: `32px`
- **xxl**: `48px`

## Border Radius

- **sm**: `4px`
- **md**: `8px`
- **lg**: `12px`
- **xl**: `16px`
- **full**: `9999px`

## Shadows

- **sm**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **md**: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`
- **lg**: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)`

## Components

### Button
- background: primary
- text: `#FFFFFF`
- radius: md
- padding: sm md
- shadow: sm

### Card
- background: surface
- border: 1px solid `#E2E8F0`
- radius: lg
- padding: md
- shadow: sm

### Input
- background: background
- border: 1px solid `#E2E8F0`
- radius: md
- padding: sm md
- text: text-primary
- placeholder: text-secondary

### Badge
- background: secondary
- text: `#FFFFFF`
- radius: full
- padding: xs sm
- font: caption
