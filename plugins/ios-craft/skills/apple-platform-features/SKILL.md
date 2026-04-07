---
name: apple-platform-features
user-invocable: false
description: >
  Use when implementing, reviewing, or scaffolding Apple platform capabilities
  beyond core UI, especially WidgetKit, App Intents and Shortcuts, Live
  Activities, ActivityKit and Dynamic Island, notifications, background tasks,
  App Clips, StoreKit 2, universal links, Handoff, extensions, or Focus
  Filters across iOS, iPadOS, macOS, and watchOS. Do not use for basic app
  architecture or general SwiftUI layout work.
version: 1.2.0
last_verified: "2025-10-28"
update_frequency: "annually"
next_review: "2026-06"
ios_versions_covered: "17-26"
tags:
  - ios
  - ipadOS
  - macOS
  - watchOS
  - swift
  - widgetkit
  - app-intents
  - activitykit
  - notifications
  - background-tasks
  - storekit
  - app-clips
  - universal-links
  - handoff
  - extensions
  - focus-filters
---

# apple-platform-features

> **Purpose.** This Skill packages best practices and scaffolds for Apple platform features so Claude can generate
> production-ready widget implementations, App Intents, Live Activities, notifications, background work,
> commerce flows, and extensions, while keeping you in control of entitlements, Info.plist, and review-readiness.

**Contents**
- [Overview](#overview)
- [When to Use](#when-to-use)
- [Decision Framework](#decision-framework)
- [WidgetKit Deep Dive](#widgetkit-deep-dive)
  - [Timeline Management](#timeline-management)
  - [Widget Families](#widget-families)
- [App Intents Framework](#app-intents-framework)
  - [Custom Intents & Parameters](#custom-intents--parameters)
  - [App Shortcuts](#app-shortcuts)
  - [Shortcuts Integration](#shortcuts-integration)
- [Live Activities](#live-activities)
  - [ActivityKit](#activitykit)
  - [Dynamic Island](#dynamic-island)
- [Push Notifications](#push-notifications)
  - [Rich Notifications](#rich-notifications)
  - [Notification Actions](#notification-actions)
- [Background Tasks (BGTaskScheduler)](#background-tasks-bgtaskscheduler)
- [App Clips](#app-clips)
- [StoreKit 2](#storekit-2)
  - [In-App Purchases](#in-app-purchases)
  - [Subscriptions](#subscriptions)
- [Handoff](#handoff)
- [Universal Links](#universal-links)
- [Share Extensions](#share-extensions)
- [Action Extensions](#action-extensions)
- [watchOS Complications](#watchos-complications)
- [Focus Filters](#focus-filters)
- [Best Practices Per Feature](#best-practices-per-feature)
- [Anti-Patterns](#anti-patterns)
- [Troubleshooting](#troubleshooting)
- [App Review Guidelines](#app-review-guidelines)
- [Tool Reference](#tool-reference)

---

## Overview

This Skill follows the **Claude Agent Skills** format: a self-contained folder with a `SKILL.md` manifest,
supporting scripts, templates, and examples designed to be *invoked* by the model when relevant to your task.
It is optimized for rapid scaffolding and accurate configuration of Apple platform features.

**What you get**
- Python **generators** that emit complete Swift files, entitlements, and Info.plist additions.
- A **docs/** set with concise, step-by-step integration and **testing strategies** per feature.
- A **swift/** library of **production-grade examples** for widgets, intents, activities, notifications, background work, and more.
- **examples/** JSON configs you can tweak and pass to the generators.

**Prereqs**
- Xcode 16+ (Swift 6+) recommended. The iOS 18 SDK requires Xcode 16【963890304086046†screenshot】.
- Apple developer account for provisioning, push, and StoreKit testing.
- For App Clips, Universal Links, and purchases: a reachable domain + App Store Connect config.

---

## Platform Features – Annual Update Critical

Apple platform capabilities evolve every year at **WWDC** and again with the fall OS release.  To avoid using obsolete APIs or missing new functionality, **always verify current capabilities** before implementing.  The guidelines below outline a repeatable research routine.

### Pre‑Implementation Research

For each feature you plan to use, run targeted web searches with the desired iOS version/year to understand the latest capabilities and limitations:

1. **WidgetKit**:
   - `web_search("WidgetKit iOS [target] new features")`
   - `web_search("WidgetKit [current year] limitations")`
2. **App Intents**:
   - `web_search("App Intents iOS [version] updates")`
   - `web_search("App Shortcuts [year] gallery guidelines")`
3. **Live Activities**:
   - `web_search("ActivityKit iOS [version] capabilities")`
   - `web_search("Dynamic Island [year] design guidelines")`
4. **StoreKit 2**:
   - `web_search("StoreKit 2 [year] API changes")`
   - `web_search("App Store commerce updates [year]")`
5. **Notifications**:
   - `web_search("UNNotification iOS [version] features")`
   - `web_search("Push notification limits [year]")`

### WWDC & Release Cycle

Platform frameworks receive **major updates in June** (WWDC) and are finalized during the fall OS release.  To stay current:

1. **After WWDC (June)**:
   - Watch platform sessions for WidgetKit, App Intents, ActivityKit, StoreKit 2, Notifications, etc.
   - Read “What’s New” documentation on developer.apple.com and iOS/macOS release notes【963890304086046†screenshot】.
   - Check beta release notes for breaking changes.
   - Prototype new APIs on the latest betas.
2. **After OS Release (September)**:
   - Confirm features behave as documented and aren’t delayed.
   - Re‑run targeted searches above to capture last‑minute changes.

### When to Trigger a New Research Pass

- A user asks for the **“latest”** or **“new”** features.
- A user targets an iOS version higher than the last verified release.
- Unexpected runtime errors or performance regressions appear.
- An integration relies on remote push, complex intent parameters or interactive widgets (all of which may have changed).

### Primary Sources

### WWDC 2025 Updates (iOS 19/26 Highlights)

Apple’s 2025 developer conference introduced substantial updates across platform features.  Key highlights include:

- **Liquid Glass design** — widgets and Live Activities can adopt translucent glass surfaces and accent lighting. When building widgets or Live Activities on iOS 19+, consult the Liquid Glass HIG and use the new `glassBackgroundEffect(in:displayMode:)` APIs【660665604876454†L40-L119】.
- **App Intents expansions** — new macros such as **`#SnippetIntent`**, **`@IndexedEntity`**, and **`IntentValueQuery`** allow you to index entities for search, create generative snippets, and offer dynamic options in Siri and Spotlight【660665604876454†L40-L119】.  Always verify which macros ship in your target OS and add the necessary `@available` guards.
- **Live Activities enhancements** — ActivityKit gains support for **scheduled start times**, **multi‑device display (Mac & CarPlay)**, and improved push token handling, enabling developers to prepare and queue activities ahead of time【660665604876454†L40-L119】.
- **Interactive widgets** — widgets can now accept **App Intent parameters** from user interactions, enabling in‑place updates without opening the host app.  Use `AppIntentTimelineProvider` and parameterized intents when targeting iOS 19 or later.
- **RealityKit & visionOS** — volumetric scene rendering and body tracking improvements extend to visionOS 2.  If your app includes AR/VR, watch the relevant sessions and check release notes.

Whenever you integrate these features, run updated searches (e.g., `web_search("Liquid Glass iOS 19 design")`) to retrieve the latest docs and sample code.  The rest of this Skill has not yet been fully revised for iOS 19/26, so treat examples as guidance and consult current WWDC materials before coding.


- Official docs on developer.apple.com and Human Interface Guidelines.
- WWDC session videos/transcripts.
- iOS/macOS/tvOS release notes and Apple Developer Forums.

**Last verified**: 2025‑10‑28 (covering iOS 17–19).  
**Next update needed**: after **WWDC 2026** (expected iOS 20).  Update frequency: **at least annually**.

## Feature Availability Matrix

| Feature | iOS 16 | iOS 17 | iOS 18 | iOS 19 | Notes |
|---|---|---|---|---|
| **Interactive Widgets** | Limited | Full | Enhanced | Parameterized & glass | iOS 18 adds push‑triggered reloads via `WidgetPushHandler`; iOS 19 introduces interactive parameters via App Intents and Liquid Glass styling【924387249390674†screenshot】. |
| **Live Activities** | Basic | Expanded | Enhanced | Scheduled & multi‑device | iOS 18 introduced improved payloads; iOS 19 allows scheduled start times and display on Mac/CarPlay【878419748504667†screenshot】. Broadcast updates to subscribers via ActivityKit channels (watchOS support)【878419748504667†screenshot】. |
| **App Intents** | Basic | Enhanced | Expanded | Snippets & indexing | iOS 18 introduces `SnippetIntent`, `IndexedEntity`, `IntentValueQuery`; iOS 19 expands with generative snippets and additional domains【868333587505233†screenshot】. |
| **StoreKit 2** | Basic | Improved | Enhanced | Unchanged | Use `SubscriptionStoreView` and custom control styles; iOS 19 brings minor improvements in server‑driven offers【587056330330254†screenshot】. |
| **Notifications** | Basic | Expanded | Enhanced | Minor | iOS 18 introduced offline queue store and collapsed APNs headers; iOS 19 includes minor reliability enhancements【888881087539299†screenshot】. |
| **Background Tasks** | Refresh & processing | Same | New continuous tasks | Same | iOS 18 introduces `BGContinuedProcessingTask`; no major updates in iOS 19【788056121693748†screenshot】. |
| **App Clips** | Basic | Improved | Enhanced | Same | iOS 18 allows demo versions up to 100 MB with auto‑generated URLs; iOS 19 retains these limits【482897523063529†screenshot】. |

**Note**: This table is a snapshot.  Always verify the actual availability using the search routine above for your target OS.

## Known Limitations (Current)

The following limitations apply as of the iOS 17–18 era.  Check for updates each year:

- **Widget refresh rate**: Widgets cannot update arbitrarily often; rely on **timelines** and `WidgetPushHandler` to request reloads.  Frequent reloads may be throttled.
- **Live Activity lifespan**: Activities are time‑bounded; the system can end them after roughly 8 hours.  Payload sizes and update frequency are capped; large payloads will be truncated.
- **App Intent parameters**: Complex parameter types may not be supported in Siri/Shortcuts; prefer simple primitives or adopt `AppEntity` and `IntentValueQuery` for discovery【868333587505233†screenshot】.
- **StoreKit testing**: App Store server notifications and promotional offer codes may behave differently between sandbox and production; test both.
- **Background tasks**: Even with `BGContinuedProcessingTask`, the system can terminate long‑running tasks for resource reasons【788056121693748†screenshot】.
- **Push delivery**: APNs collapses notifications with the same `apns-collapse-id`; offline queue stores multiple pushes per bundle ID but may delay delivery【888881087539299†screenshot】.
- **App Clips**: Demo clips cannot access persistent user data or in‑app purchases; they are limited to 100 MB and require an explicit handoff to the full app【482897523063529†screenshot】.

---

## When to Use

Use this Skill whenever you want Claude to:
- propose a platform integration plan (e.g., widgets vs. live activities),
- generate **scaffold code** (Swift) and **configuration** (entitlements/Info.plist),
- enumerate **gotchas**, **App Review** flags, and **test plans** for each feature,
- keep your **architectural decisions** consistent across multiple features and targets.

Avoid when you only need a single snippet and no cross-feature planning.

---

## Decision Framework

Use this quick matrix to decide which features to implement first:

| Goal | Consider | Why | Cost |
|---|---|---|---|
| Glanceable status | **WidgetKit** | Persistent presence; low-friction re-engagement | Low |
| Time-bounded, real-time | **Live Activity (ActivityKit)** | Lock Screen + Dynamic Island visibility | Medium |
| Voice/automation entry points | **App Intents & Shortcuts** | Spotlight/Siri/Shortcuts discoverability | Low |
| Repeated background refresh | **BGTaskScheduler** | Reliable refresh without foreground app | Medium |
| 1-tap lightweight flow | **App Clip** | On-demand, tiny footprint, link/NFC launch | Medium |
| Monetization | **StoreKit 2** | Native, on-device purchases/subscriptions | Medium–High |
| Deep navigation from web | **Universal Links** | Trustworthy app-site redirect | Low |
| Cross-device continuation | **Handoff** | Resume context across Apple devices | Low |
| Sharing into your app | **Share/Action Extensions** | Ubiquitous content ingest points | Low–Medium |
| Watch engagement | **Complications** | Always-visible bite-sized data | Medium |

---

## WidgetKit Deep Dive

### When to use
- You need *glanceable*, periodically refreshed content.
- People benefit from *multiple sizes* or *accessory* variants.

### Setup steps
1. Add a **Widget Extension** target.
2. Implement `TimelineProvider` (or `AppIntentTimelineProvider` for configurable widgets).
3. Provide placeholder/snapshot/timeline entries; pick an **update policy**.
4. Add supported **families** and **configurations**.
5. Provide **previews** for common states.

### Code example (see: `swift/widgets/WeatherWidget.swift`)
```swift
import WidgetKit
import SwiftUI

struct WeatherEntry: TimelineEntry {
    let date: Date
    let temperature: Int
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> WeatherEntry { .init(date: .now, temperature: 72) }
    func getSnapshot(in context: Context, completion: @escaping (WeatherEntry) -> Void) {
        completion(.init(date: .now, temperature: 72))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WeatherEntry>) -> Void) {
        let now = Date()
        let entries = (0..<5).map { offset in
            WeatherEntry(date: Calendar.current.date(byAdding: .hour, value: offset, to: now)!, temperature: 60 + offset)
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct WeatherWidgetEntryView: View {
    var entry: WeatherEntry
    var body: some View { Text("\(entry.temperature)°") }
}
```

### Gotchas
- Widgets **don’t** run arbitrary background code; they consume **timelines**. Use **BGTaskScheduler** for data refresh when needed.
- Prefer **server-driven timelines** for low-power updates.
- Minimize network/decoding in the provider; push heavy work into your app/process.

### What’s New (iOS 17–18)

iOS 17 introduced **interactive widgets**, allowing **Button** and **Toggle** controls to perform lightweight actions directly from the widget.  iOS 18 builds on this foundation:

- **Push‑triggered reloads**: Register a `WidgetPushHandler` to receive **WidgetKit push notifications** and request timeline reloads on demand【924387249390674†screenshot】.
- **Liquid Glass & accenting**: Use `WidgetAccentedRenderingMode` and `widgetAccentable()` to specify glass or paper textures and accent colors on iPhone, iPad and Vision Pro【924387249390674†screenshot】.
- **Control widgets**: On watchOS and macOS, embed `ControlWidgetButton` or `ControlWidgetToggle` to surface actions in Control Center or the Lock Screen【924387249390674†screenshot】.
- **AccessoryWidgetGroup**: Provide up to three content views within a single accessory widget and choose between `circular` or `roundedSquare` style【129841997161452†screenshot】.
- **Vision Pro enhancements**: Choose elevated or recessed mounting and specify layouts for each `LevelOfDetail` to look great in spatial computing【924387249390674†screenshot】.
- **Relevance & configuration on watchOS**: Use `RelevanceConfiguration` and `AppIntentConfiguration` to let people adjust a watchOS widget’s relevance and behavior【924387249390674†screenshot】.

---

## Timeline Management

**Placeholder** renders in the gallery; **snapshot** renders in-app previews; **timeline** drives the actual updates.
Use `.after(Date)` or `.atEnd` depending on whether you can compute the next update time.
For event-driven updates, call `WidgetCenter.shared.reloadTimelines(ofKind:)` from the host app after background refresh.

**Tip:** For **Intent-configurable** widgets, prefer `AppIntentTimelineProvider` and `ConfigurationAppIntent`.

---

## Widget Families

Common families: `.systemSmall`, `.systemMedium`, `.systemLarge`, `.systemExtraLarge` (iPad/macOS), and accessory variants on Apple Watch.
Design for *density*: the smaller the family, the fewer text lines and the bolder the numbers. Provide previews per family.

---

## App Intents Framework

### When to use
- You want to expose **app actions** to **Shortcuts**, **Siri**, **Spotlight**, and **widgets**.
- You need **parameterized** commands and **phrases**.

### Setup steps
1. Add `AppIntents` to your app/extension.
2. Define an `AppIntent` type with `@Parameter` properties.
3. Provide **phrases** and a **perform()** implementation.
4. For **App Shortcuts**, annotate with `@MainActor` and include a `static var title`/`description`.

### Code example (see: `swift/app_intents/AddTaskIntent.swift`)
```swift
import AppIntents

struct AddTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Task"
    static var description = IntentDescription("Create a task with priority and due date.")

    @Parameter(title: "Title") var titleText: String
    @Parameter(title: "Priority") var priority: Int
    @Parameter(title: "Due", default: Date.now.addingTimeInterval(3600)) var due: Date

    static var parameterSummary: some ParameterSummary {
        Summary("Add \(\$titleText) priority \(\$priority) due \(\$due)")
    }

    func perform() async throws -> some IntentResult {
        // Persist to your model
        return .result(value: "Task added: \(titleText)")
    }
}
```

### Gotchas
- Keep parameters **few & clear**; rely on **entities** for rich selection (e.g., projects, lists).
- **App Shortcuts** appear in Spotlight; design **phrases** people will speak and type.
- For **Focus Filters**, define filter intents that adapt your app’s behavior (see **Focus Filters** section).

### What’s New (iOS 17–18)

iOS 18 significantly expands the App Intents framework:

- **SnippetIntent**: Create intents that conform to `SnippetIntent` to display an interactive snippet in Siri or Spotlight【868333587505233†screenshot】.
- **IndexedEntity & indexing macros**: Mark `AppEntity` types as `IndexedEntity` and use `@Property(indexingKey:)` or `@ComputedProperty(indexingKey:)` to make them discoverable in Spotlight【868333587505233†screenshot】.
- **IntentValueQuery**: Integrate with Apple Intelligence by providing app entities via `IntentValueQuery`【868333587505233†screenshot】.
- **Transferable AppEntity**: Conform entities to `Transferable` and associate them with a `NSUserActivity`’s `appEntityIdentifier` to surface onscreen content to Siri【868333587505233†screenshot】.
- **Domains & Siri integration**: Adopt new **App intent domains** such as controls, camera capture (`CameraCaptureIntent`) and audio capture (`AudioRecordingIntent`) to surface actions in Siri, Control Center and Lock Screen【868333587505233†screenshot】.
- **ControlConfigurationIntent**: Define controls that appear in the Control Center or Action button (Vision Pro) with customizable icons and titles【868333587505233†screenshot】.

---

## Custom Intents & Parameters

- Use `AppEntity` to back-selectable items (e.g., *Task*, *Project*). Implement `Query` to fetch/suggest entities.
- Prefer **typed** parameters. Use `@Parameter(.intent)` with validation to guard against invalid input.
- Provide **ParameterSummary** to make results readable.

---

## App Shortcuts

- Surface your top actions via **App Shortcuts** collections.
- Provide titles/descriptions that make sense in **Spotlight** and **Shortcuts**.
- Use **Donate** APIs from within the app to suggest relevant shortcuts based on user behavior.

---

## Shortcuts Integration

- Test in the **Shortcuts** app: parameters, error messages, multi-step flows.
- Design **idempotent** actions—running them twice should be safe.
- Return **friendly strings** and **entity outputs** for chaining.

---

## Live Activities

### When to use
- Time-bounded, *observable* processes (delivery ETA, workouts, timers, rides) that benefit from **Lock Screen** and **Dynamic Island** visibility.

### Setup steps
1. Define `ActivityAttributes` and `ContentState`.
2. Present with `Activity.request(...)` from the app, or **remotely** via push.
3. Update and end with ActivityKit APIs or APNs updates.
4. Provide **Dynamic Island** presentation for iPhone with a notch cutout.

### Code example (see: `swift/live_activities/PizzaDeliveryLiveActivity.swift`)
```swift
import ActivityKit
import WidgetKit
import SwiftUI

struct PizzaDeliveryAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var minutesRemaining: Int
        var stage: String
    }
    var orderNumber: String
}

// Requires iOS 17+ for interactive Live Activity features.
@available(iOS 17.0, *)
struct PizzaDeliveryLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PizzaDeliveryAttributes.self) { context in
            VStack {
                Text("Order #\(context.attributes.orderNumber)")
                Text("\(context.state.minutesRemaining)m • \(context.state.stage)")
            }
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { Text("⏱") }
                DynamicIslandExpandedRegion(.center) { Text("\(context.state.minutesRemaining)m") }
                DynamicIslandExpandedRegion(.trailing) { Text(context.state.stage) }
            } compactLeading: {
                Text("⏱")
            } compactTrailing: {
                Text("\(context.state.minutesRemaining)m")
            } minimal: {
                Text("\(context.state.minutesRemaining)")
            }
        }
    }
}
```

### Gotchas
- Activities are **ephemeral**; ensure you **end** them.
- Remote updates require **push entitlement** and **ActivityKit push token** handling.
- Keep payloads **small**; avoid sensitive data on the Lock Screen.

### What’s New (iOS 17–18)

iOS 17 enhanced ActivityKit with remote scheduling and watchOS integration, and iOS 18 takes Live Activities further:

- **Mac & CarPlay support**: Live Activities automatically appear in the Mac menu bar and CarPlay dashboard【878419748504667†screenshot】.
- **Scheduled start**: Call `Activity.request(attributes:content:pushType:style:alertConfiguration:start:)` to schedule an activity to begin at a future time【878419748504667†screenshot】.
- **Broadcast updates**: Use ActivityKit’s **broadcast** capability to send Live Activity updates to people subscribed to your channel (e.g., sports scores)【878419748504667†screenshot】.
- **Smart Stack on watchOS**: Live Activities participate in the watchOS Smart Stack, offering glanceable progress on Apple Watch【878419748504667†screenshot】.
- **Remote push improvements**: iOS 18 relaxes frequency limits for remote updates when using push tokens, but payload sizes remain capped; verify production limits.

---

## ActivityKit

- Use `ActivityAuthorizationInfo()` to check availability and state.
- For **remote** updates, request the **push token** via `Activity.pushTokenUpdates` and send updates through your server.
- Test with **APNs sandbox** and **time accelerations** (Debug > Simulate Location/Time).

---

## Dynamic Island

- Provide **expanded**, **compact leading/trailing**, and **minimal** presentations.
- Prioritize **glanceable** numbers and **clear** affordances.
- Avoid overly long text; prefer **symbols** and **short labels**.

---

## Push Notifications

### When to use
- Engagement, reminders, background content updates, or **remote Live Activity** updates.

### Setup steps
1. Request authorization via `UNUserNotificationCenter`.
2. Register for **APNs** and handle the **device token**.
3. Create categories and actions for interactivity.
4. For rich content, add a **Notification Content Extension**.

### Code example (see: `swift/notifications/NotificationsManager.swift`)
```swift
import UserNotifications
import UIKit

final class NotificationsManager: NSObject, UNUserNotificationCenterDelegate {
    func requestAuthorization() async throws {
        let center = UNUserNotificationCenter.current()
        try await center.requestAuthorization(options: [.alert, .badge, .sound, .provisional])
        await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
        center.delegate = self
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        // Route based on actionIdentifier
    }
}
```

### Rich Notifications
- Use **attachments** (`UNNotificationAttachment`) and a **content extension** to render custom UI.
- Keep media sizes reasonable; large downloads can be truncated by the system.

### Notification Actions
- Define **foreground** vs **background** actions carefully.
- For **authentication**, prefer **.authenticationRequired** to gate sensitive actions.

### What’s New (iOS 17–18)

- **Offline queue store**: APNs can queue multiple notifications per bundle identifier when a device is offline; the system delivers them when the device reconnects【888881087539299†screenshot】.
- **Collapsed pushes**: Use the `apns-collapse-id` header to allow multiple pushes to be collapsed into a single notification for efficiency【888881087539299†screenshot】.
- **Live Activity broadcasts**: The same broadcast mechanism used by Live Activities can deliver notifications to people who subscribe to your channel (e.g., sports scores or event updates)【888881087539299†screenshot】.
- **Focus filtering**: On iOS 18, notifications respect Focus filter intents; design categories and summaries with Focus modes in mind.

---

## Background Tasks (BGTaskScheduler)

### When to use
- Periodic refresh, indexing, maintenance, or post-download processing without the app foregrounded.

### Setup steps
1. Add identifiers and capabilities; register in `application(_:didFinishLaunching:)`.
2. Schedule tasks (refresh/processing) with earliest begin date.
3. Keep work **short** and **idempotent**; always **setTaskCompleted**.

### Code example (see: `swift/background_tasks/BackgroundTasks.swift`)
```swift
import BackgroundTasks

enum BGIdentifiers {
    static let refresh = "com.example.app.refresh"
    static let processing = "com.example.app.processing"
}

func registerBackgroundTasks() {
    BGTaskScheduler.shared.register(forTaskWithIdentifier: BGIdentifiers.refresh, using: nil) { task in
        scheduleAppRefresh()
        Task { await refreshData(); task.setTaskCompleted(success: true) }
    }
}
```

### Gotchas
- The system optimizes scheduling; **don’t** expect exact timing.
- Declare **background modes** only as needed; over-declaring can delay review.

### What’s New (iOS 17–18)

- **Continuous background tasks**: iOS 18 introduces `BGContinuedProcessingTask` (continuous background tasks) to allow critical work to continue after your app goes to the background【788056121693748†screenshot】. Use this when a process such as training an ML model or processing photos must run for an extended time.
- **Improved fairness**: The scheduler balances tasks across apps to reduce starved tasks; schedule tasks judiciously and observe `BGTaskScheduler.debugLog()` for insights.

---

## App Clips

### When to use
- A **1-tap**, tiny slice of your app for a focused flow, launched by links, NFC, QR, Maps, or suggested by Siri.

### Setup steps
1. Add an **App Clip** target; define invocation **URL** and **Experiences**.
2. Keep binaries **small**; use **on-demand resources**.
3. Handle **ephemeral** authorization (e.g., location) and **handoff** to full app.

### What’s New (iOS 17–18)

- **Demo App Clips**: Make a demo version of your app or game available as an App Clip. Apple automatically generates a demo URL, and the clip can be up to 100 MB in size【482897523063529†screenshot】.
- **Physical invocations**: iOS 18 supports more physical invocation types (NFC, visual codes); test across mediums【482897523063529†screenshot】.
- **Background assets**: Download additional assets for your App Clip in the background using **Background Assets** to keep the initial binary small【482897523063529†screenshot】.

### Code example (see: `swift/app_clip/AppClipSample.swift`)
```swift
import SwiftUI

@main
struct AppClipSample: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in /* route lightweight flow */ }
        }
    }
}
```

### Gotchas
- App Clips can’t access everything (e.g., persistent purchases). Design a **handoff** path to the full app.
- Keep the **launch time** snappy—cold boot is part of the experience.

---

## StoreKit 2

### When to use
- One-time purchases, consumables, and **subscriptions** with native receipts and on-device validation.

### Setup steps
1. Define products in **App Store Connect**.
2. Use `Product.products(for:)` to fetch; `product.purchase()` to buy.
3. Observe `Transaction.updates` and verify with `Transaction.currentEntitlements`.

### Code example (see: `swift/storekit/StoreKit2Purchase.swift`)
```swift
import StoreKit

@MainActor
final class Store: ObservableObject {
    @Published var products: [Product] = []
    @Published var purchasedIDs: Set<String> = []

    func load() async throws {
        products = try await Product.products(for: ["pro_monthly", "pro_yearly"])
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result { purchasedIDs.insert(t.productID) }
        }
    }

    func buy(_ product: Product) async throws {
        let result = try await product.purchase()
        if case .success(let verification) = result, case .verified(let t) = verification {
            purchasedIDs.insert(t.productID)
            await t.finish()
        }
    }
}
```

### In-App Purchases
- Prefer **non-consumables** for unlocks; **consumables** for credits.
- Always **finish** transactions and update **entitlements** immediately.

### Subscriptions
- Surface **manage/cancel** entry points. Respect **family sharing** and **refund** flows.

### What’s New (iOS 17–18)

- **SubscriptionStoreView**: Build an in‑app subscription store with `SubscriptionStoreView` and customize its layout/appearance【587056330330254†screenshot】.
- **Custom control styles**: Use `SubscriptionStoreButton` and `SubscriptionStorePicker` with picker styles (tabs, vertical stacks) and choose placement via `subscriptionStoreControlStyle(_:placement:)`【587056330330254†screenshot】.
- **Promotional testing**: Test subscription group display names and promotional icons in StoreKit Testing【587056330330254†screenshot】.
- **Win‑back offers & offer codes**: Configure win‑back offers for previously subscribed customers; create Mac App Store offer codes and test them in the sandbox【587056330330254†screenshot】.

---

## Handoff

- Use `NSUserActivity` with a well-defined **activityType** and **userInfo**.
- Update the activity as state changes; implement `scene(_:continue:)` to resume on target devices.
- Keep payloads **small** and **privacy-preserving**.

---

## Universal Links

- Host **apple-app-site-association**; declare **Associated Domains** in entitlements.
- Implement `SceneDelegate.scene(_:continue:)` or SwiftUI `.onOpenURL` to route.
- Provide **fallback** for users without the app installed.

---

## Share Extensions

- Add a **Share Extension** target; process incoming items using `NSExtensionItem` and **item providers**.
- Use **App Groups** to communicate with the host app; keep memory and time budgets in mind.
- Consider a **custom UI** via `UIHostingController` for SwiftUI inside the extension.

---

## Action Extensions

- Define an Action extension for transforming or annotating content in-place.
- Carefully constrain **activation rules** to relevant content types.
- Return results quickly; respect extension **time limits**.

---

## watchOS Complications

- Implement complications via **WidgetKit** on watchOS; provide **complication families** with SwiftUI views.
- Keep rendering **simple**; favor **numbers** and short labels.
- Use **timelines** to keep data fresh without draining battery.

---

## Focus Filters

- Define Focus filter **intents** using App Intents to adapt app behavior to the current Focus.
- Provide clear **names** and **defaults** so people can predict the effect of enabling a filter.
- Test how filters affect **notifications** and **badges**.

---

## Best Practices Per Feature

- **Widgets**: ship *useful defaults*, pre-populate configuration, and provide meaningful preview states.
- **Live Activities**: limit updates, cap payload sizes, always end the activity.
- **App Intents**: validate parameters; provide **phrases** and **summaries** that read well.
- **Notifications**: ask for permission in-context; gate sensitive actions behind auth.
- **Background**: always set completion; backoff on failures; make tasks idempotent.
- **App Clips**: load fast, no onboarding wall, focus on the core action.
- **StoreKit**: show price, terms, and **restore** path; handle downgrades/upgrades.
- **Links/Handoff**: keep URLs stable; ensure parity with web; test multiple devices.
- **Extensions**: respect budgets; prefer App Groups for shared storage.
- **Complications**: embrace *glanceability*; avoid long text; schedule future entries.

---

## Anti-Patterns

- Polling aggressively from widgets or extensions.
- Shipping Live Activities for static data.
- Overloading App Intents with dozens of parameters.
- Asking for push permission on first launch without context.
- Scheduling background tasks too frequently or doing heavy work.
- Hiding pricing terms or making cancellation difficult.
- Hijacking universal links to unrelated content.
- Over-broad share/action activation rules.

---

## Troubleshooting

- **Widget not refreshing**: verify timeline entries and `reloadTimelines`; check provider errors.
- **Live Activity updates missing**: confirm push token flow and APNs payload validity.
- **Shortcuts crashes**: validate intent parameters and entity queries.
- **Silent push ignored**: ensure `content-available: 1`, background mode, and App ID env.
- **BG task not running**: confirm identifier registration and earliest begin date; reduce frequency.
- **App Clip rejected**: binaries too large or missing clear invocation path.
- **Purchase stuck**: you didn’t finish transactions or handle `verification`.
- **Universal link opens web**: AASA mismatch or entitlement not installed on device.
- **Share extension times out**: too much work—move heavy processing to the host app.

Additional issues in iOS 17–18:

- **Widget push reloads not working**: register a `WidgetPushHandler` in your widget extension and request a widget push token; ensure your server sends the push to the token and that your entitlements include the widget push capability.
- **App Intent snippet not showing**: confirm your intent conforms to `SnippetIntent` and that any `AppEntity` used is marked as `IndexedEntity` with proper indexing keys.  Spotlight must index entities before snippets appear.
- **Scheduled Live Activity never starts**: verify that the `start` parameter passed to `Activity.request` is in the future and within system limits (usually within 8 hours).  Scheduled activities won’t start if push tokens or authorization fail.
- **Subscription store blank**: double‑check that product identifiers match those configured in App Store Connect and that you’re displaying `SubscriptionStoreView` inside a view hierarchy on the main thread.  Customizing control styles incorrectly can result in an empty list.
- **Continuous background task terminates prematurely**: Use `BGContinuedProcessingTask` only for critical long‑running work and implement regular checkpoints to call `task.update()`; the system may still terminate tasks for resource pressure.

---

## App Review Guidelines

Design with **Safety/Performance/Business/Design/Legal** in mind. Be explicit about pricing,
privacy, and data usage. Avoid private APIs and misleading permission prompts.
Keep **feature access** proportionate to declared capabilities (e.g., background modes, NFC).

---

## Tool Reference

The **scripts/** folder contains generators you can run locally or ask Claude to run with the provided JSON configs in **examples/**.

- `widget_generator.py` — generate WidgetKit scaffold (intent/non-intent, families, previews).
- `app_intent_generator.py` — generate App Intents + Shortcut collections.
- `live_activity_generator.py` — generate ActivityKit attributes, views, and Dynamic Island.
- `notification_generator.py` — generate notification center delegate, categories, and actions.
- `background_task_generator.py` — generate BG task registration + scheduling utilities.
- `entitlements_generator.py` — generate Entitlements.plist and Info.plist snippets.

**Usage**
```bash
python scripts/widget_generator.py --config examples/widget_config.json
python scripts/app_intent_generator.py --config examples/app_intent_config.json
python scripts/live_activity_generator.py --config examples/live_activity_config.json
python scripts/notification_generator.py --config examples/notification_config.json
python scripts/background_task_generator.py --config examples/background_task_config.json
python scripts/entitlements_generator.py --config examples/entitlements_config.json
```

**Where files go**
- Swift output is placed under `swift/<feature>/...` (paths configurable via each script).
- Config templates live in `examples/`.
- Docs live in `docs/` and include testing strategies per feature.

> Tip: After generation, add the files to the proper **targets** in Xcode (app, widget extension,
> content extension, App Clip, watch app) and enable the matching **capabilities**.
