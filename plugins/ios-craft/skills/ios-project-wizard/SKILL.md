---
name: ios-project-wizard
description: >
  Guided project creation wizard. Use when starting a new iOS project from scratch,
  setting up XcodeGen, choosing architecture, scaffolding folder structure, and
  generating initial files. Takes a beginner from "I have an idea" to a buildable
  project in minutes.
---

# iOS Project Wizard

You are guiding someone from a blank canvas to a fully buildable, testable, Git-tracked Xcode project. Move through each phase in order. Do not skip steps. Explain why each step matters -- a beginner should walk away understanding the project they just created, not just following instructions.

---

## Phase 1: Interview

Before generating anything, understand what the user wants to build. Ask these questions conversationally -- do not dump a questionnaire. Ask 2-3 at a time, then follow up based on answers.

**Core questions:**

1. **What does the app do?** Get a one-sentence description. Example: "A recipe manager that lets me save and search meals."
2. **Target platforms?** iPhone only, iPad only, or universal? This affects layout strategy and minimum deployment target.
3. **Minimum iOS version?** Default recommendation: iOS 17. Explain why: iOS 17 gives access to SwiftData, the Observation framework, and modern SwiftUI APIs without dropping too many users (~95% coverage).
4. **Does it need networking?** Will the app talk to a server, fetch data from an API, or sync with a cloud service?
5. **Does it need local persistence?** Will the user save data that survives app restarts? If yes, recommend SwiftData (Apple's modern persistence framework -- think of it as a smarter, Swift-native Core Data).
6. **Does it need authentication?** Sign in with Apple, email/password, or third-party auth?
7. **Does it need push notifications?** If yes, note that this requires an Apple Developer Program membership ($99/year).
8. **Any third-party dependencies you already know you want?** (e.g., a specific SDK, analytics, crash reporting)

**Why this matters:** Every question shapes the project.yml configuration, folder structure, and starter files. Getting this right up front prevents painful restructuring later.

After the interview, summarize what you heard back to the user in plain language:

> "Here's what I'm going to build for you: A universal SwiftUI app targeting iOS 17+, with networking via URLSession and local persistence via SwiftData. No auth, no push notifications, no third-party dependencies. Sound right?"

Wait for confirmation before proceeding.

---

## Phase 2: Dependency Selection

Based on the interview answers, recommend a starter dependency set. Keep it minimal -- every dependency is a future maintenance burden.

**Built-in (always included):**
- SwiftUI (UI framework)
- Swift Testing (test framework, replaces XCTest for new projects)

**Conditional recommendations:**

| Need | Recommendation | Why |
|------|---------------|-----|
| Networking | URLSession + async/await | Built into iOS, no dependency needed. Add a thin service layer for testability. |
| Persistence | SwiftData | Apple's modern persistence. Built-in, works with SwiftUI out of the box. |
| Auth (Apple) | AuthenticationServices | Built-in framework for Sign in with Apple. |
| Auth (custom) | Suggest keeping it simple with URLSession + Keychain | Avoid Firebase/third-party auth SDKs unless the user specifically wants them. |
| Image loading | AsyncImage (SwiftUI built-in) | For basic needs. Suggest Nuke only if they need caching/prefetching at scale. |
| Analytics | Defer this decision | Don't add analytics on day one. Ship first, measure later. |

**What NOT to recommend for a new project:**
- RxSwift/Combine wrappers (Swift concurrency replaces most use cases)
- Alamofire (URLSession with async/await is sufficient for most apps)
- SnapKit/layout libraries (SwiftUI handles layout natively)

Present the recommendations as a simple table and explain each choice in one sentence.

---

## Phase 3: Generate project.yml

Generate an XcodeGen `project.yml` file. This file replaces the traditional `.xcodeproj` -- instead of a binary file that causes merge conflicts, you get a human-readable YAML file that generates the Xcode project on demand.

**Why XcodeGen?** Xcode project files (`.xcodeproj`) are notoriously fragile. They're binary-ish XML that causes constant merge conflicts in teams. XcodeGen lets you describe your project in clean YAML and regenerate the `.xcodeproj` whenever you need it. The generated file goes in `.gitignore` -- only the YAML is tracked.

Select the appropriate template from `references/xcodegen-starter-templates.md` based on interview answers:
- No networking, no persistence: use the **Minimal** template
- Networking needed: use the **With Networking** template
- Networking + persistence + tests: use the **Full Stack** template

Customize the template with:
- The app name from the interview
- The correct bundle identifier (ask the user or default to `com.yourname.appname`)
- The minimum iOS version from the interview
- Any additional frameworks identified in Phase 2

Place the file at the project root: `project.yml`

---

## Phase 4: Scaffold Folder Structure

Select the appropriate structure from `references/starter-folder-structures.md` based on app complexity:
- Fewer than 5 screens: **Simple** structure
- 5-15 screens: **Feature-based** structure
- More than 15 screens or shared libraries: **Modular SPM** structure

When in doubt, start with **Feature-based** -- it scales well and is easy to refactor later.

Create all directories and placeholder files. Every folder should have at least one file so Git tracks it (empty folders are invisible to Git).

**Standard folder layout (Feature-based example):**

```
AppName/
  App/                    # App entry point and configuration
    AppNameApp.swift      # @main entry point
    AppState.swift        # Global app state (environment objects, dependency container)
  Core/                   # Shared business logic
    Models/               # Data models (Codable structs, SwiftData models)
    Services/             # Networking, persistence, and other services
    Utilities/            # Extensions, helpers, formatters
  Design/                 # Design system
    Tokens/               # Colors, typography, spacing constants
    Components/           # Reusable UI components (buttons, cards, inputs)
  Features/               # One subfolder per feature/screen
    Home/                 # Example feature
      HomeView.swift
      HomeViewModel.swift
  Extensions/             # Swift extensions on Foundation/UIKit/SwiftUI types
  Resources/              # Assets, localization, fonts
    Assets.xcassets/
    Localizable.xcstrings
```

**Why this structure?**
- `App/` is tiny and stable -- it rarely changes after initial setup.
- `Core/` holds code that any feature might need. Putting it in one place avoids duplication.
- `Design/` centralizes visual decisions. Change a color once, it updates everywhere.
- `Features/` keeps each screen self-contained. You can find everything about "Home" in one folder.
- `Extensions/` prevents the common mistake of scattering extensions across random files.
- `Resources/` keeps non-code assets organized and out of the way.

---

## Phase 5: Generate Starter Files

Generate these files with real, working code. Every file should compile. No `// TODO` placeholders in the initial generation -- give the user something that builds and runs.

### AppNameApp.swift (the entry point)

```swift
import SwiftUI

@main
struct AppNameApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environment(appState)
        }
    }
}
```

**Why:** This is the app's front door. `@main` tells Swift this is where execution starts. The `AppState` is injected into the environment so any view in the app can access shared state without passing it manually through every view.

### AppState.swift (global state container)

```swift
import SwiftUI

@Observable
final class AppState {
    var isOnboarded: Bool = false

    // Add shared app-level state here.
    // Feature-specific state belongs in feature ViewModels, not here.
}
```

**Why:** A single place for truly global state (auth status, onboarding flag, user preferences). Keep it thin -- most state belongs in individual feature ViewModels.

### HomeView.swift (first screen)

```swift
import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "hand.wave")
                    .font(.system(size: 64))
                    .foregroundStyle(.accent)

                Text("Welcome to AppName")
                    .font(.largeTitle.bold())

                Text("Your app is ready to build.")
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .navigationTitle("Home")
        }
    }
}

#Preview {
    HomeView()
        .environment(AppState())
}
```

**Why:** A real, visible screen that proves the app works. The preview at the bottom lets you see the UI in Xcode's canvas without running the simulator. It also demonstrates the pattern for accessing `AppState` from the environment.

### Design Tokens (Colors, Typography, Spacing)

```swift
import SwiftUI

// MARK: - Spacing

enum Spacing {
    /// 4pt - Minimum spacing, used between tightly grouped elements
    static let xxs: CGFloat = 4
    /// 8pt - Small spacing, used between related elements
    static let xs: CGFloat = 8
    /// 12pt - Medium-small spacing
    static let sm: CGFloat = 12
    /// 16pt - Default spacing, used for standard padding
    static let md: CGFloat = 16
    /// 24pt - Large spacing, used between sections
    static let lg: CGFloat = 24
    /// 32pt - Extra-large spacing
    static let xl: CGFloat = 32
    /// 48pt - Maximum spacing, used for major section breaks
    static let xxl: CGFloat = 48
}

// MARK: - Typography

extension Font {
    /// Use for screen titles
    static let displayLarge: Font = .largeTitle.bold()
    /// Use for section headers
    static let headingMedium: Font = .title2.bold()
    /// Use for body text
    static let bodyRegular: Font = .body
    /// Use for captions and metadata
    static let captionSmall: Font = .caption
}
```

**Why design tokens?** Hard-coded values like `padding(16)` scattered across your app make redesigns painful. With tokens, `padding(Spacing.md)` is readable AND changeable from one place. This is how professional apps maintain visual consistency.

### If networking was requested -- generate a basic NetworkService:

```swift
import Foundation

/// A thin wrapper around URLSession that handles JSON decoding and error mapping.
/// All methods are async and throw typed errors for clean call sites.
actor NetworkService {
    static let shared = NetworkService()

    private let session: URLSession
    private let decoder: JSONDecoder

    private init(session: URLSession = .shared) {
        self.session = session
        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder.dateDecodingStrategy = .iso8601
    }

    /// Fetch and decode a Codable type from the given URL.
    func fetch<T: Codable>(_ type: T.Type, from url: URL) async throws -> T {
        let (data, response) = try await session.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }

        return try decoder.decode(T.self, from: data)
    }
}

enum NetworkError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            "The server returned an invalid response."
        case .httpError(let code):
            "Request failed with status code \(code)."
        }
    }
}
```

### If persistence was requested -- generate a SwiftData model example:

```swift
import SwiftData

@Model
final class Item {
    var title: String
    var createdAt: Date
    var isFavorite: Bool

    init(title: String, createdAt: Date = .now, isFavorite: Bool = false) {
        self.title = title
        self.createdAt = createdAt
        self.isFavorite = isFavorite
    }
}
```

And update the App entry point to include the model container:

```swift
@main
struct AppNameApp: App {
    var body: some Scene {
        WindowGroup {
            HomeView()
        }
        .modelContainer(for: Item.self)
    }
}
```

---

## Phase 6: Run XcodeGen

Run XcodeGen to generate the `.xcodeproj` from the `project.yml`:

```bash
xcodegen generate
```

**What this does:** Reads your `project.yml` and creates the Xcode project file. You should see output like:
```
Generated AppName.xcodeproj
```

If XcodeGen is not installed, install it first:
```bash
brew install xcodegen
```

**Why not just create the Xcode project manually?** Because `.xcodeproj` files are generated artifacts -- like compiled code. You don't edit compiled code by hand; you edit the source and recompile. Same principle here: edit `project.yml`, regenerate the project.

---

## Phase 7: First Build

Use XcodeBuildMCP (if available) or `xcodebuild` to verify the project compiles:

```bash
xcodebuild build \
  -project AppName.xcodeproj \
  -scheme AppName \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  CODE_SIGNING_ALLOWED=NO
```

If the build fails, fix the issues before proceeding. Common first-build problems:
- Missing `import` statements
- Bundle identifier format issues (must be reverse-DNS: `com.company.appname`)
- Asset catalog not found (make sure `Assets.xcassets` exists with at least a placeholder)

Do not move to the next step until the build succeeds. A project that doesn't compile on creation is worse than no project at all.

---

## Phase 8: Git Init

Initialize Git and create the first commit:

```bash
git init
```

Generate a `.gitignore` from `references/gitignore-ios.md`. The critical entries are:
- `*.xcodeproj` (generated by XcodeGen -- never track this)
- `DerivedData/`
- `.build/`
- `*.xcuserstate`
- `Pods/` (if using CocoaPods)

Then make the first commit:

```bash
git add -A
git commit -m "Initial project scaffold via ios-project-wizard"
```

**Why Git immediately?** Because the moment something works is the best time to save it. If you break something in the next step, you can always get back to this known-good state. Think of it as a save point in a game.

---

## Phase 9: Generate Documentation

### README.md

Generate a README with:
- Project name and one-line description
- Prerequisites (Xcode version, XcodeGen, minimum iOS)
- Setup instructions (`xcodegen generate`, open project, build)
- Architecture overview (which pattern, folder structure explanation)
- How to run tests

### CLAUDE.md

Generate a project-specific CLAUDE.md using the template from `references/claude-md-template.md`. Fill in:
- Project name and description from the interview
- Build command (`xcodegen generate && xcodebuild build ...`)
- Architecture pattern chosen
- Folder structure overview
- Test commands
- Any project-specific conventions established during setup

**Why CLAUDE.md?** This file tells Claude Code (and future AI assistants) how your project works. It's like onboarding documentation, but for AI. The better this file is, the better AI assistance you'll get throughout development.

---

## Phase 10: Launch Simulator

Open the project in Xcode and launch the simulator:

```bash
open AppName.xcodeproj
```

Or, if using `xcodebuild` directly:

```bash
xcodebuild build \
  -project AppName.xcodeproj \
  -scheme AppName \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  CODE_SIGNING_ALLOWED=NO

xcrun simctl boot "iPhone 16" 2>/dev/null || true
xcrun simctl install booted Build/Products/Debug-iphonesimulator/AppName.app
xcrun simctl launch booted com.yourname.appname
```

The user should see the welcome screen from `HomeView.swift` running in the simulator.

---

## Phase 11: Next Steps Handoff

Once everything is running, present a clear set of next steps. Tailor these to what the user said in the interview:

**For every project:**
1. "Your project is running. The first thing I'd recommend is building your first real feature. Pick the simplest screen in your app and replace HomeView with it."
2. "Run the test target to make sure the testing pipeline works: `xcodebuild test -scheme AppNameTests`"

**If networking was included:**
3. "The NetworkService is ready to use. Create a model that matches your API response and call `NetworkService.shared.fetch(YourModel.self, from: url)`."

**If persistence was included:**
4. "The SwiftData model container is set up. Modify the `Item` model to match your actual data, or create new `@Model` classes for your domain objects."

**Architecture guidance:**
5. "For architecture patterns and how to structure your ViewModels, see the `apple-architecture-patterns` skill."
6. "For Swift 6 strict concurrency setup and language features, see the `apple-swift-language-expert` skill."

**Always end with:**
> "You now have a buildable, testable, Git-tracked iOS project. The hardest part of any project is getting started -- that's done. Build something."
