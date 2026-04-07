# VIPER Guide

## Overview

**VIPER** is an architectural pattern that breaks features down into five
distinct roles: **View**, **Interactor**, **Presenter**, **Entity** and
**Router**. It emerged from the iOS community as a way to combat Massive
View Controller syndrome by creating highly modular, testable and
reusable components. Each VIPER module encapsulates a single use case or
feature and communicates with other modules via protocols. While it has
fallen out of fashion in some circles due to its verbosity, VIPER remains
useful for complex flows requiring explicit navigation and business logic
separation.

## Module Components

1. **View** – Responsible for displaying data and forwarding user events to
   the presenter. In SwiftUI, this could be a `View` struct; in UIKit, a
   `UIViewController` or view.
2. **Interactor** – Contains business logic for the feature. It fetches
   data from entities (models) or services and sends results back to the
   presenter. Interactors should be protocol‑driven and testable.
3. **Presenter** – Acts as the middleman between the view and interactor.
   It receives user events from the view, asks the interactor to perform
   work, and prepares data for display. It owns no references to UI
   frameworks, making it unit‑testable.
4. **Entity** – Domain models or simple data structures used by the
   interactor. They should not know about the view or presenter.
5. **Router (Wireframe)** – Handles navigation between modules. It creates
   the VIPER stack for new features and manages transitions like pushing
   view controllers or presenting sheets.

These components communicate exclusively through protocols so that each can
be independently mocked and tested.

## Flow & Communication

The typical flow in a VIPER module works as follows:

1. **User Interaction** – The user taps a button in the view.
2. **View → Presenter** – The view informs the presenter of the event via a
   protocol method (e.g. `presenter.didTapAdd()`).
3. **Presenter → Interactor** – The presenter tells the interactor to
   perform some work (e.g. `interactor.createItem()`), passing any data.
4. **Interactor → Presenter** – The interactor performs business logic or
   fetches data, then calls back to the presenter with the result.
5. **Presenter → View** – The presenter formats the data into view models
   and instructs the view to update its display.
6. **Presenter → Router** – When navigation is required (e.g. present a
   detail screen), the presenter asks the router to perform the transition.

This strict direction of communication enforces separation and makes it
clear where each responsibility lies.

## Example VIPER Module (Todo List)

Consider a simple To‑Do list feature. The following code sketches out
protocols and classes for a VIPER module using Swift and SwiftUI. Note that
VIPER can also be implemented with UIKit; the concepts remain the same.

```swift
// Entities
struct TodoItem: Identifiable, Codable, Sendable {
  let id: UUID
  var title: String
  var isComplete: Bool
}

// VIPER Protocols
protocol TodoView: AnyObject {
  func display(items: [TodoItem])
  func display(error: Error)
}

protocol TodoPresenterProtocol: AnyObject {
  func onAppear()
  func didTapAdd(title: String)
  func didTapToggle(id: UUID)
}

protocol TodoInteractorProtocol: AnyObject {
  func fetchItems()
  func addItem(title: String)
  func toggleItem(id: UUID)
}

protocol TodoRouterProtocol: AnyObject {
  func navigateToDetail(item: TodoItem)
}

// Interactor
class TodoInteractor: TodoInteractorProtocol {
  private var items: [TodoItem] = []
  weak var presenter: TodoPresenter!
  func fetchItems() {
    presenter.didFetch(items)
  }
  func addItem(title: String) {
    let item = TodoItem(id: UUID(), title: title, isComplete: false)
    items.append(item)
    presenter.didFetch(items)
  }
  func toggleItem(id: UUID) {
    if let index = items.firstIndex(where: { $0.id == id }) {
      items[index].isComplete.toggle()
      presenter.didFetch(items)
    }
  }
}

// Presenter
class TodoPresenter: TodoPresenterProtocol {
  weak var view: TodoView?
  var interactor: TodoInteractorProtocol!
  var router: TodoRouterProtocol!
  func onAppear() {
    interactor.fetchItems()
  }
  func didTapAdd(title: String) {
    interactor.addItem(title: title)
  }
  func didTapToggle(id: UUID) {
    interactor.toggleItem(id: id)
  }
  // Interactor output
  func didFetch(_ items: [TodoItem]) {
    view?.display(items: items)
  }
}
```

In this simplified example, the presenter directly implements the
interactor’s output method (`didFetch`) to update the view. In a full VIPER
implementation you would define a separate protocol for interactor →
presenter communication.

## Testing Strategies

VIPER’s strict separation makes testing straightforward:

- **Presenter tests** – Provide a fake view and interactor; send events
  (e.g. `didTapAdd`) and assert that the presenter calls the correct view
  methods with the expected data. Because the presenter owns no UI code, it
  can be unit tested in isolation.
- **Interactor tests** – Inject test doubles for data storage (e.g.
  repositories) and verify that business logic modifies entities correctly.
- **Router tests** – Use dependency injection to verify that correct
  navigation actions (present or push) are triggered when certain presenter
  methods are called.
- **End‑to‑end tests** – Compose the module with real interactor
  implementations and a mock router to validate the entire flow.

## Best Practices

- **Name clearly** – Use consistent naming conventions for view, presenter,
  interactor and router. Avoid abbreviations like `VIPERViewController`.
- **Keep presenters thin** – Presenters should not perform heavy business
  logic; delegate to interactors or use cases.
- **Use protocols** – All references between VIPER components should be via
  protocols to facilitate mocking and replaceability.
- **Handle concurrency** – Interactors may perform async operations. Use
  `async/await` and actors to protect state, and ensure that presenters
  update the view on the main thread【723763396857538†L16-L24】.
- **Modularise** – Each VIPER module can live in its own Swift package or
  folder. This clarifies ownership and eases testing.
- **Document flows** – Write ADRs or sequence diagrams to describe how
  events propagate through the module and across modules.

## Anti‑Patterns

- **Massive Presenter** – A presenter that accumulates networking, business
  logic and navigation responsibilities defeats the purpose of VIPER. Keep
  presenters focused on presentation logic.
- **Skipping protocols** – Directly referencing concrete types between
  components reduces testability. Always define protocols for each link.
- **Redundant splitting** – Avoid splitting trivial screens into VIPER
  modules. For simple input forms or static content, MVVM or a simple
  view model may suffice.
- **Tight coupling to frameworks** – Do not import SwiftUI or UIKit into
  interactors. Keep them framework agnostic.

## When to Use VIPER

VIPER is beneficial when you:

- Have complex flows with multiple navigation steps and business rules.
- Require clear ownership boundaries between UI and domain logic.
- Need high test coverage and want each piece to be independently
  mockable.

It may be overkill for small, static screens or prototypes. Weigh the
maintenance overhead against the benefits before committing to VIPER.

## Migration & Coexistence

You can adopt VIPER incrementally within an existing MVVM or TCA code base.
Start by designing one feature as a VIPER module. Use a router to expose
the module’s entry point. As more features adopt VIPER, create shared
services and entities in common modules. It is also possible to use TCA
reducers inside VIPER interactors or presenters, though this introduces
extra complexity. Document your decisions and plan migrations carefully.

## Troubleshooting

- **Protocol explosion** – VIPER generates many small protocols. Group
  related protocols into cohesive files and use type aliases to reduce
  clutter.
- **Navigation confusion** – When using multiple routers, ensure that each
  router owns only one navigation flow. Use coordinators or higher‑level
  routers to orchestrate flows across modules.
- **Concurrency issues** – Without proper actor isolation, interactors may
  mutate shared state concurrently. Use actors or serial queues to protect
  mutable data【723763396857538†L16-L24】.

---