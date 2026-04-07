# Background Tasks Guide

Use BackgroundTasks to refresh content and process data when your app isn't in the foreground.

## Setup
- Register identifiers in code and in Info.plist.
- Schedule refresh and processing tasks thoughtfully.
- Always call `setTaskCompleted`.

## Testing
- Use the **Debug** menu to simulate background fetch/processing.
- Monitor logs for scheduling and completion.
