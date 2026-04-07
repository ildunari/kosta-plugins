---
name: add-feature
description: Add a complete feature with model, view, tests, and navigation wiring
---

Guide the user through adding a complete feature to their iOS app.

Start by understanding the feature:
- What does this feature do from the user's perspective?
- What data does it need? (new models, API endpoints, stored data)
- Where does it live in the app's navigation? (new tab, pushed screen, modal, settings item)
- Does it interact with any existing features?

Then implement the full feature stack:

1. **Model layer** — Create or update data models. Define the types, relationships, and any Codable conformance for API/persistence.

2. **Service layer** — If the feature needs data from an API or local storage, create the service that provides it. Use proper async/await patterns and error handling.

3. **View model / Observable** — Create the @Observable class that connects the view to the data. Handle loading, success, and error states.

4. **View layer** — Build the SwiftUI views using the swiftui-mastery approach. Include all states (loading, empty, populated, error), accessibility, and previews.

5. **Navigation wiring** — Connect the new feature into the app's existing navigation. Add the route, the tab bar item, or the settings row.

6. **Tests** — Write unit tests for the model and view model logic. Test the happy path, edge cases, and error handling.

7. **Build and verify** — Build the project, run all tests, and launch in the simulator to verify the feature works end to end.

Show the user everything that was created and suggest refinements.
