# Design System — Craft Companion

## Visual Theme & Atmosphere
Modern, focused productivity tool. Clean lines with subtle depth. Dark mode primary, light mode secondary. Inspired by Linear, Notion, and Raycast.

## Color Palette

### Light Mode
| Role | Value | Usage |
|------|-------|-------|
| Primary | #6366F1 | Actions, links, active states |
| Primary Hover | #4F46E5 | Pressed/hover states |
| Secondary | #8B5CF6 | Accents, highlights |
| Background | #FFFFFF | Page background |
| Surface | #F8FAFC | Card backgrounds, elevated surfaces |
| Border | #E2E8F0 | Dividers, input borders |
| Text Primary | #0F172A | Headings, body text |
| Text Secondary | #64748B | Descriptions, placeholders |
| Success | #22C55E | Confirmation, online status |
| Warning | #F59E0B | Caution states |
| Error | #EF4444 | Errors, destructive actions |
| Muted | #F1F5F9 | Disabled backgrounds |

### Dark Mode
| Role | Value | Usage |
|------|-------|-------|
| Primary | #818CF8 | Actions, links |
| Primary Hover | #6366F1 | Pressed states |
| Secondary | #A78BFA | Accents |
| Background | #0F172A | Page background |
| Surface | #1E293B | Card backgrounds |
| Border | #334155 | Dividers |
| Text Primary | #F8FAFC | Headings, body text |
| Text Secondary | #94A3B8 | Descriptions |
| Success | #4ADE80 | Confirmation |
| Warning | #FBBF24 | Caution |
| Error | #F87171 | Errors |
| Muted | #1E293B | Disabled |

## Typography
| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 36px | 700 | 1.2 | Hero headings |
| Heading 1 | 28px | 700 | 1.3 | Page titles |
| Heading 2 | 22px | 600 | 1.35 | Section headers |
| Heading 3 | 18px | 600 | 1.4 | Subsections |
| Body | 16px | 400 | 1.5 | Main content |
| Body Small | 14px | 400 | 1.5 | Secondary content |
| Caption | 12px | 500 | 1.4 | Labels, metadata |
| Code | 14px | 400 | 1.6 | Code blocks, monospace |
Font Family: Inter (headings and body), JetBrains Mono (code)

## Spacing Scale
Base unit: 4px
| Name | Value | Usage |
|------|-------|-------|
| 2xs | 2px | Tight icon gaps |
| xs | 4px | Inline spacing |
| sm | 8px | Component internal padding |
| md | 16px | Standard padding |
| lg | 24px | Section spacing |
| xl | 32px | Major section gaps |
| 2xl | 48px | Page-level spacing |
| 3xl | 64px | Hero spacing |

## Border Radii
| Name | Value |
|------|-------|
| sm | 4px |
| md | 8px |
| lg | 12px |
| xl | 16px |
| full | 9999px |

## Shadows
| Name | Value | Usage |
|------|-------|-------|
| sm | 0 1px 2px rgba(0,0,0,0.05) | Subtle elevation |
| md | 0 4px 6px -1px rgba(0,0,0,0.1) | Cards, dropdowns |
| lg | 0 10px 15px -3px rgba(0,0,0,0.1) | Modals, popovers |
| inner | inset 0 2px 4px rgba(0,0,0,0.05) | Pressed states |

## Components
| Component | Radius | Shadow | Padding |
|-----------|--------|--------|---------|
| Button (primary) | md | sm | 8px 16px |
| Button (secondary) | md | none | 8px 16px |
| Card | lg | md | 16px |
| Input | md | none | 8px 12px |
| Badge | full | none | 2px 8px |
| Avatar | full | sm | — |
| Modal | xl | lg | 24px |
| Toast | lg | md | 12px 16px |
