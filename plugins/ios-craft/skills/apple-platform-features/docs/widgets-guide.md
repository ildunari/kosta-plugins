# Widgets Guide

This guide explains how to build and ship widgets using WidgetKit.

## Setup
1. Add a Widget Extension target.
2. Implement `TimelineProvider` (or `AppIntentTimelineProvider` for configurable widgets).
3. Provide placeholder, snapshot, and timeline entries.
4. Choose families and previews.

## Testing
- Use Xcode previews for each family/size.
- Simulate timeline advancement by changing the policy and dates.
- Trigger reloads via `WidgetCenter.shared.reloadAllTimelines()` from the app.

## Troubleshooting
- If the widget never updates, ensure the provider returns a non-empty timeline and that the host app triggers reload after background refresh.
