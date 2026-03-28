# Starter Folder Structures

Three folder structure patterns for iOS projects, from simple to scalable. Pick the one that matches your app's complexity.

---

## Decision Tree

```
How many screens will your app have?

  < 5 screens ──────────────────────► Simple
  5 - 15 screens ───────────────────► Feature-Based
  > 15 screens OR multiple teams ───► Modular SPM
  Not sure yet? ────────────────────► Feature-Based (safe default)
```

**General rule:** Start simpler than you think you need. Migrating from Simple to Feature-Based is a 30-minute refactor. Migrating from Modular SPM back to something simpler is painful. Over-engineering your folder structure on day one wastes time and adds complexity you don't need yet.

---

## 1. Simple -- Flat Features

Best for: small apps, prototypes, personal projects, hackathons, apps with fewer than 5 screens.

```
AppName/
├── App/
│   ├── AppNameApp.swift              # @main entry point
│   └── AppState.swift                # Global observable state
│
├── Models/
│   ├── Item.swift                    # Data models (Codable, @Model)
│   └── User.swift
│
├── Views/
│   ├── HomeView.swift                # All views live flat in one folder
│   ├── DetailView.swift
│   ├── SettingsView.swift
│   └── Components/                   # Shared reusable UI pieces
│       ├── PrimaryButton.swift
│       └── LoadingIndicator.swift
│
├── Services/
│   ├── NetworkService.swift          # API client
│   └── StorageService.swift          # Persistence layer
│
├── Utilities/
│   ├── DateFormatter+Extensions.swift
│   └── Constants.swift
│
├── Resources/
│   ├── Assets.xcassets/
│   └── Localizable.xcstrings
│
└── Preview Content/
    └── PreviewSampleData.swift       # Mock data for SwiftUI previews
```

**Why this works for small apps:**
- Everything is findable by type: models in Models, views in Views, services in Services.
- No deep nesting. You never need to navigate more than 2 levels to find a file.
- Adding a new screen means adding one file to Views. No ceremony.

**When to upgrade:** When you start prefixing files to avoid confusion (e.g., `HomeHeaderView`, `HomeListView`, `HomeDetailView`), that's a signal the flat structure is getting crowded. Move to Feature-Based.

---

## 2. Feature-Based -- Self-Contained Modules

Best for: most apps, apps with 5-15 screens, apps being built by 1-3 developers, apps that will ship to the App Store.

```
AppName/
├── App/
│   ├── AppNameApp.swift              # @main entry point
│   ├── AppState.swift                # Global observable state
│   └── AppRouter.swift               # Top-level navigation coordinator
│
├── Core/
│   ├── Models/
│   │   ├── Item.swift                # Shared data models
│   │   └── User.swift
│   │
│   ├── Services/
│   │   ├── NetworkService.swift      # API client (actor-isolated)
│   │   ├── NetworkError.swift        # Typed networking errors
│   │   ├── PersistenceService.swift  # SwiftData configuration
│   │   └── AuthService.swift         # Authentication logic
│   │
│   └── Utilities/
│       ├── Logger.swift              # Unified logging wrapper
│       └── Validators.swift          # Input validation helpers
│
├── Design/
│   ├── Tokens/
│   │   ├── Spacing.swift             # Spacing scale (4, 8, 12, 16, 24, 32, 48)
│   │   ├── Typography.swift          # Font styles as static properties
│   │   └── ColorTokens.swift         # Semantic color definitions
│   │
│   └── Components/
│       ├── PrimaryButton.swift       # App-wide button styles
│       ├── CardView.swift            # Reusable card container
│       ├── EmptyStateView.swift      # "No content" placeholder
│       └── LoadingView.swift         # Consistent loading indicator
│
├── Features/
│   ├── Home/
│   │   ├── HomeView.swift            # The screen
│   │   ├── HomeViewModel.swift       # Business logic for this screen
│   │   └── HomeComponents/           # Views used ONLY by Home
│   │       └── HomeCard.swift
│   │
│   ├── Detail/
│   │   ├── DetailView.swift
│   │   └── DetailViewModel.swift
│   │
│   ├── Search/
│   │   ├── SearchView.swift
│   │   ├── SearchViewModel.swift
│   │   └── SearchComponents/
│   │       ├── SearchBar.swift
│   │       └── SearchResultRow.swift
│   │
│   ├── Settings/
│   │   ├── SettingsView.swift
│   │   └── SettingsViewModel.swift
│   │
│   └── Onboarding/
│       ├── OnboardingView.swift
│       └── OnboardingViewModel.swift
│
├── Extensions/
│   ├── Date+Formatting.swift         # Foundation type extensions
│   ├── View+Modifiers.swift          # Custom SwiftUI view modifiers
│   └── String+Validation.swift
│
├── Resources/
│   ├── Assets.xcassets/
│   ├── Localizable.xcstrings
│   └── Fonts/                        # Custom fonts (if any)
│
└── Preview Content/
    ├── PreviewSampleData.swift
    └── MockServices.swift            # Mock services for previews
```

**Why this works for most apps:**

- Each feature is self-contained. Everything about "Search" lives in `Features/Search/`. A new developer can understand that feature by reading 2-3 files.
- Shared code lives in `Core/` and `Design/`. There's exactly one place to look for "how do I make a network request?" or "what's the standard button?"
- The `Design/` folder enforces visual consistency. Instead of hard-coding colors and spacing in every view, you reference tokens. Change once, update everywhere.
- `Extensions/` prevents the common problem of scattering extensions across feature folders where they're hard to discover.

**Key principles:**
- If a component is used by 2+ features, move it to `Design/Components/`.
- If a component is used by only one feature, keep it in that feature's subfolder.
- ViewModels own business logic. Views own layout. Services own side effects (networking, persistence).
- Never import a feature folder into another feature folder. Features communicate through `Core/` services and the navigation system.

**When to upgrade:** When you want to share code between an iOS app and a watchOS/macOS app, or when build times on the main target exceed 30 seconds, or when you have 4+ developers stepping on each other's files. Move to Modular SPM.

---

## 3. Modular SPM -- Multi-Package Architecture

Best for: large apps (15+ screens), multi-platform apps, teams of 4+ developers, apps that need shared libraries.

```
AppName/                              # Root directory
├── project.yml                       # XcodeGen config (imports local packages)
│
├── App/                              # Thin app shell -- just wires packages together
│   ├── AppNameApp.swift              # @main entry, imports feature packages
│   ├── AppState.swift
│   └── AppRouter.swift
│
├── Packages/                         # Each folder is a Swift Package (has Package.swift)
│   │
│   ├── Core/                         # Shared foundation -- every other package depends on this
│   │   ├── Package.swift
│   │   └── Sources/
│   │       └── Core/
│   │           ├── Models/
│   │           │   ├── Item.swift
│   │           │   └── User.swift
│   │           ├── Networking/
│   │           │   ├── NetworkService.swift
│   │           │   ├── NetworkError.swift
│   │           │   └── Endpoint.swift
│   │           ├── Persistence/
│   │           │   └── PersistenceService.swift
│   │           └── Utilities/
│   │               └── Logger.swift
│   │
│   ├── DesignSystem/                 # Visual language -- tokens and components
│   │   ├── Package.swift
│   │   └── Sources/
│   │       └── DesignSystem/
│   │           ├── Tokens/
│   │           │   ├── Spacing.swift
│   │           │   ├── Typography.swift
│   │           │   └── ColorTokens.swift
│   │           └── Components/
│   │               ├── PrimaryButton.swift
│   │               ├── CardView.swift
│   │               └── EmptyStateView.swift
│   │
│   ├── FeatureHome/                  # Each feature is its own package
│   │   ├── Package.swift             # Declares dependencies: Core, DesignSystem
│   │   └── Sources/
│   │       └── FeatureHome/
│   │           ├── HomeView.swift
│   │           ├── HomeViewModel.swift
│   │           └── Components/
│   │               └── HomeCard.swift
│   │
│   ├── FeatureSearch/
│   │   ├── Package.swift
│   │   └── Sources/
│   │       └── FeatureSearch/
│   │           ├── SearchView.swift
│   │           ├── SearchViewModel.swift
│   │           └── Components/
│   │               ├── SearchBar.swift
│   │               └── SearchResultRow.swift
│   │
│   ├── FeatureSettings/
│   │   ├── Package.swift
│   │   └── Sources/
│   │       └── FeatureSettings/
│   │           ├── SettingsView.swift
│   │           └── SettingsViewModel.swift
│   │
│   └── TestSupport/                  # Shared mocks and test helpers
│       ├── Package.swift
│       └── Sources/
│           └── TestSupport/
│               ├── MockNetworkService.swift
│               ├── MockModelContainer.swift
│               └── SampleData.swift
│
├── Tests/                            # Integration tests that span multiple packages
│   ├── IntegrationTests/
│   │   └── AppFlowTests.swift
│   └── UITests/
│       └── OnboardingUITests.swift
│
├── Resources/
│   ├── Assets.xcassets/
│   └── Localizable.xcstrings
│
└── CI/                               # CI/CD configuration
    ├── Fastfile
    └── ci-test.sh
```

**Example Package.swift for a feature package:**

```swift
// Packages/FeatureHome/Package.swift
// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "FeatureHome",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "FeatureHome", targets: ["FeatureHome"]),
    ],
    dependencies: [
        .package(path: "../Core"),
        .package(path: "../DesignSystem"),
    ],
    targets: [
        .target(
            name: "FeatureHome",
            dependencies: ["Core", "DesignSystem"]
        ),
        .testTarget(
            name: "FeatureHomeTests",
            dependencies: [
                "FeatureHome",
                .product(name: "TestSupport", package: "TestSupport"),
            ]
        ),
    ]
)
```

**Why this works for large apps:**

- **Build times drop.** SPM only recompiles packages that changed. If you edit FeatureHome, the Core package is not recompiled.
- **Dependency boundaries are enforced by the compiler.** A feature package literally cannot import another feature package unless you explicitly declare it in Package.swift. This prevents spaghetti dependencies.
- **Teams can own packages.** "Team A owns FeatureHome, Team B owns FeatureSearch." Clear ownership, fewer merge conflicts.
- **Code sharing is explicit.** Shared code lives in Core or DesignSystem. If you find yourself duplicating code between features, that's a signal to extract it into a shared package.
- **Testing is modular.** Each package has its own test target. You can run just the tests for the package you changed, not the entire app.

**Tradeoffs:**
- More boilerplate (each package needs a Package.swift).
- Initial setup takes longer.
- Navigation between packages requires a coordination layer in the App shell.
- Xcode's SPM resolution can be slow on first open (but caches after that).

---

## Migration Guide

### Simple to Feature-Based

1. Create `Core/`, `Design/`, `Features/`, `Extensions/` folders.
2. Move models from `Models/` to `Core/Models/`.
3. Move services from `Services/` to `Core/Services/`.
4. For each view in `Views/`, create a feature folder in `Features/` and move the view there.
5. Extract reusable components from `Views/Components/` to `Design/Components/`.
6. Run `xcodegen generate` to update the project.
7. Build. Fix any import issues. Commit.

Time estimate: 30-60 minutes for a small app.

### Feature-Based to Modular SPM

1. Create `Packages/` directory at the project root.
2. Extract `Core/` into `Packages/Core/` with its own `Package.swift`.
3. Extract `Design/` into `Packages/DesignSystem/`.
4. For each feature in `Features/`, create `Packages/Feature{Name}/`.
5. Update `project.yml` to reference local packages.
6. The `App/` folder becomes a thin shell that imports and wires packages.
7. Regenerate and build. Fix visibility issues (`public` access for types used across packages).

Time estimate: 2-4 hours for a medium app. The main work is adding `public` access modifiers.
