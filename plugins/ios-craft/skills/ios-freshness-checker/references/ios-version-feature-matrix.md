# iOS Version Feature Matrix

Key features unlocked by each iOS version. Use this to decide your deployment target and identify adoption opportunities.

## iOS 17 (2023)

| Feature | Framework | What It Enables |
|---------|-----------|----------------|
| **@Observable macro** | Observation | Simpler, more efficient state management — replaces ObservableObject |
| **SwiftData** | SwiftData | Modern persistence framework — replaces Core Data for new projects |
| **TipKit** | TipKit | Native feature discovery / onboarding tips |
| **StoreKit 2 views** | StoreKit | SubscriptionStoreView, ProductView — declarative IAP UI |
| **Interactive widgets** | WidgetKit | Buttons and toggles in widgets |
| **StandBy mode** | WidgetKit | Full-screen widget display when charging |
| **onChange two-param** | SwiftUI | `onChange(of:) { oldValue, newValue in }` |
| **Scrollable tab views** | SwiftUI | `.tabViewStyle(.sidebarAdaptable)` |
| **containerRelativeFrame** | SwiftUI | Size views relative to container without GeometryReader |
| **ScrollView improvements** | SwiftUI | `scrollTargetBehavior`, `scrollPosition` |
| **Sensory feedback** | UIKit/SwiftUI | `.sensoryFeedback(.impact, trigger:)` |
| **SymbolEffect** | SF Symbols | Animated symbol transitions (.bounce, .pulse, .variableColor) |
| **Privacy manifests** | Privacy | PrivacyInfo.xcprivacy required for certain APIs |
| **Journal suggestions** | JournalingSuggestions | Access to journaling data (photos, workouts, places) |

**Minimum devices:** iPhone XS, iPhone XR, iPhone SE (2nd gen)

## iOS 18 (2024)

| Feature | Framework | What It Enables |
|---------|-----------|----------------|
| **Control Center widgets** | WidgetKit | Custom controls in Control Center and Lock Screen |
| **App Intents in Control Center** | AppIntents | Direct actions from Control Center |
| **Customizable home screen** | System | Tinted icons, any placement (affects your icon) |
| **RealityKit improvements** | RealityKit | Spatial computing foundations |
| **AccessorySetupKit** | AccessorySetupKit | Streamlined Bluetooth/WiFi accessory pairing |
| **Swift 6 concurrency** | Swift | Full data race safety checking |
| **Mesh gradients** | SwiftUI | `MeshGradient` for complex gradient effects |
| **Zoom transitions** | SwiftUI | `.navigationTransition(.zoom)` |
| **SF Symbol animations** | SF Symbols | `.wiggle`, `.breathe`, `.rotate` effects |
| **Text formatting** | SwiftUI | Custom text renderers |
| **Swift Testing** | Testing | Modern test framework with `@Test` macro, replaces XCTest patterns |
| **Translation API** | Translation | On-device text translation |
| **FinanceKit** | FinanceKit | Access Apple Card transaction data |
| **Passkeys** | AuthenticationServices | Expanded passkey support |

**Minimum devices:** iPhone XS, iPhone XR, iPhone SE (2nd gen)

## iOS 19 (2025)

| Feature | Framework | What It Enables |
|---------|-----------|----------------|
| **Liquid Glass** | UIKit/SwiftUI | New design language with translucent, depth-aware surfaces |
| **Intelligence framework** | Intelligence | On-device AI model integration |
| **App Intents evolution** | AppIntents | Deeper Siri and Shortcuts integration |
| **Enhanced Live Activities** | ActivityKit | Richer live activity layouts and interactivity |
| **Swift 6.1** | Swift | Further concurrency refinements |
| **Improved navigation** | SwiftUI | New navigation patterns and transitions |
| **HealthKit expansions** | HealthKit | New health data types and workout APIs |
| **Advanced camera** | AVFoundation | Computational photography APIs |

**Minimum devices:** iPhone XS, iPhone XR, iPhone SE (2nd gen) — expected

## iOS 20 (2026) — Current

| Feature | Framework | What It Enables |
|---------|-----------|----------------|
| **Adaptive layouts** | SwiftUI | Enhanced responsive layout system |
| **On-device ML improvements** | CoreML | Larger model support, faster inference |
| **Privacy enhancements** | Privacy | Expanded privacy manifest requirements |
| **Performance APIs** | MetricKit | More granular performance reporting |
| **Swift 7** | Swift | Language evolution continues |

**Minimum devices:** TBD — check Apple's announcement

## Deployment Target Decision Matrix

| Your situation | Recommended minimum | Why |
|---------------|-------------------|-----|
| New app, no legacy users | iOS 17 or 18 | Access modern APIs, less compatibility code |
| Established app, large user base | iOS 16 or 17 | Balance features vs user retention |
| Enterprise / B2B | iOS 17 | Companies update devices regularly |
| Education | iOS 17 | Schools refresh on a 2-3 year cycle |
| Maximum reach | iOS 16 | Covers 98%+ of active devices |

## Feature Availability Quick Reference

When you want to use a specific API, find the minimum iOS version:

| I want to use... | Minimum iOS |
|-------------------|-------------|
| SwiftUI (basic) | 13 |
| Combine | 13 |
| NavigationStack / NavigationSplitView | 16 |
| Charts framework | 16 |
| PhotosPicker | 16 |
| @Observable | 17 |
| SwiftData | 17 |
| TipKit | 17 |
| Interactive widgets | 17 |
| StoreKit 2 views | 17 |
| containerRelativeFrame | 17 |
| PrivacyInfo.xcprivacy | 17 (required) |
| Control Center widgets | 18 |
| MeshGradient | 18 |
| Swift Testing (@Test) | 18 |
| Zoom navigation transitions | 18 |
| Translation API | 18 |

## Checking Adoption Rates

1. **Your app's data:** App Store Connect → App Analytics → Metrics → Active Devices → By iOS Version
2. **Apple's public data:** [Apple Developer Support page](https://developer.apple.com/support/app-store/) (updated quarterly)
3. **Rule of thumb:** Within 6 months of release, 70-80% of active devices run the latest iOS. Within 12 months, 85-90%.
