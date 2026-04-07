# Swift Testing Deep Dive

**Framework Status**: Early Adoption (Xcode 16+, Swift 6.0+)  
**API Stability**: Evolving - verify syntax before using  
**Last Updated**: 2025-10-28  
**Swift Evolution**: [proposals/testing/](https://github.com/apple/swift-evolution/tree/main/proposals/testing)

## Overview

Swift Testing is Apple's modern, open-source testing framework introduced at WWDC 2024. Built using Swift macros and designed for Swift Concurrency, it provides a more expressive and powerful alternative to XCTest for unit and integration testing.

**Key Characteristics**:
- Parallel execution by default
- Macro-based API (@Test, @Suite, traits)
- Native async/await support
- Parameterized testing built-in
- Tag-based organization
- Cross-platform (Apple platforms, Linux, Windows, WebAssembly)

## Version History

### Swift 6.0 (Xcode 16, Sept 2024)
- Initial release
- Core features: @Test, @Suite, #expect, #require
- Parameterized tests
- Tags and traits
- Async/await integration

### Swift 6.1 (Xcode 16.3, Early 2025)
- **ST-0005**: Ranged confirmations for async callback testing
- **ST-0006**: Custom test scoping
- **ST-0007**: Additional trait improvements

### Swift 6.2 (Xcode 26 beta, Mid 2025)
- **ST-0008**: Exit testing (test code that terminates)
- **ST-0009**: Test attachments (add context to failures)
- **ST-0010**: Process isolation improvements

**⚠️ Note**: API is stabilizing but may change. Always check current documentation.

## Core Concepts

### 1. Test Functions

Basic test structure:

```swift
import Testing

@Test func basicAssertion() {
    #expect(2 + 2 == 4)
}
```

With descriptive names:

```swift
@Test("validates email format")
func emailValidation() {
    let validator = EmailValidator()
    #expect(validator.isValid("test@example.com"))
}
```

Async tests:

```swift
@Test func fetchUserData() async throws {
    let service = UserService()
    let user = try await service.fetchUser(id: "123")
    #expect(user.name == "Test User")
}
```

### 2. Test Suites

Organize tests using structs, classes, actors, or enums:

```swift
import Testing

@Suite("User authentication tests")
struct AuthenticationTests {
    let authService = AuthService()
    
    @Test("successful login with valid credentials")
    func successfulLogin() async throws {
        let result = try await authService.login(
            email: "user@test.com",
            password: "ValidPass123"
        )
        #expect(result.success)
    }
    
    @Test("login fails with invalid password")
    func invalidPasswordLogin() async throws {
        await #expect(throws: AuthError.invalidCredentials) {
            try await authService.login(
                email: "user@test.com",
                password: "wrong"
            )
        }
    }
}
```

Nested suites:

```swift
@Suite("Network layer")
struct NetworkTests {
    
    @Suite("API requests")
    struct APIRequestTests {
        @Test func getRequest() { }
        @Test func postRequest() { }
    }
    
    @Suite("Error handling")
    struct ErrorHandlingTests {
        @Test func networkTimeout() { }
        @Test func serverError() { }
    }
}
```

### 3. Expectations

#### #expect (continues on failure)

```swift
@Test func multipleAssertions() {
    let result = calculate(10, 5)
    
    #expect(result.sum == 15)           // Continues even if fails
    #expect(result.product == 50)       // Also runs
    #expect(result.difference == 5)     // Also runs
}
```

#### #require (stops on failure)

```swift
@Test func requireExample() throws {
    let user = try #require(database.fetchUser(id: "123"))
    // Test stops here if user is nil
    
    #expect(user.isActive)
    #expect(user.email.contains("@"))
}
```

With async:

```swift
@Test func asyncRequire() async throws {
    let data = try await #require(await fetchData())
    #expect(data.count > 0)
}
```

### 4. Parameterized Tests

Test same logic with multiple inputs:

```swift
@Test("validates even numbers", arguments: [0, 2, 4, 6, 8, 10])
func isEven(_ number: Int) {
    #expect(number % 2 == 0)
}
```

Multiple parameters:

```swift
@Test(
    "validates email format",
    arguments: [
        ("user@example.com", true),
        ("invalid.email", false),
        ("@example.com", false),
        ("user@domain", false),
    ]
)
func emailValidation(email: String, shouldBeValid: Bool) {
    let validator = EmailValidator()
    #expect(validator.isValid(email) == shouldBeValid)
}
```

Using collections:

```swift
@Test("validates all valid emails", arguments: ValidEmails.allCases)
func validEmailFormats(email: String) {
    #expect(EmailValidator().isValid(email))
}
```

Zip parameters:

```swift
@Test(
    arguments: zip(["Alice", "Bob", "Charlie"], [25, 30, 35])
)
func ageValidation(name: String, age: Int) {
    let user = User(name: name, age: age)
    #expect(user.isAdult == (age >= 18))
}
```

### 5. Tags

Organize and filter tests:

```swift
extension Tag {
    @Tag static var critical: Self
    @Tag static var integration: Self
    @Tag static var slow: Self
    @Tag static var ui: Self
}

@Suite("API Tests")
struct APITests {
    
    @Test("fetch user profile", .tags(.critical, .integration))
    func fetchProfile() async throws {
        // Critical integration test
    }
    
    @Test("fetch all users", .tags(.slow))
    func fetchAllUsers() async throws {
        // Slow test
    }
}
```

Run specific tags in Xcode:
- Test Navigator → Filter by tag
- Command line: `swift test --filter tag:critical`

### 6. Traits

Control test behavior:

```swift
// Time limit
@Test(.timeLimit(.minutes(5)))
func longRunningTest() async {
    await processLargeDataset()
}

// Disabled conditionally
@Test(.enabled(if: AppFeatures.isPremiumEnabled))
func premiumFeatureTest() {
    // Only runs if feature flag is on
}

// Disabled with bug reference
@Test(.disabled("Known issue: JIRA-1234"))
func flakyTest() {
    // Temporarily disabled
}

// Serial execution (not parallel)
@Test(.serialized)
func requiresExclusiveAccess() {
    SharedResource.modify()
}
```

Combine traits:

```swift
@Test(
    "critical user flow",
    .tags(.critical),
    .timeLimit(.seconds(30)),
    .serialized
)
func criticalFlow() async throws {
    // Test configuration
}
```

### 7. Confirmations (Async Callbacks)

**Swift 6.0 - Basic confirmation**:

```swift
@Test func notificationReceived() async {
    await confirmation("notification fires") { confirm in
        NotificationCenter.default.addObserver(
            forName: .didUpdate,
            object: nil,
            queue: nil
        ) { _ in
            confirm()
        }
        
        triggerUpdate()
    }
}
```

**Swift 6.1 - Ranged confirmations**:

```swift
@Test func callbackCalledMultipleTimes() async {
    await confirmation(expectedCount: 3) { confirm in
        let publisher = createPublisher()
        
        publisher.sink { value in
            confirm()  // Must be called exactly 3 times
        }
        
        await publisher.send(values: [1, 2, 3])
    }
}

// Or with a range
@Test func callbackCalledAtLeastOnce() async {
    await confirmation(expectedCount: 1...) { confirm in
        // Must be called at least once
    }
}
```

### 8. Exit Testing (Swift 6.2+)

Test code that terminates:

```swift
@Test func preconditionFailure() {
    #expect(exitsWith: .failure) {
        precondition(false, "This should crash")
    }
}

@Test func exitCode() {
    #expect(exitsWith: .exitCode(42)) {
        exit(42)
    }
}

@Test func signal() {
    #expect(exitsWith: .signal(SIGTERM)) {
        raise(SIGTERM)
    }
}
```

### 9. Test Attachments (Swift 6.2+)

Add context to test results:

```swift
@Test func imageProcessing() async throws {
    let image = loadTestImage()
    let processed = processImage(image)
    
    // Attach original for debugging
    Attachment.record(
        image.pngData()!,
        name: "original-image.png"
    )
    
    // Attach processed result
    Attachment.record(
        processed.pngData()!,
        name: "processed-image.png"
    )
    
    #expect(processed.size == expectedSize)
}

@Test func apiRequest() async throws {
    let response = try await makeRequest()
    
    // Attach request/response for debugging
    Attachment.record(
        response.debugDescription,
        name: "api-response.txt"
    )
    
    #expect(response.statusCode == 200)
}
```

## Swift Testing vs XCTest

### Syntax Comparison

#### Basic Assertion

```swift
// XCTest
func testAddition() {
    XCTAssertEqual(2 + 2, 4)
}

// Swift Testing
@Test func addition() {
    #expect(2 + 2 == 4)
}
```

#### Async Testing

```swift
// XCTest
func testFetchUser() async throws {
    let user = try await service.fetchUser()
    XCTAssertEqual(user.name, "Test")
}

// Swift Testing (same!)
@Test func fetchUser() async throws {
    let user = try await service.fetchUser()
    #expect(user.name == "Test")
}
```

#### Setup/Teardown

```swift
// XCTest
class Tests: XCTestCase {
    var sut: Service!
    
    override func setUp() {
        sut = Service()
    }
    
    override func tearDown() {
        sut = nil
    }
    
    func testSomething() {
        // use sut
    }
}

// Swift Testing
struct Tests {
    let sut = Service()  // init runs before each test
    
    @Test func something() {
        // use sut
    }
    
    // deinit runs after each test if needed
}
```

#### Parameterized Tests

```swift
// XCTest (manual)
func testIsEven() {
    let numbers = [0, 2, 4, 6, 8]
    for number in numbers {
        XCTAssertTrue(isEven(number))
    }
}

// Swift Testing (built-in)
@Test(arguments: [0, 2, 4, 6, 8])
func isEven(_ number: Int) {
    #expect(isEven(number))
}
```

### Migration Assertion Map

| XCTest | Swift Testing | Notes |
|--------|---------------|-------|
| `XCTAssertTrue(x)` | `#expect(x)` | |
| `XCTAssertFalse(x)` | `#expect(!x)` | |
| `XCTAssertEqual(a, b)` | `#expect(a == b)` | Better diff output |
| `XCTAssertNotEqual(a, b)` | `#expect(a != b)` | |
| `XCTAssertNil(x)` | `#expect(x == nil)` | |
| `XCTAssertNotNil(x)` | `#expect(x != nil)` | Or use #require |
| `XCTUnwrap(x)` | `try #require(x)` | Stops test on nil |
| `XCTAssertThrowsError` | `#expect(throws: E.self)` | |
| `XCTAssertNoThrow` | No direct equivalent | Just call directly |
| `XCTAssertGreaterThan(a, b)` | `#expect(a > b)` | |
| `XCTAssertLessThan(a, b)` | `#expect(a < b)` | |

## Best Practices

### 1. Use Descriptive Test Names

```swift
// ❌ Unclear
@Test func test1() { }

// ✅ Clear
@Test("validates user input before submission")
func userInputValidation() { }
```

### 2. Organize with Suites and Tags

```swift
@Suite("Payment processing")
struct PaymentTests {
    
    @Test("successful credit card payment", .tags(.critical, .integration))
    func creditCardSuccess() async throws {
        // Test critical payment flow
    }
    
    @Test("handles declined card", .tags(.integration))
    func declinedCard() async throws {
        // Test error handling
    }
}
```

### 3. Use #require for Essential Prerequisites

```swift
@Test func processUser() async throws {
    // Stop test if user can't be fetched
    let user = try await #require(fetchUser())
    
    // Continue with valid user
    let result = process(user)
    #expect(result.success)
}
```

### 4. Parameterize Similar Tests

```swift
// ❌ Repetitive
@Test func validatePositiveNumber() {
    #expect(isPositive(1))
}
@Test func validateAnotherPositiveNumber() {
    #expect(isPositive(10))
}

// ✅ Parameterized
@Test(arguments: [1, 10, 100, 1000])
func validatePositiveNumber(_ n: Int) {
    #expect(isPositive(n))
}
```

### 5. Use Traits for Test Configuration

```swift
@Test(
    "uploads large file",
    .timeLimit(.minutes(5)),
    .tags(.slow),
    .enabled(if: TestEnvironment.hasNetwork)
)
func largeFileUpload() async throws {
    // Configured test
}
```

### 6. Async Best Practices

```swift
@Test func asyncFlow() async throws {
    // Use await naturally
    let result = try await performAsyncOperation()
    
    // Multiple awaits work fine
    let validated = try await validate(result)
    let stored = try await store(validated)
    
    #expect(stored.success)
}
```

## Known Limitations (as of 2025-10-28)

1. **No UI Testing Support**: XCUITest still required for UI automation
2. **No Performance Testing**: XCTest's XCTMetric still needed
3. **API Evolution**: Syntax may change in minor updates
4. **IDE Integration**: Some Xcode features still XCTest-optimized
5. **Third-Party Libraries**: Not all testing libraries support Swift Testing yet

## Troubleshooting

### Tests Not Appearing in Test Navigator

```swift
// ❌ Missing import
func myTest() {
    #expect(true)
}

// ✅ Import Testing
import Testing

@Test func myTest() {
    #expect(true)
}
```

### Parameterized Tests Not Running

```swift
// ❌ Non-Codable type
struct ComplexType {
    let data: [String: Any]  // Not Codable!
}

@Test(arguments: [ComplexType()])  // Won't work
func test(_ value: ComplexType) { }

// ✅ Use Codable types
@Test(arguments: [1, 2, 3])
func test(_ value: Int) { }
```

### Parallel Test Failures

```swift
// ❌ Shared mutable state
var sharedCounter = 0

@Test func incrementCounter() {
    sharedCounter += 1  // Race condition!
}

// ✅ Isolate state or use .serialized
@Test(.serialized)
func incrementCounter() {
    sharedCounter += 1
}
```

### Build Errors with Swift 6.0

```swift
// ❌ Missing async
@Test func fetchData() {
    let data = await service.fetch()  // Error!
}

// ✅ Mark as async
@Test func fetchData() async {
    let data = await service.fetch()
}
```

## Resources

- **Official Docs**: https://developer.apple.com/documentation/testing
- **Swift Package Index**: https://swiftpackageindex.com/swiftlang/swift-testing
- **GitHub**: https://github.com/swiftlang/swift-testing
- **WWDC 2024**: "Meet Swift Testing" (Session 10179)
- **WWDC 2024**: "Go further with Swift Testing" (Session 10195)
- **Swift Forums**: https://forums.swift.org/c/related-projects/swift-testing

## Version-Specific Features

Always check current Xcode version and verify available features:

```swift
// Check if feature is available
#if compiler(>=6.0)
    // Swift 6.0+ features
#endif

#if compiler(>=6.1)
    // Swift 6.1+ features (ranged confirmations)
#endif

#if compiler(>=6.2)
    // Swift 6.2+ features (exit testing, attachments)
#endif
```

**Critical**: This document reflects the state as of 2025-10-28. Always verify with:
- `web_search("Swift Testing Xcode [current version] changes")`
- Swift Evolution proposals: https://github.com/apple/swift-evolution/tree/main/proposals/testing
- Swift forums for breaking changes and known issues
