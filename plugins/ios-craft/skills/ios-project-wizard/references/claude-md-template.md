# CLAUDE.md Template for iOS Projects

Copy this template into your project root as `CLAUDE.md` and fill in the blanks. This file tells Claude Code how your project works -- the better this file is, the better AI assistance you get.

Lines marked with `[FILL]` need your input. Lines marked with `[AUTO]` are filled by the ios-project-wizard.

---

```markdown
# [FILL: Project Name]

[FILL: One-sentence description of what this app does.]

## Tech Stack

- **Platform:** iOS [AUTO: version, e.g., 17.0]+
- **UI Framework:** SwiftUI
- **Language:** Swift 6 (strict concurrency enabled)
- **Architecture:** [AUTO: e.g., MVVM with @Observable ViewModels]
- **Persistence:** [AUTO: e.g., SwiftData / None]
- **Networking:** [AUTO: e.g., URLSession async/await / None]
- **Testing:** Swift Testing framework
- **Project Generation:** XcodeGen (project.yml is source of truth)
- **Minimum Xcode:** [AUTO: e.g., 16.0]

## Build Commands

```bash
# Regenerate Xcode project from project.yml (run after any project.yml change)
xcodegen generate

# Build the app (no code signing, simulator only)
xcodebuild build \
  -project [AUTO: ProjectName].xcodeproj \
  -scheme [AUTO: ProjectName] \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  CODE_SIGNING_ALLOWED=NO

# Run unit tests
xcodebuild test \
  -project [AUTO: ProjectName].xcodeproj \
  -scheme [AUTO: ProjectName]Tests \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  CODE_SIGNING_ALLOWED=NO

# Run UI tests
xcodebuild test \
  -project [AUTO: ProjectName].xcodeproj \
  -scheme [AUTO: ProjectName]UITests \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  CODE_SIGNING_ALLOWED=NO

# Clean build folder
xcodebuild clean \
  -project [AUTO: ProjectName].xcodeproj \
  -scheme [AUTO: ProjectName]
```

## Architecture Overview

This app uses **[AUTO: architecture pattern]** with the following conventions:

### Folder Structure

```
[AUTO: ProjectName]/
├── App/          → Entry point, global state, navigation root
├── Core/         → Shared models, services, utilities
├── Design/       → Design tokens (spacing, colors, typography) and reusable components
├── Features/     → One folder per screen/feature, each with View + ViewModel
├── Extensions/   → Swift extensions on Foundation/SwiftUI types
└── Resources/    → Assets, localization, fonts
```

### Data Flow

1. **Views** display UI and forward user actions to ViewModels.
2. **ViewModels** (`@Observable` classes) hold screen state and business logic.
3. **Services** (in `Core/Services/`) handle side effects: networking, persistence, auth.
4. **Models** (in `Core/Models/`) are plain data types (`Codable` structs or `@Model` classes).

### Navigation

[FILL: Describe how navigation works. Example: "NavigationStack-based with programmatic navigation via AppRouter. Deep links are handled in AppState."]

## Coding Conventions

### Swift Style

- **Swift 6 strict concurrency.** All mutable shared state uses actors or `@MainActor`. No `nonisolated(unsafe)`.
- **Prefer value types.** Use structs for models and enums for constants. Classes only for `@Observable` ViewModels and `@Model` entities.
- **No force unwrapping** (`!`) except in tests and previews.
- **No abbreviations** in public API names. `backgroundColor`, not `bgColor`.
- **Mark sections** with `// MARK: -` for readability.

### SwiftUI Patterns

- Use `@Observable` (iOS 17+), not `@ObservableObject`/`@Published`.
- Use `@Environment` for dependency injection, not singletons passed through init.
- Keep views small. If a view body exceeds ~40 lines, extract subviews.
- Every view should have a `#Preview` block.

### Testing

- Use **Swift Testing** (`import Testing`, `@Test`, `#expect`), not XCTest for new tests.
- Test file naming: `{ClassName}Tests.swift` in a mirrored folder structure.
- Mock services using protocols. Concrete implementations in `Core/Services/`, mocks in test targets.
- Aim for testing ViewModels and Services. Views are tested via UI tests or previews.

### Error Handling

- Use typed errors (`enum AppError: LocalizedError`) instead of generic `Error`.
- Always provide `errorDescription` for user-facing error messages.
- Handle errors at the ViewModel level. Views display errors, they don't catch them.

## Dependencies

[AUTO: List of dependencies, or "No third-party dependencies."]

| Dependency | Purpose | Version |
|-----------|---------|---------|
| [FILL] | [FILL] | [FILL] |

## Environment Setup

### Prerequisites

- macOS [FILL: version]+
- Xcode [AUTO: version]+
- XcodeGen (`brew install xcodegen`)
- [FILL: Any other tools, e.g., SwiftLint, Fastlane]

### First-Time Setup

```bash
# Clone the repo
git clone [FILL: repo URL]
cd [AUTO: ProjectName]

# Generate the Xcode project
xcodegen generate

# Open in Xcode
open [AUTO: ProjectName].xcodeproj

# Build and run (Cmd+R in Xcode, or use the build command above)
```

## Deployment

- **Bundle ID:** [AUTO: e.g., com.yourname.appname]
- **App Store Connect:** [FILL: link or "not set up yet"]
- **CI/CD:** [FILL: e.g., "GitHub Actions", "Xcode Cloud", "not set up yet"]
- **TestFlight:** [FILL: distribution group info or "not set up yet"]

## Known Issues

[FILL: List any known issues, workarounds, or technical debt. Remove this section if none.]

## AI Assistant Notes

<!-- These notes help Claude Code work more effectively with this project. -->

- The `.xcodeproj` is generated by XcodeGen. Never edit it directly -- edit `project.yml` and regenerate.
- When adding new files, also add them to the appropriate folder in the source tree. XcodeGen picks up files by directory, not by explicit listing.
- When creating new features, follow the pattern in `Features/Home/` -- one folder with a View and ViewModel.
- Design tokens in `Design/Tokens/` are the source of truth for colors, spacing, and typography. Use them instead of hard-coded values.
- The project uses Swift 6 strict concurrency. Annotate ViewModels with `@MainActor` and services with `actor` where appropriate.
```

---

## Usage Notes

The ios-project-wizard fills in `[AUTO]` fields automatically during project generation. The `[FILL]` fields require user input -- either during the wizard interview or as the project evolves.

After generation, review the CLAUDE.md and update any `[FILL]` fields that are still placeholders. A half-complete CLAUDE.md is still useful; a fully complete one is significantly better.
