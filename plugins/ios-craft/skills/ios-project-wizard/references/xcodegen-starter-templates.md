# XcodeGen Starter Templates

Three annotated `project.yml` templates for different project complexities. Copy the appropriate template, customize the placeholders (marked with `___`), and run `xcodegen generate`.

---

## 1. Minimal -- SwiftUI Only

Use this when the app has no networking, no persistence, and no third-party dependencies. A pure SwiftUI app with a single target.

```yaml
# project.yml -- Minimal SwiftUI App
# Run: xcodegen generate
# Docs: https://github.com/yonaskolb/XcodeGen/blob/master/Docs/ProjectSpec.md

# The project name. This becomes the .xcodeproj filename and the default module name.
name: ___AppName___

# Global options that apply to every target in the project.
options:
  # The minimum Xcode version required to open this project.
  minimumXcodeGenVersion: "2.42"

  # The bundle ID prefix. Each target appends its own suffix.
  bundleIdPrefix: com.___yourname___

  # The Xcode build system version.
  xcodeVersion: "16.0"

  # Where generated source groups are placed relative to the project root.
  groupSortPosition: top

  # Generate schemes automatically from targets.
  generateEmptyDirectories: true

# Build settings shared across all targets.
settings:
  base:
    # Swift 6 enables strict concurrency checking and all upcoming language features.
    SWIFT_VERSION: "6.0"

    # The minimum iOS version this app supports.
    # iOS 17 gives you SwiftData, Observation framework, and modern SwiftUI APIs.
    IPHONEOS_DEPLOYMENT_TARGET: "17.0"

    # Enable Swift strict concurrency for data-race safety.
    SWIFT_STRICT_CONCURRENCY: complete

    # Build for both active architecture (debug speed) and all architectures (release).
    ONLY_ACTIVE_ARCH: true

    # Code signing -- set to manual for CI, automatic for local dev.
    CODE_SIGN_STYLE: Automatic

    # Development team ID. Find yours at https://developer.apple.com/account
    # Leave empty for personal/unsigned builds.
    DEVELOPMENT_TEAM: ""

# Define each build target.
targets:

  # ---------- Main App Target ----------
  ___AppName___:
    # The type of product this target produces.
    type: application

    # Which platform this target builds for.
    platform: iOS

    # Where the source files live, relative to project root.
    sources:
      - path: ___AppName___
        # Exclude test files from the main target.
        excludes:
          - "**/*Tests*"

    # Build settings specific to this target (override base settings).
    settings:
      base:
        # The full bundle identifier for this app.
        PRODUCT_BUNDLE_IDENTIFIER: com.___yourname___.___appname___

        # The name shown under the app icon on the home screen.
        PRODUCT_NAME: ___AppName___

        # Info.plist generation -- Xcode 15+ can auto-generate this.
        GENERATE_INFOPLIST_FILE: true

        # Required for SwiftUI apps -- tells iOS this is a SwiftUI lifecycle app.
        INFOPLIST_KEY_UIApplicationSceneManifest_Generation: true

        # Supported device orientations.
        INFOPLIST_KEY_UISupportedInterfaceOrientations: "UIInterfaceOrientationPortrait"

        # Which device families to support: 1 = iPhone, 2 = iPad, "1,2" = Universal.
        TARGETED_DEVICE_FAMILY: "1,2"

    # Schemes control how Xcode builds, runs, tests, and profiles your app.
    scheme:
      # Enable thread sanitizer in debug to catch concurrency bugs early.
      testTargets:
        - ___AppName___Tests
      environmentVariables:
        - variable: SWIFT_DETERMINISTIC_HASHING
          value: "1"
          isEnabled: true

  # ---------- Unit Test Target ----------
  ___AppName___Tests:
    type: bundle.unit-test
    platform: iOS

    sources:
      - path: ___AppName___Tests

    # This test target needs the main app to be built first.
    dependencies:
      - target: ___AppName___

    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.___yourname___.___appname___.tests
        GENERATE_INFOPLIST_FILE: true
        # Use the Swift Testing framework (not XCTest) for new projects.
        TEST_HOST: "$(BUILT_PRODUCTS_DIR)/___AppName___.app/$(BUNDLE_EXECUTABLE_FOLDER_PATH)/___AppName___"
        BUNDLE_LOADER: "$(TEST_HOST)"
```

---

## 2. With Networking -- URLSession Service Layer

Extends the minimal template with a networking service layer. Use when the app fetches data from APIs.

```yaml
# project.yml -- SwiftUI App with Networking
# Adds: URLSession service layer, Codable model patterns, async/await throughout.

name: ___AppName___

options:
  minimumXcodeGenVersion: "2.42"
  bundleIdPrefix: com.___yourname___
  xcodeVersion: "16.0"
  groupSortPosition: top
  generateEmptyDirectories: true

settings:
  base:
    SWIFT_VERSION: "6.0"
    IPHONEOS_DEPLOYMENT_TARGET: "17.0"
    SWIFT_STRICT_CONCURRENCY: complete
    ONLY_ACTIVE_ARCH: true
    CODE_SIGN_STYLE: Automatic
    DEVELOPMENT_TEAM: ""

    # Enable network inspection in Instruments for debugging API calls.
    # This has no performance impact in release builds.
    ENABLE_NETWORK_INSPECTION: true

targets:

  # ---------- Main App Target ----------
  ___AppName___:
    type: application
    platform: iOS

    sources:
      - path: ___AppName___
        excludes:
          - "**/*Tests*"

    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.___yourname___.___appname___
        PRODUCT_NAME: ___AppName___
        GENERATE_INFOPLIST_FILE: true
        INFOPLIST_KEY_UIApplicationSceneManifest_Generation: true
        INFOPLIST_KEY_UISupportedInterfaceOrientations: "UIInterfaceOrientationPortrait"
        TARGETED_DEVICE_FAMILY: "1,2"

        # App Transport Security -- require HTTPS for all network requests.
        # This is the default and you should NOT disable it.
        # If you need HTTP for local development, add a per-domain exception.
        INFOPLIST_KEY_NSAppTransportSecurity_NSAllowsArbitraryLoads: false

    # System frameworks the app links against.
    # Foundation includes URLSession. No extra frameworks needed for basic networking.
    dependencies: []

    scheme:
      testTargets:
        - ___AppName___Tests
      environmentVariables:
        - variable: SWIFT_DETERMINISTIC_HASHING
          value: "1"
          isEnabled: true

  # ---------- Unit Test Target ----------
  ___AppName___Tests:
    type: bundle.unit-test
    platform: iOS

    sources:
      - path: ___AppName___Tests

    dependencies:
      - target: ___AppName___

    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.___yourname___.___appname___.tests
        GENERATE_INFOPLIST_FILE: true
        TEST_HOST: "$(BUILT_PRODUCTS_DIR)/___AppName___.app/$(BUNDLE_EXECUTABLE_FOLDER_PATH)/___AppName___"
        BUNDLE_LOADER: "$(TEST_HOST)"

# ---------- Folder Structure Expectations ----------
# This template expects the following networking-related files:
#
# ___AppName___/
#   Core/
#     Services/
#       NetworkService.swift        -- async/await URLSession wrapper
#       NetworkError.swift          -- typed error enum
#     Models/
#       (your Codable API models)   -- structs matching API JSON responses
#
# ___AppName___Tests/
#   Core/
#     Services/
#       NetworkServiceTests.swift   -- tests using URLProtocol mock
#       MockURLProtocol.swift       -- URLProtocol subclass for test stubbing
```

---

## 3. Full Stack -- Networking + SwiftData + Testing + CI

The complete setup for a production app. Includes networking, persistence, comprehensive test targets, and a CI-friendly scheme.

```yaml
# project.yml -- Full Stack SwiftUI App
# Includes: Networking, SwiftData persistence, Unit + UI tests, CI scheme.

name: ___AppName___

options:
  minimumXcodeGenVersion: "2.42"
  bundleIdPrefix: com.___yourname___
  xcodeVersion: "16.0"
  groupSortPosition: top
  generateEmptyDirectories: true

  # Post-generation commands -- run these after xcodegen generate.
  postGenCommand: |
    echo "Project generated. Run 'open ___AppName___.xcodeproj' to open in Xcode."

settings:
  base:
    SWIFT_VERSION: "6.0"
    IPHONEOS_DEPLOYMENT_TARGET: "17.0"
    SWIFT_STRICT_CONCURRENCY: complete
    ONLY_ACTIVE_ARCH: true
    CODE_SIGN_STYLE: Automatic
    DEVELOPMENT_TEAM: ""

    # Enable these for better debugging and diagnostics.
    ENABLE_NETWORK_INSPECTION: true
    ENABLE_TESTING_SEARCH_PATHS: true

    # Optimization levels per configuration.
  configs:
    Debug:
      # No optimization in debug -- faster builds, better debugging.
      SWIFT_OPTIMIZATION_LEVEL: "-Onone"
      # Enable debug-only assertions.
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG"
      # Debug information format.
      DEBUG_INFORMATION_FORMAT: "dwarf"
    Release:
      # Whole-module optimization for release -- slower builds, faster app.
      SWIFT_OPTIMIZATION_LEVEL: "-Owholemodule"
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: ""
      DEBUG_INFORMATION_FORMAT: "dwarf-with-dsym"
      # Strip debug symbols in release for smaller binary.
      STRIP_INSTALLED_PRODUCT: true

targets:

  # ---------- Main App Target ----------
  ___AppName___:
    type: application
    platform: iOS

    sources:
      - path: ___AppName___
        excludes:
          - "**/*Tests*"
          - "**/*Mocks*"

    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.___yourname___.___appname___
        PRODUCT_NAME: ___AppName___
        GENERATE_INFOPLIST_FILE: true
        INFOPLIST_KEY_UIApplicationSceneManifest_Generation: true
        INFOPLIST_KEY_UISupportedInterfaceOrientations: "UIInterfaceOrientationPortrait"
        TARGETED_DEVICE_FAMILY: "1,2"
        INFOPLIST_KEY_NSAppTransportSecurity_NSAllowsArbitraryLoads: false

        # SwiftData requires these entitlements for iCloud sync (optional).
        # Uncomment if you want CloudKit sync:
        # CODE_SIGN_ENTITLEMENTS: ___AppName___/___AppName___.entitlements

    # System frameworks this target links against.
    dependencies:
      # SwiftData is automatically available via import -- no explicit linking needed.
      # Add framework dependencies here if you use UIKit, MapKit, etc.
      - sdk: SwiftData.framework

    scheme:
      testTargets:
        - ___AppName___Tests
        - ___AppName___UITests
      environmentVariables:
        - variable: SWIFT_DETERMINISTIC_HASHING
          value: "1"
          isEnabled: true

  # ---------- Unit Test Target ----------
  # Tests for business logic, ViewModels, services, and models.
  ___AppName___Tests:
    type: bundle.unit-test
    platform: iOS

    sources:
      - path: ___AppName___Tests

    dependencies:
      - target: ___AppName___

    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.___yourname___.___appname___.tests
        GENERATE_INFOPLIST_FILE: true
        TEST_HOST: "$(BUILT_PRODUCTS_DIR)/___AppName___.app/$(BUNDLE_EXECUTABLE_FOLDER_PATH)/___AppName___"
        BUNDLE_LOADER: "$(TEST_HOST)"

  # ---------- UI Test Target ----------
  # Tests for user-facing flows: navigation, data display, interactions.
  ___AppName___UITests:
    type: bundle.ui-testing
    platform: iOS

    sources:
      - path: ___AppName___UITests

    dependencies:
      - target: ___AppName___

    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: com.___yourname___.___appname___.uitests
        GENERATE_INFOPLIST_FILE: true

# ---------- Named Schemes ----------
# A CI-specific scheme that runs all tests without code signing.
schemes:

  # The default development scheme (auto-generated from targets above).
  # Use this for daily development.

  # CI scheme -- use this in GitHub Actions, Xcode Cloud, or other CI systems.
  ___AppName___-CI:
    build:
      targets:
        ___AppName___: all
        ___AppName___Tests: [test]
        ___AppName___UITests: [test]

    test:
      config: Debug
      targets:
        - ___AppName___Tests
        - ___AppName___UITests
      # Gather code coverage for the main target.
      gatherCoverageData: true
      coverageTargets:
        - ___AppName___

      environmentVariables:
        - variable: SWIFT_DETERMINISTIC_HASHING
          value: "1"
          isEnabled: true
        # Disable animations in UI tests for speed and reliability.
        - variable: UITEST_DISABLE_ANIMATIONS
          value: "1"
          isEnabled: true

    run:
      config: Debug
      environmentVariables:
        - variable: SWIFT_DETERMINISTIC_HASHING
          value: "1"
          isEnabled: true

    profile:
      config: Release

    analyze:
      config: Debug

    archive:
      config: Release

# ---------- Expected Folder Structure ----------
#
# ___AppName___/
#   App/
#     ___AppName___App.swift
#     AppState.swift
#   Core/
#     Models/
#       Item.swift                    -- @Model SwiftData entity
#     Services/
#       NetworkService.swift          -- async/await URLSession wrapper
#       NetworkError.swift
#       PersistenceService.swift      -- SwiftData ModelContainer config
#     Utilities/
#   Design/
#     Tokens/
#       Spacing.swift
#       Typography.swift
#     Components/
#   Features/
#     Home/
#       HomeView.swift
#       HomeViewModel.swift
#   Extensions/
#   Resources/
#     Assets.xcassets/
#
# ___AppName___Tests/
#   Core/
#     Services/
#       NetworkServiceTests.swift
#     Models/
#       ItemTests.swift
#   Mocks/
#     MockURLProtocol.swift
#     MockModelContainer.swift
#
# ___AppName___UITests/
#   HomeUITests.swift
#   Helpers/
#     XCUIApplication+Launch.swift
```

---

## Customization Checklist

After copying a template, replace every `___placeholder___`:

| Placeholder | Replace with | Example |
|------------|-------------|---------|
| `___AppName___` | Your app name (PascalCase, no spaces) | `RecipeBox` |
| `___yourname___` | Your reverse-DNS identifier | `johndoe` |
| `___appname___` | Your app name (lowercase) | `recipebox` |

Then run:

```bash
xcodegen generate
```

If you see errors, the most common fixes are:
1. **"Source path not found"** -- create the directory first, then regenerate.
2. **"Invalid bundle identifier"** -- bundle IDs must be lowercase, alphanumeric, with dots only.
3. **"Scheme not found"** -- check that target names match exactly between `targets:` and `schemes:`.
