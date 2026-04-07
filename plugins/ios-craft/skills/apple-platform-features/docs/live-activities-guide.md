# Live Activities Guide

Live Activities keep people up to date with time‑bounded, visible progress.

## Setup
- Define `ActivityAttributes` and nested `ContentState`.
- Present `Activity.request(...)` from the app or update via APNs.
- Provide Dynamic Island layouts for iPhone models that support it.

## Testing
- Verify start/update/end locally.
- Test remote updates using sandbox APNs and the activity push token.
