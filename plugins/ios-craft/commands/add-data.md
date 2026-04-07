---
name: add-data
description: Set up data persistence (SwiftData, Core Data, Keychain)
---

Use the apple-data-persistence skill to set up data persistence.

Start by understanding what needs to be stored:
- What data do you need to save? (user preferences, content, cached API data, credentials)
- Does it need to survive app deletion? (Keychain for credentials, iCloud for sync)
- How much data? (a few settings vs thousands of records)
- Does it need to sync across devices?

Recommend the right storage solution:
- **UserDefaults** — Small preferences and settings (theme, onboarding completed, last selected tab)
- **SwiftData** — Structured data with relationships, queries, and migrations (the modern default for most apps)
- **Core Data** — Legacy structured storage (only if the project already uses it)
- **Keychain** — Sensitive data like tokens, passwords, API keys
- **File system** — Large blobs like images, PDFs, cached downloads

Then implement:

1. **Data models** — Define the @Model classes (SwiftData) or entities with proper types, relationships, and default values.

2. **Container setup** — Configure the ModelContainer in the app's entry point with the correct schema and configuration.

3. **CRUD operations** — Build the create, read, update, and delete operations using @Query and modelContext.

4. **Migration plan** — If the schema might change, set up a versioned schema with migration steps.

5. **Testing** — Create an in-memory container for tests so they run fast and don't affect real data.

6. **Integration** — Wire the data layer into existing views and verify saving and loading works in the simulator.
