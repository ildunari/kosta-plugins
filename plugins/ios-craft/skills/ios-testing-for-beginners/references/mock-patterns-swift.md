# Mock Patterns in Swift

Five patterns for replacing real dependencies with test doubles. Each serves a different purpose. Pick the one that fits what you need to verify.

---

## Pattern 1: Protocol-Based Mock

**Purpose:** Replace a dependency with a controllable version that returns canned data.

**When to use:** You want to control what data your code receives without hitting real services.

```swift
// 1. Define the contract
protocol WeatherServiceProtocol {
    func fetchForecast(for city: String) async throws -> Forecast
}

// 2. Real implementation
struct WeatherService: WeatherServiceProtocol {
    func fetchForecast(for city: String) async throws -> Forecast {
        // Real network call
        let url = URL(string: "https://api.weather.com/forecast?city=\(city)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(Forecast.self, from: data)
    }
}

// 3. Mock implementation
struct MockWeatherService: WeatherServiceProtocol {
    var forecastToReturn: Forecast = Forecast(temperature: 72, condition: "Sunny")
    var errorToThrow: Error?

    func fetchForecast(for city: String) async throws -> Forecast {
        if let error = errorToThrow { throw error }
        return forecastToReturn
    }
}

// 4. Use in tests
@Test("Shows temperature from service")
func showsTemperature() async throws {
    let mock = MockWeatherService(
        forecastToReturn: Forecast(temperature: 85, condition: "Hot")
    )
    let viewModel = WeatherViewModel(service: mock)

    await viewModel.loadForecast(for: "Miami")

    #expect(viewModel.temperature == "85F")
}
```

---

## Pattern 2: Closure-Based Mock

**Purpose:** Inject behavior without defining a protocol or mock class. Lightweight and flexible.

**When to use:** The dependency is a single function, or you want per-test customization without creating a new type.

```swift
// The type accepts a closure instead of a protocol
struct ImageLoader {
    var loadImage: (URL) async throws -> Data

    static let live = ImageLoader { url in
        let (data, _) = try await URLSession.shared.data(from: url)
        return data
    }

    static let mock = ImageLoader { _ in
        // Return 1x1 transparent PNG
        Data(base64Encoded: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==")!
    }
}

// Use in production
class ProfileViewModel {
    private let imageLoader: ImageLoader

    init(imageLoader: ImageLoader = .live) {
        self.imageLoader = imageLoader
    }
}

// Use in tests
@Test("Handles image load failure")
func imageLoadFailure() async {
    let loader = ImageLoader { _ in
        throw URLError(.notConnectedToInternet)
    }
    let viewModel = ProfileViewModel(imageLoader: loader)

    await viewModel.loadAvatar()

    #expect(viewModel.avatarState == .failed)
}
```

---

## Pattern 3: Spy (Records Calls)

**Purpose:** Verify that your code called a dependency the right number of times, with the right arguments.

**When to use:** You care about *how* your code interacts with the dependency, not just the return value.

```swift
class SpyAnalytics: AnalyticsProtocol {
    private(set) var trackedEvents: [(name: String, properties: [String: String])] = []

    func track(event: String, properties: [String: String]) {
        trackedEvents.append((name: event, properties: properties))
    }
}

// In tests
@Test("Tracks purchase event with correct properties")
func tracksPurchase() {
    let spy = SpyAnalytics()
    let checkout = CheckoutManager(analytics: spy)

    checkout.completePurchase(item: "Widget", price: "9.99")

    #expect(spy.trackedEvents.count == 1)
    #expect(spy.trackedEvents[0].name == "purchase_completed")
    #expect(spy.trackedEvents[0].properties["item"] == "Widget")
    #expect(spy.trackedEvents[0].properties["price"] == "9.99")
}

@Test("Does not track event when purchase fails")
func noTrackingOnFailure() {
    let spy = SpyAnalytics()
    let checkout = CheckoutManager(analytics: spy)

    checkout.attemptPurchase(item: "Widget", cardValid: false)

    #expect(spy.trackedEvents.isEmpty)
}
```

---

## Pattern 4: Stub (Canned Data, No Logic)

**Purpose:** Return fixed data without any conditional logic. The simplest kind of test double.

**When to use:** You just need a dependency to return something so your code can proceed. You don't care about interactions.

```swift
struct StubUserRepository: UserRepositoryProtocol {
    func fetchUser(id: String) async throws -> User {
        User(id: id, name: "Test User", email: "test@example.com")
    }

    func saveUser(_ user: User) async throws {
        // Do nothing -- we don't care about saves in this test
    }

    func deleteUser(id: String) async throws {
        // Do nothing
    }
}

// In tests
@Test("Profile displays user name")
func profileDisplaysName() async throws {
    let viewModel = ProfileViewModel(repository: StubUserRepository())

    await viewModel.load(userId: "123")

    #expect(viewModel.displayName == "Test User")
}
```

---

## Pattern 5: Fake (Simplified Real Implementation)

**Purpose:** A working implementation that behaves like the real thing but is simpler and faster. Uses in-memory storage instead of a database, for example.

**When to use:** You need realistic behavior across multiple operations (add, query, delete) without the overhead of a real backend.

```swift
class FakeTaskRepository: TaskRepositoryProtocol {
    private var tasks: [String: TaskItem] = [:]

    func save(_ task: TaskItem) async throws {
        tasks[task.id] = task
    }

    func fetch(id: String) async throws -> TaskItem {
        guard let task = tasks[id] else {
            throw RepositoryError.notFound
        }
        return task
    }

    func fetchAll() async throws -> [TaskItem] {
        Array(tasks.values).sorted { $0.createdAt < $1.createdAt }
    }

    func delete(id: String) async throws {
        guard tasks.removeValue(forKey: id) != nil else {
            throw RepositoryError.notFound
        }
    }
}

// In tests -- the fake behaves like a real database
@Test("Round-trip: save then fetch returns same task")
func roundTrip() async throws {
    let repo = FakeTaskRepository()
    let task = TaskItem(id: "1", title: "Buy milk", createdAt: .now)

    try await repo.save(task)
    let fetched = try await repo.fetch(id: "1")

    #expect(fetched.title == "Buy milk")
}

@Test("Fetching deleted task throws notFound")
func fetchDeletedTask() async throws {
    let repo = FakeTaskRepository()
    let task = TaskItem(id: "1", title: "Buy milk", createdAt: .now)
    try await repo.save(task)
    try await repo.delete(id: "1")

    await #expect(throws: RepositoryError.notFound) {
        try await repo.fetch(id: "1")
    }
}
```

---

## Choosing the Right Pattern

| Pattern | Best For | Complexity |
|---|---|---|
| **Protocol Mock** | Controlling return values and errors | Medium |
| **Closure Mock** | Single-function dependencies, per-test behavior | Low |
| **Spy** | Verifying calls were made correctly | Medium |
| **Stub** | Providing fixed data, no verification needed | Low |
| **Fake** | Multi-operation scenarios needing realistic behavior | High |

### Rules of Thumb

- Start with the **simplest pattern** that lets you write your test.
- If you only need to control what data comes back: **stub** or **protocol mock**.
- If you need to verify your code called something correctly: **spy**.
- If you need to test a flow that reads and writes multiple times: **fake**.
- If the dependency is a single function: **closure mock**.
