# The Composable Architecture (TCA) Guide

## Overview

The **Composable Architecture (TCA)** is a library built by the
[Point‑Free](https://www.pointfree.co/) team to bring **predictable state
management** and **first‑class testability** to SwiftUI and UIKit apps.
Drawing inspiration from Elm and Redux, TCA enforces a **unidirectional
data flow**: views emit actions → reducers handle actions and produce state
changes and side effects → the new state is propagated back to views. This
discipline enables precise control over how state changes and how side
effects (API calls, persistence, etc.) are executed.

The library is continuously evolving. Recent releases introduced a beta
**shared state** system via the `@Shared` property wrapper, allowing
features to synchronize state and persist it into various storage backends
like User Defaults or file system【481379339866622†L27-L36】. The testing
utilities were also updated to leverage Swift 6’s new `@Test` attribute
and concurrency features【584748763487444†L27-L47】. When adopting TCA you
should regularly consult release notes to identify breaking changes【746950836239898†L232-L243】.

## Core Concepts

TCA revolves around a few fundamental types and protocols:

- **State**: a struct containing all the values needed to render a feature.
- **Action**: an enum of all user or system events that can mutate state or
  trigger side effects.
- **Reducer**: a pure function that takes current state and an action,
  modifies the state in place, and returns an `Effect` describing any
  asynchronous work to perform.
- **Store**: an observable object that holds state, processes actions
  through the reducer, and publishes changes to the view layer.
- **Effect**: a description of side effects. Usually created via
  `Effect.task { ... }` to perform async work and later send further
  actions.

### Reducers & the `@Reducer` macro

TCA provides the `@Reducer` macro to declare reducers in a concise and
type‑safe way. A reducer contains a nested `State` type, an `Action` enum,
and a computed `body` returning a `ReducerOf<Self>`. Use the `Reduce` view to
implement your business logic.

```swift
import ComposableArchitecture

@Reducer
struct CounterFeature {
  @ObservableState
  struct State: Equatable { var count: Int = 0 }
  enum Action { case incrementButtonTapped, decrementButtonTapped }
  @Dependency(
    \.
  ) var uuid: UUIDGenerator // example dependency
  var body: some ReducerOf<Self> {
    Reduce { state, action in
      switch action {
      case .incrementButtonTapped:
        state.count += 1
        return .none
      case .decrementButtonTapped:
        state.count -= 1
        return .none
      }
    }
  }
}
```

In the example above, `@ObservableState` leverages the Observation
framework to update views when state changes. The reducer increments or
decrements the `count` and returns `.none` because there are no side
effects.

### Composing Reducers

Large applications are decomposed into smaller features that can be
composed using the `.combine` operator or by nesting child features
using `.scope` and `forEach`. This allows you to build a modular
hierarchy of reducers where each feature operates on its own slice of
state. When actions bubble up, parents can decide how to respond.

### The Store and `ViewStore`

Create a `StoreOf<Feature>` with an initial state and dependencies. In
SwiftUI, you interact with the store via a `ViewStore` or the new
`Store` view which automatically observes state via the Observation
framework.

```swift
struct ContentView: View {
  let store: StoreOf<CounterFeature>
  var body: some View {
    WithViewStore(self.store, observe: { $0 }) { viewStore in
      VStack {
        Text("\(viewStore.count)")
        HStack {
          Button("-", action: { viewStore.send(.decrementButtonTapped) })
          Button("+", action: { viewStore.send(.incrementButtonTapped) })
        }
      }
    }
  }
}
```

The `WithViewStore` view subscribes to state changes and sends actions.
Alternatively, you can use the `Store` view introduced in recent releases,
which uses the `@BindableState` macro to bind properties directly to
SwiftUI controls without explicit `ViewStore` usage.

## Shared State & Persistence

One of the most requested features in TCA has been the ability to share
state across features. The **shared state beta** introduces the `@Shared`
property wrapper. It allows multiple features to observe and mutate the same
state and persist it to a chosen storage, such as User Defaults, a file or
CloudKit【481379339866622†L27-L36】. You define a shared state type and supply a
`PersistenceKey` describing how it should be stored. When the value changes,
all features using it are updated. For example:

```swift
@Shared(
  persistence: .userDefaults(key: "settings", defaultValue: .init())
)
var settings: Settings

struct Settings: Equatable, Codable {
  var darkMode: Bool = false
  var notificationsEnabled: Bool = true
}

@Reducer
struct SettingsFeature {
  @ObservableState
  struct State: Equatable {
    @Shared(
      persistence: .userDefaults(key: "settings", defaultValue: Settings())
    ) var settings
  }
  enum Action { case toggleDarkMode, toggleNotifications }
  var body: some ReducerOf<Self> {
    Reduce { state, action in
      switch action {
      case .toggleDarkMode:
        state.settings.darkMode.toggle()
        return .none
      case .toggleNotifications:
        state.settings.notificationsEnabled.toggle()
        return .none
      }
    }
  }
}
```

This feature ensures that toggling a setting in one part of the app
immediately reflects in all other features using the same `@Shared` state.

## Concurrency & Strict Checking

TCA is designed to work seamlessly with Swift concurrency. When returning
an `Effect.task`, you can leverage structured concurrency and `async/await`
without leaving the reducer. For example:

```swift
enum Action { case onAppear, dataResponse(Result<[Item], Error>) }

var body: some ReducerOf<Self> {
  Reduce { state, action in
    switch action {
    case .onAppear:
      return .run { send in
        do {
          let items = try await client.fetchItems()
          await send(.dataResponse(.success(items)))
        } catch {
          await send(.dataResponse(.failure(error)))
        }
      }
    case let .dataResponse(result):
      // update state based on result
      return .none
    }
  }
}
```

Enable strict concurrency by passing `-strict-concurrency=complete` to the
Swift compiler and marking your state and dependencies `Sendable`. TCA
supports concurrency out of the box; make sure to update to the latest
version to avoid extraneous compiler warnings【746950836239898†L232-L243】.

## Testing with `TestStore`

Testing is a first‑class citizen in TCA. Use `TestStore` to drive a
feature through its actions and assert on state and side effects. Starting
with Swift 6 you can use the `@Test` attribute in plain functions and rely on
async/await in your tests【584748763487444†L27-L47】. For example:

```swift
@Test
func testCounter() async {
  let store = TestStore(initialState: CounterFeature.State()) {
    CounterFeature()
  }
  await store.send(.incrementButtonTapped) {
    $0.count = 1
  }
  await store.send(.decrementButtonTapped) {
    $0.count = 0
  }
}
```

Use `withDependencies` to override dependencies (e.g. clients or random
generators) for deterministic testing. Combine with the [CustomDump](https://github.com/pointfreeco/swift-custom-dump) and
[SnapshotTesting](https://github.com/pointfreeco/swift-snapshot-testing)
libraries to capture and compare complex state structures【584748763487444†L92-L122】.

## Best Practices

- **Small, composable features** – Keep each reducer focused on a single
  domain concept; compose them rather than building monoliths.
- **Unidirectional flow** – Resist the urge to mutate state directly from
  views. Always send actions through the store.
- **Centralize side effects** – Use the `Effect` system and dependency
  injection to manage all API calls, persistence and randomization.
- **Watch release notes** – TCA is actively developed; follow the
  Point‑Free blog for announcements【746950836239898†L232-L243】.
- **Stay SwiftUI‑idiomatic** – Bind state via `@ObservableState` or
  `@BindableState` and avoid building your own observation layers.
- **Test everything** – Use `TestStore` to cover reducers; treat views as
  dumb with minimal logic; snapshot test for UI regressions.

## Anti‑Patterns

- **Using TCA for trivial views** – If your feature has only a few mutable
  values and no side effects, MVVM may be simpler. TCA introduces overhead in
  exchange for testability and composability.
- **Global mutable state** – Even with `@Shared`, avoid centralizing too much
  state. Shared state should be reserved for truly cross‑feature settings.
- **Tight coupling to libraries** – Some developers find that adopting TCA
  tightly couples your code base to the library【285873496392749†L73-L88】. Consider
  isolating your reducers behind protocols or facades if long‑term
  independence is a goal.
- **Overusing `ViewStore`** – When using SwiftUI you should prefer the
  `Store` view with `@BindableState` to automatically update only the fields
  that change. Excessive `WithViewStore` usage can lead to unnecessary
  re‑renders.

## Migration from MVVM or MVC

Migrating to TCA can be incremental. Start by introducing a single feature
using TCA and embed it within your existing MVVM code base. Leverage the
state and actions to gradually move responsibilities out of view models. Use
`store.send` to drive side effects rather than directly invoking services.
As you migrate more features, extract shared dependencies into `Dependencies`
and adopt `@Shared` for truly global state. Document your plans in an ADR
and socialize the change with the team.

## Troubleshooting

- **Compile errors after update** – Breaking changes may remove or rename
  APIs【746950836239898†L232-L243】. Search the release notes for migration steps or
  update your code to use the new macros.
- **State not updating** – Ensure you use `@ObservableState` or
  `@BindableState` on your feature’s `State` and that you observe the
  correct scope in the view. If using shared state, verify that the
  `PersistenceKey` is unique and the value conforms to `Codable`.
- **Unexpected view reloads** – Over‑observing or using `WithViewStore` on
  large state can cause excessive rendering. Scope your observations to the
  minimal piece of state needed for the view.

---