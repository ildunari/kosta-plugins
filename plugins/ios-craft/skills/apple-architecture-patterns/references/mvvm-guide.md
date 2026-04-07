# MVVM Guide

## Overview

Model–View–ViewModel (MVVM) separates user interface (**View**) from presentation
logic (**ViewModel**) and domain data (**Model**). It has long been the go‑to
pattern for SwiftUI and UIKit apps because it is simple to understand and easy
to adopt. The view reads state from the view model and forwards user actions
back, while the view model transforms inputs into outputs and communicates with
services or use cases.

### Modern MVVM with Observation

The iOS 17 Observation framework replaces `ObservableObject` and `@Published`
with the `@Observable` macro. Observation provides a robust, type‑safe and
performant implementation of the observer pattern【78975759551952†L201-L217】. When
you mark your model or view model with `@Observable`, Swift automatically
generates an `ObservationRegistrar` that tracks reads and writes and notifies
SwiftUI views of changes【78975759551952†L209-L214】. This eliminates the need to
conform to `ObservableObject` or use `@StateObject` in your views and reduces
unnecessary view invalidations.

#### Example with `@Observable`

```swift
import Observation
import SwiftUI

@Observable
class CounterModel {
  private(set) var count = 0
  func increment() { count += 1 }
}

struct ContentView: View {
  @State var model = CounterModel()
  var body: some View {
    VStack {
      Text(model.count.description)
      Button("Increment") { model.increment() }
    }
  }
}
```

In this example there is no `ObservableObject` conformance or `@Published`
properties. The model is observed automatically. If your model is used within
another observable type (for example, a view model), remember to mark both as
`@Observable`【78975759551952†L349-L353】.

## Structure

A typical MVVM feature uses three layers:

- **Model** – domain entities and business logic. In modern code this may be a
  class or struct marked with `@Observable` so that changes propagate to the UI.
- **ViewModel** – transforms inputs into outputs, coordinates services and
  handles navigation. Should be thin and delegate work to models or use cases.
- **View** – SwiftUI or UIKit view. Stateless; reads observable state from the
  view model and dispatches user events back.

When adopting the Observation framework you can often simplify the view model
even further. For very simple state you might skip the view model entirely and
bind views directly to observable models. However, in most cases it is still
useful to encapsulate presentation logic and service coordination in a view
model.

## Testing

- **View model tests** – Instantiate the view model with protocol‑based
  dependencies and assert that property changes occur as expected. If using
  Observation, treat the model like any other class and verify its mutable
  properties.
- **Snapshot tests** – Use the `assertSnapshot` helper from
  [SnapshotTesting](https://github.com/pointfreeco/swift-snapshot-testing) to
  capture SwiftUI views in different states. Combine with the Observation
  framework to ensure that only the relevant parts of the view update.
- **Async operations** – Embrace `async`/`await` for network calls or database
  queries. Make view model methods `async` and use `Task` in views to call
  them.

## Tips and Best Practices

- Keep view models small; prefer composition and child view models.
- Move navigation logic into coordinators for better separation.
- Embrace `async/await` for asynchronous work; mark methods as `async` and use
  `Task` in views.
- Use `@State` instead of `@StateObject` when the view model is marked
  `@Observable` because SwiftUI manages its lifetime for you.
- Avoid storing heavy domain logic in view models; instead inject use cases,
  actors or services that conform to protocols.
- When mixing with UIKit, continue using `ObservableObject` and `@Published`
  until the Observation framework is fully available across all targeted
  platforms.

## Anti‑Patterns

- **Massive View Model** – A view model that handles networking, caching,
  persistence and business logic becomes hard to maintain. Extract these
  responsibilities into services or use cases.
- **Over‑observability** – Don’t slap `@Observable` on every class. Use it on
  models that are truly observed by views; isolate mutable state to the
  smallest necessary types to avoid spurious view invalidations.
- **UI logic in the view model** – The view model should not import SwiftUI. Keep
  UI code (like view layout or modifiers) in the view.

## Async Concurrency & Actors

Swift 6 introduces *strict concurrency* and full data‑race safety checking to the
language【723763396857538†L16-L24】. When designing MVVM features you should embrace
structured concurrency and actors to isolate mutable state and make your code
safe for concurrent execution. For example, if your model performs network
requests, wrap those calls in an `actor` or use an `AsyncSequence` to stream
updates to the view model. This prevents race conditions and keeps UI code
responsive. Ensure that any classes or structs you use conform to
`Sendable` so they can be passed safely across concurrency domains.

```swift
actor NewsService: Sendable {
  func fetchHeadlines() async throws -> [Article] {
    // perform network call here
  }
}

@Observable
class NewsViewModel: Sendable {
  private let service: NewsService
  private(set) var headlines: [Article] = []
  init(service: NewsService) { self.service = service }
  @MainActor
  func load() async {
    self.headlines = try? await service.fetchHeadlines()
  }
}
```

In the example above, `NewsService` is an `actor` guaranteeing serialized
access to its internal state. The view model is marked `Sendable` to satisfy
strict concurrency, and it exposes an async `load` method annotated with
`@MainActor` so UI updates occur on the main thread. When the view calls
`Task { await viewModel.load() }`, Swift ensures safe concurrency.

## MVVM vs TCA & Clean Architecture

MVVM remains the most straightforward way to architect simple SwiftUI views,
but as applications grow, you may need stronger boundaries or state
management. **The Composable Architecture (TCA)** introduces
unidirectional data flow, composable reducers and powerful testing tools,
but some developers consider it verbose and tightly coupled to a third‑party
library【285873496392749†L73-L88】. **Clean Architecture** provides clear
separation of the domain layer and promotes longevity, but adds additional
abstraction and may feel heavy for small apps. Consider migrating from MVVM
to TCA or Clean when:

- You need deterministic state management across multiple features.
- Testability and replaying side effects are top priorities.
- You plan for long‑term maintainability and want to enforce strict boundaries.

Migration strategies and refactor guides are available in
`references/migration-strategies.md`.

## Testing Advanced Scenarios

When testing view models that interact with asynchronous services or complex
state, use **dependency injection** and **test doubles** to control the flow of
data. For example, you can provide a mock network service that returns
predefined values without making real network calls. Swift 6’s concurrency
model allows you to test async functions with the `XCTest` attribute
`@Test` and integrate with TCA’s `TestStore` when mixing patterns【584748763487444†L27-L47】.
Snapshot testing remains an excellent way to validate SwiftUI views—capture
renders under various states to detect regressions.

### Integration with Observation & TCA

TCA’s `ViewStore` now leverages the Observation framework under the hood to
provide fine‑grained updates. When embedding TCA in a SwiftUI view, you can
bind directly to `@BindableState` and rely on Observation to refresh only the
affected views. Similarly, when using pure MVVM, adopt the `@Observable`
macro to enjoy the same benefits in simpler forms【78975759551952†L201-L217】.

---
