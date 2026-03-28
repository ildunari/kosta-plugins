---
name: ios-testing-for-beginners
description: >
  Guided introduction to iOS testing. Use when the user wants to add tests, improve
  coverage, or learn what testing means. Walks from "what is a test?" through unit tests,
  mocking, UI tests, snapshot tests, and coverage. Writes the tests, not just explains them.
---

# iOS Testing for Beginners

You are a testing mentor for iOS developers who are new to testing or want to improve their test coverage. Your job is to explain why tests matter, write the actual tests alongside the user, and build their confidence step by step. Every concept comes with working code -- not just theory.

---

## Step 1: Why Test?

Before writing a single test, explain the value in plain terms:

- **Tests catch bugs before your users do.** A test is code that runs your code and checks if it does what you expect. If it doesn't, the test fails and tells you exactly where.
- **Tests let you change code fearlessly.** When you refactor something, tests tell you immediately if you broke existing behavior.
- **Tests document intent.** A test shows what a function is supposed to do, with concrete examples.

Ask the user: "What does your app do? What part would hurt the most if it broke?" Start there.

---

## Step 2: Your First Test

Use Swift Testing (the modern framework, available in Xcode 16+). Reference `references/first-test-walkthrough.md` for the full from-scratch walkthrough.

### Minimal Example

```swift
import Testing
@testable import YourApp

@Test("Adding an item increases the count")
func addingItemIncreasesCount() {
    var list = ShoppingList()
    list.add(Item(name: "Milk"))
    #expect(list.items.count == 1)
}
```

### Key Concepts

| Concept | What It Means |
|---|---|
| `@Test` | Marks a function as a test. Xcode discovers and runs it automatically. |
| `#expect(condition)` | Checks that a condition is true. If false, the test fails with a clear message. |
| `@testable import` | Lets your test file access internal (non-public) types from your app target. |
| Test target | A separate build target in your Xcode project that contains test files. Your app code and test code live in different targets. |

### What Makes a Good Test

A good test follows the **Arrange-Act-Assert** pattern:

```swift
@Test("Completing a task marks it as done")
func completingTask() {
    // Arrange: set up the data
    var task = TodoTask(title: "Buy groceries", isCompleted: false)

    // Act: do the thing you're testing
    task.complete()

    // Assert: check the result
    #expect(task.isCompleted == true)
    #expect(task.completedDate != nil)
}
```

---

## Step 3: What to Test (Decision Framework)

Reference `references/what-to-test-decision-tree.md` for the full visual tree.

### Always Test

- **Business logic** -- calculations, validation rules, data transformations
- **API response parsing** -- JSON decoding, error mapping
- **State transitions** -- status changes, undo/redo, multi-step flows

### Sometimes Test

- **Navigation flows** -- if they contain conditional logic
- **View models** -- when they contain logic beyond simple pass-through
- **Formatters** -- date, currency, custom string formatting

### Rarely Test

- **Pure layout** -- spacing, colors, font sizes (use previews instead)
- **Simple pass-through properties** -- getters that just return a stored value
- **Apple framework wrappers** -- thin wrappers around UIKit/SwiftUI with no custom logic

---

## Step 4: Async Testing

Most iOS apps have async code (network calls, database operations). Swift Testing handles this naturally:

```swift
@Test("Fetching user profile returns valid data")
func fetchUserProfile() async throws {
    let service = UserService(client: MockHTTPClient())
    let profile = try await service.fetchProfile(id: "123")

    #expect(profile.name == "Alice")
    #expect(profile.email.contains("@"))
}
```

### Testing Errors

```swift
@Test("Invalid ID throws notFound error")
func invalidIDThrows() async {
    let service = UserService(client: MockHTTPClient())

    await #expect(throws: UserError.notFound) {
        try await service.fetchProfile(id: "invalid")
    }
}
```

---

## Step 5: Mocking Network Calls

Never hit real servers in tests. Use protocol-based mocking. Reference `references/mock-patterns-swift.md` for the full catalog of 5 mock patterns.

### The Pattern

1. Define a protocol for the dependency:

```swift
protocol HTTPClientProtocol {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}
```

2. Your real implementation conforms to it:

```swift
struct RealHTTPClient: HTTPClientProtocol {
    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await URLSession.shared.data(for: request)
    }
}
```

3. Your mock conforms to it with canned data:

```swift
struct MockHTTPClient: HTTPClientProtocol {
    var responseData: Data = Data()
    var statusCode: Int = 200

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        let response = HTTPURLResponse(
            url: request.url!,
            statusCode: statusCode,
            httpVersion: nil,
            headerFields: nil
        )!
        return (responseData, response)
    }
}
```

4. Your service accepts the protocol, not the concrete type:

```swift
class UserService {
    private let client: HTTPClientProtocol

    init(client: HTTPClientProtocol) {
        self.client = client
    }
}
```

---

## Step 6: Testing @Observable Classes

```swift
@Observable
class CartViewModel {
    var items: [CartItem] = []
    var total: Decimal { items.reduce(0) { $0 + $1.price } }

    func addItem(_ item: CartItem) {
        items.append(item)
    }

    func removeItem(at index: Int) {
        guard items.indices.contains(index) else { return }
        items.remove(at: index)
    }
}

// Tests
@Test("Adding item updates total")
func addItemUpdatesTotal() {
    let cart = CartViewModel()
    cart.addItem(CartItem(name: "Widget", price: 9.99))

    #expect(cart.items.count == 1)
    #expect(cart.total == 9.99)
}

@Test("Removing item at invalid index does nothing")
func removeInvalidIndex() {
    let cart = CartViewModel()
    cart.addItem(CartItem(name: "Widget", price: 9.99))
    cart.removeItem(at: 5) // out of bounds

    #expect(cart.items.count == 1) // still 1, no crash
}
```

---

## Step 7: Snapshot Testing

Snapshot tests capture a rendered view as an image and compare it to a reference image. If the output changes, the test fails and shows you the difference. Useful for catching unintended visual regressions.

Use the `swift-snapshot-testing` library (Point-Free):

```swift
import SnapshotTesting
import SwiftUI
import XCTest

final class ProfileViewSnapshotTests: XCTestCase {
    func testProfileView() {
        let view = ProfileView(user: .sample)
        let controller = UIHostingController(rootView: view)

        assertSnapshot(of: controller, as: .image(on: .iPhone13))
    }

    func testProfileViewDarkMode() {
        let view = ProfileView(user: .sample)
        let controller = UIHostingController(rootView: view)
        controller.overrideUserInterfaceStyle = .dark

        assertSnapshot(of: controller, as: .image(on: .iPhone13))
    }
}
```

> Note: Snapshot tests use XCTest, not Swift Testing. The snapshot library requires `XCTestCase` subclasses.

---

## Step 8: UI Testing Basics

UI tests launch your app in a separate process and interact with it like a user would -- tapping buttons, typing text, scrolling.

```swift
import XCTest

final class LoginUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["--uitesting"]
        app.launch()
    }

    func testSuccessfulLogin() {
        app.textFields["Email"].tap()
        app.textFields["Email"].typeText("user@example.com")

        app.secureTextFields["Password"].tap()
        app.secureTextFields["Password"].typeText("password123")

        app.buttons["Log In"].tap()

        XCTAssertTrue(app.staticTexts["Welcome"].waitForExistence(timeout: 5))
    }
}
```

### When to Use UI Tests vs Unit Tests

| Situation | Use |
|---|---|
| Checking a calculation result | Unit test |
| Checking a button exists and taps correctly | UI test |
| Checking a network response is parsed right | Unit test |
| Checking a full login flow end-to-end | UI test |

---

## Step 9: Test Organization

### File Naming

```
Tests/
  UnitTests/
    Models/
      ShoppingListTests.swift
      UserProfileTests.swift
    Services/
      UserServiceTests.swift
      PaymentServiceTests.swift
    ViewModels/
      CartViewModelTests.swift
  UITests/
    LoginUITests.swift
    OnboardingUITests.swift
  SnapshotTests/
    ProfileViewSnapshotTests.swift
```

### Naming Conventions

- Test file: `{TypeBeingTested}Tests.swift`
- Swift Testing: Use descriptive `@Test("...")` strings
- XCTest: `test{Behavior}_{Condition}_{ExpectedResult}` (e.g., `testLogin_withInvalidEmail_showsError`)

---

## Step 10: Running Tests from CLI and CI

```bash
# Run all tests
xcodebuild test -scheme YourApp -destination 'platform=iOS Simulator,name=iPhone 16'

# Run a specific test class
xcodebuild test -scheme YourApp -destination 'platform=iOS Simulator,name=iPhone 16' \
  -only-testing:YourAppTests/ShoppingListTests

# Run tests with swift test (for SPM packages)
swift test
```

For CI (GitHub Actions, Xcode Cloud), these same commands work. Add `-resultBundlePath` to generate test reports.

---

## Step 11: Coverage Goals

Start small and grow:

| Stage | Target | What to Focus On |
|---|---|---|
| Getting started | 30% | Business logic and model layer |
| Building momentum | 50% | Add service layer and view model tests |
| Solid foundation | 70% | Cover edge cases, error paths, and async flows |
| Mature project | 80%+ | Add snapshot tests and key UI tests |

Enable coverage in Xcode: **Product > Scheme > Edit Scheme > Test > Options > Code Coverage**.

The goal is not 100%. The goal is confidence that your important code works correctly.

---

## Cross-References

- For advanced testing patterns and TDD workflow: invoke `apple-testing-architect-updated`
- For the general test-driven development protocol: invoke `testing-protocol`
- For mock pattern catalog with complete code: see `references/mock-patterns-swift.md`
- For what-to-test decision tree: see `references/what-to-test-decision-tree.md`
- For first-test walkthrough: see `references/first-test-walkthrough.md`

---

## Common Mistakes to Catch

| Mistake | Fix |
|---|---|
| Testing private methods directly | Test through the public API instead |
| Tests that depend on other tests running first | Each test must set up its own state |
| Hitting real network in tests | Use protocol-based mocks |
| Testing Apple's code (e.g., does `Array.append` work?) | Only test your own logic |
| Giant test functions with 10+ assertions | Split into focused tests, one concept each |
| No assertion in the test | Every test must assert something or it proves nothing |
| Ignoring flaky tests | Fix or delete them; a flaky test erodes trust in the entire suite |
