# Clean Architecture Guide

## Overview

**Clean Architecture** is a layered architectural pattern that emphasises
**separation of concerns**, **dependency inversion** and **long‑term
maintainability**. Originally formalised by Robert C. Martin, it divides
your code into concentric circles where the **inner layers** (entities and
use cases) are independent of frameworks and devices, and the **outer
layers** (interfaces, frameworks and drivers) depend on the inner ones.
Applied to Swift, Clean Architecture helps you build applications that are
independent of UI frameworks (SwiftUI, UIKit), persistence mechanisms
(Core Data, Realm) and external services. It promotes testability and clear
boundaries between domain logic and implementation details.

## Layers & The Dependency Rule

Clean Architecture uses four conceptual layers, though in practice you might
group them differently depending on your project size:

1. **Entities (Domain Models)** – fundamental business objects and
   enterprise rules. They should be pure Swift types (usually structs or
   immutable classes) with no dependencies on frameworks. Entities may
   conform to `Sendable` and be used across concurrency boundaries.
2. **Use Cases (Interactors)** – application‑specific business rules that
   orchestrate entities to accomplish tasks. Use cases are implemented as
   classes or structs that operate on protocols, not concrete types. They are
   the primary units of behaviour and should be easy to test.
3. **Interface Adapters (Presenters, Gateways, Controllers)** – glue code
   that converts data between the format needed by use cases and the format
   delivered to the outer world. Presenters prepare data for views, while
   repositories/gateways adapt network or database responses into domain
   types.
4. **Frameworks & Drivers (UI, DB, Network)** – external components like
   SwiftUI, UIKit, Core Data, SQLite, Web APIs. These are replaced at test
   time by mocks or fakes.

The **dependency rule** states that source code dependencies must point
**inward**. Outer layers may depend on interfaces defined in inner layers but
never the reverse. For example, a view model or presenter may depend on a
use case protocol, but the use case must not import SwiftUI.

## Implementing Clean Architecture in Swift

### Defining Entities

Your domain entities should be simple and free of dependencies. Use
value types (`struct`) for data structures and ensure they conform to
`Codable` and `Sendable` when possible to aid persistence and concurrency.

```swift
struct User: Equatable, Codable, Sendable {
  let id: UUID
  var name: String
  var email: String
}
```

### Writing Use Cases

Use cases encapsulate application behaviour. They take in requests from the
UI layer, interact with repositories/services and return responses. Use
Swift’s structured concurrency and `async/await` to perform asynchronous
operations. For example:

```swift
protocol UserRepository {
  func fetchUser(id: UUID) async throws -> User
}

struct FetchUserUseCase {
  let repository: UserRepository
  func execute(id: UUID) async throws -> User {
    return try await repository.fetchUser(id: id)
  }
}
```

Note how the use case depends on the abstract `UserRepository` protocol and
returns a domain entity. This isolates the use case from the actual
implementation (e.g. network service, database).

### Interface Adapters

Presenters and controllers translate use case outputs into a form the UI
layer can render. In SwiftUI, a view model or presenter may subscribe to
`async` streams and publish simplified view state. Use `actors` to protect
mutable state and conform to `Sendable` for concurrency safety【723763396857538†L16-L24】.

```swift
@Observable
class UserPresenter {
  private let fetchUserUseCase: FetchUserUseCase
  private var stateActor = StateActor()
  @MainActor
  var user: User?

  init(fetchUserUseCase: FetchUserUseCase) {
    self.fetchUserUseCase = fetchUserUseCase
  }
  func onAppear(id: UUID) {
    Task { [weak self] in
      guard let self = self else { return }
      if let fetched = try? await self.fetchUserUseCase.execute(id: id) {
        await MainActor.run { self.user = fetched }
      }
    }
  }
}
```

### Frameworks & Drivers

The outermost layer includes SwiftUI views, persistence frameworks like
Core Data and network clients. They depend on protocols defined in inner
layers. For instance, a network client could implement `UserRepository` and
be injected into a use case. Keep these implementations free of domain
logic.

## Concurrency & Actors

Swift 6 introduces *strict concurrency*, meaning that data race safety is
enforced by the compiler when you opt in【723763396857538†L16-L24】. When
building Clean Architecture features:

- Use `actor`s for classes that own mutable state (e.g. repositories
  caching responses). This ensures serialized access and prevents races.
- Mark domain types and use cases as `Sendable` where appropriate. The
  compiler will warn you if you accidentally share non‑sendable types across
  concurrency domains.
- Keep asynchronous functions within use cases to encapsulate concurrency.
  Presenters should call these functions from `Task` or `async` contexts.

## Testing Strategies

Each layer of Clean Architecture can be tested independently:

- **Unit test use cases** – Provide fake repositories and assert on outputs.
- **Contract test repositories** – Use test doubles for external services and
  ensure that your repository implementation correctly translates network
  responses into domain entities.
- **Presenter tests** – Simulate user interactions and verify that view
  models emit the expected view state. Use snapshot testing for SwiftUI
  views.
- **Integration tests** – Compose layers together with in‑memory or mock
  implementations to validate end‑to‑end flows.

## Best Practices

- **Define protocols in inner layers** – Entities and use cases should own
  the abstraction boundaries (e.g. define repository protocols in the domain
  layer). Outer layers conform to these protocols.
- **Isolate frameworks** – Keep SwiftUI, UIKit, networking and persistence
  frameworks in the outer layer so they can be swapped without affecting the
  domain.
- **Minimise dependencies** – Avoid exposing third‑party types across
  boundaries. Wrap them in your own abstractions.
- **Opt into concurrency checks** – Pass `-strict-concurrency=complete` to
  your Swift compiler and fix warnings early【723763396857538†L16-L24】.
- **Document decisions** – Use Architecture Decision Records to justify
  choices like introducing a repository or splitting a module.

## Anti‑Patterns

- **Anemic domain models** – Entities that are mere data bags. Give your
  domain models behaviour where appropriate to encapsulate logic.
- **Skipping tests** – Relying solely on integration tests causes business
  logic regressions. Unit test use cases thoroughly.
- **Leaky abstractions** – Exposing UI types (e.g. `Color`, `UIView`) from
  domain layers ties your business logic to frameworks.
- **Over‑engineering** – Don’t use Clean Architecture for trivial apps or
  prototypes; the complexity may outweigh the benefits.

## Migration & Refactoring

If your project currently uses MVC or MVVM and is beginning to show signs
of fragility (e.g. massive view controllers, tangled business logic), you
can migrate incrementally:

1. **Extract protocols and entities** – Identify core business objects and
   define them as pure Swift types in a new domain module.
2. **Introduce use cases** – Encapsulate business operations behind
   protocols. Replace direct service calls with use case execution.
3. **Adapt existing view models** – Convert them into presenters that
   depend on use cases. Slowly move logic out of views.
4. **Create repositories** – Wrap your networking or persistence layer in
   repository implementations that conform to domain protocols.
5. **Iterate** – Continue pushing dependencies outward until the domain is
   insulated from frameworks. Write tests at each layer to ensure
   correctness.

## Troubleshooting

- **Circular dependencies** – If an outer layer accidentally imports an
  inner layer that depends on it, split the protocols into a separate module.
- **Slow builds** – Excessive layering and generics can slow down Swift
  compilation. Modularise your code using Swift packages and maintain clear
  boundaries.
- **Concurrency warnings** – When enabling strict concurrency, you may see
  `non-Sendable type` warnings. Wrap problematic types in actors or mark
  them `@unchecked Sendable` after careful review【723763396857538†L16-L24】.

---