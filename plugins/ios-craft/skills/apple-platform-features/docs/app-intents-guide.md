# App Intents Guide

Use App Intents to expose actions to Shortcuts, Siri, Spotlight, and widgets.

## Setup
- Add `AppIntents` to your target.
- Create `AppIntent` types with `@Parameter` properties.
- Provide phrases and a friendly `ParameterSummary`.

## Testing
- Validate in the **Shortcuts** app and via Spotlight.
- Confirm parameter validation and entity lookups behave under error cases (empty results, invalid IDs).
