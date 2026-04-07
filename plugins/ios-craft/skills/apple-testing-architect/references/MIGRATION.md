# XCTest to Swift Testing Migration Guide

**Target**: Teams migrating from XCTest to Swift Testing  
**Approach**: Gradual, incremental migration  
**Timeframe**: Project-dependent (weeks to months)  
**Last Updated**: 2025-10-28

## Overview

This guide provides a step-by-step approach to migrating from XCTest to Swift Testing. The key insight: **both frameworks can coexist in the same test target**, enabling gradual migration without big-bang rewrites.

## Migration Strategy

### Phase 1: Preparation (1-2 weeks)

**Assess current state**:
- Count existing XCTest files and assertions
- Identify test categories (unit, integration, UI, performance)
- Document dependencies on XCTest-specific features
- Upgrade to Xcode 16+ on CI/CD

**Team preparation**:
- Review Swift Testing documentation as a team
- Run through basic examples together
- Establish naming conventions for Swift Testing
- Update style guide

### Phase 2: Enable Co-existence (1 day)

Swift Testing and XCTest work together without configuration:

```swift
// Same test target can have both!

// ExistingXCTests.swift
import XCTest

class ExistingTests: XCTestCase {
    func testSomething() {
        XCTAssertTrue(true)
    }
}

// NewSwiftTests.swift
import Testing

@Test func newTest() {
    #expect(true)
}
```

No special setup needed—both run together.

### Phase 3: Incremental Migration (ongoing)

**Golden rule**: Migrate one test file at a time, review, commit.

**Priority order**:
1. ✅ **New tests**: Write in Swift Testing immediately
2. ✅ **Simple unit tests**: Easy wins, build confidence
3. ✅ **Async tests**: Swift Testing handles these better
4. ⚠️ **Complex integration tests**: Migrate when stable
5. ❌ **UI tests**: Keep in XCUITest (no Swift Testing support)
6. ❌ **Performance tests**: Keep in XCTest (no Swift Testing support)

### Phase 4: Cleanup (final)

Once migration complete:
- Remove XCTest imports where possible
- Update CI/CD scripts if needed
- Archive migration documentation
- Celebrate! 🎉

## Step-by-Step Migration Pattern

### Example: Migrating a Test File

**Before (XCTest)**:
```swift
import XCTest
@testable import MyApp

final class UserServiceTests: XCTestCase {
    var service: UserService!
    var mockAPI: MockAPI!
    
    override func setUp() {
        super.setUp()
        mockAPI = MockAPI()
        service = UserService(api: mockAPI)
    }
    
    override func tearDown() {
        service = nil
        mockAPI = nil
        super.tearDown()
    }
    
    func testFetchUser_Success() async throws {
        mockAPI.mockResponse = .success(User(id: "123", name: "Test"))
        
        let user = try await service.fetchUser(id: "123")
        
        XCTAssertEqual(user.id, "123")
        XCTAssertEqual(user.name, "Test")
    }
    
    func testFetchUser_NetworkError() async throws {
        mockAPI.mockResponse = .failure(NetworkError.timeout)
        
        do {
            _ = try await service.fetchUser(id: "123")
            XCTFail("Expected error to be thrown")
        } catch {
            XCTAssertTrue(error is NetworkError)
        }
    }
}
```

**After (Swift Testing)**:
```swift
import Testing
@testable import MyApp

@Suite("User service tests")
struct UserServiceTests {
    let mockAPI = MockAPI()
    let service: UserService
    
    init() {
        service = UserService(api: mockAPI)
    }
    
    @Test("fetches user successfully")
    func fetchUserSuccess() async throws {
        mockAPI.mockResponse = .success(User(id: "123", name: "Test"))
        
        let user = try await service.fetchUser(id: "123")
        
        #expect(user.id == "123")
        #expect(user.name == "Test")
    }
    
    @Test("handles network timeout error")
    func fetchUserNetworkError() async throws {
        mockAPI.mockResponse = .failure(NetworkError.timeout)
        
        await #expect(throws: NetworkError.self) {
            try await service.fetchUser(id: "123")
        }
    }
}
```

### Migration Checklist for Each File

- [ ] Change `import XCTest` to `import Testing`
- [ ] Convert `class XCTestCase` to `struct` (or keep class if needed)
- [ ] Move `setUp()` logic to `init()`
- [ ] Remove `tearDown()` or move to `deinit` if needed
- [ ] Remove `func test` prefix, add `@Test` attribute
- [ ] Convert assertions (see table below)
- [ ] Add descriptive names to `@Test("...")`
- [ ] Remove `XCTFail` calls, replace with proper assertions
- [ ] Test the file builds and runs
- [ ] Review and commit

## Assertion Migration

### Complete Conversion Table

| XCTest | Swift Testing | Example |
|--------|---------------|---------|
| `XCTAssertTrue(x)` | `#expect(x)` | `#expect(user.isActive)` |
| `XCTAssertFalse(x)` | `#expect(!x)` | `#expect(!user.isDeleted)` |
| `XCTAssertEqual(a, b)` | `#expect(a == b)` | `#expect(count == 5)` |
| `XCTAssertNotEqual(a, b)` | `#expect(a != b)` | `#expect(id != oldId)` |
| `XCTAssertNil(x)` | `#expect(x == nil)` | `#expect(error == nil)` |
| `XCTAssertNotNil(x)` | `#expect(x != nil)` or `try #require(x)` | `let user = try #require(user)` |
| `XCTUnwrap(x)` | `try #require(x)` | `let data = try #require(data)` |
| `XCTAssertGreaterThan(a, b)` | `#expect(a > b)` | `#expect(count > 0)` |
| `XCTAssertLessThan(a, b)` | `#expect(a < b)` | `#expect(duration < 1.0)` |
| `XCTAssertGreaterThanOrEqual(a, b)` | `#expect(a >= b)` | `#expect(age >= 18)` |
| `XCTAssertLessThanOrEqual(a, b)` | `#expect(a <= b)` | `#expect(score <= 100)` |
| `XCTAssertThrowsError { }` | `#expect(throws: Error.self) { }` | `#expect(throws: ValidationError.self) { try validate() }` |
| `XCTAssertNoThrow { }` | Just call it | `try await fetchData()` |
| `XCTFail("message")` | `Issue.record("message")` or proper assertion | `#expect(Bool(false), "Custom failure")` |

### Assertion Examples

#### Boolean Assertions
```swift
// XCTest
XCTAssertTrue(user.isActive)
XCTAssertFalse(user.isDeleted)

// Swift Testing
#expect(user.isActive)
#expect(!user.isDeleted)
```

#### Equality Assertions
```swift
// XCTest
XCTAssertEqual(user.name, "Alice")
XCTAssertNotEqual(user.id, previousId)

// Swift Testing
#expect(user.name == "Alice")
#expect(user.id != previousId)
```

#### Nil Checking
```swift
// XCTest
XCTAssertNil(error)
XCTAssertNotNil(user)
let unwrapped = try XCTUnwrap(user)

// Swift Testing
#expect(error == nil)
#expect(user != nil)
let unwrapped = try #require(user)  // Stops test if nil
```

#### Error Handling
```swift
// XCTest
XCTAssertThrowsError(try validator.validate(input)) { error in
    XCTAssertTrue(error is ValidationError)
}

// Swift Testing
#expect(throws: ValidationError.self) {
    try validator.validate(input)
}

// Or more specific
await #expect(throws: ValidationError.invalidEmail) {
    try validator.validate(input)
}
```

#### Async Assertions
```swift
// XCTest
func testAsync() async throws {
    let result = try await fetchData()
    XCTAssertEqual(result.count, 10)
}

// Swift Testing (same!)
@Test func asyncOperation() async throws {
    let result = try await fetchData()
    #expect(result.count == 10)
}
```

## Setup/Teardown Migration

### Per-Test Setup

```swift
// XCTest
class Tests: XCTestCase {
    var sut: Service!
    
    override func setUp() {
        super.setUp()
        sut = Service(config: .test)
    }
    
    override func tearDown() {
        sut.cleanup()
        sut = nil
        super.tearDown()
    }
    
    func testSomething() {
        sut.doWork()
        XCTAssertTrue(sut.completed)
    }
}

// Swift Testing
struct Tests {
    let sut: Service
    
    init() {
        sut = Service(config: .test)
    }
    
    deinit {
        sut.cleanup()
    }
    
    @Test func something() {
        sut.doWork()
        #expect(sut.completed)
    }
}
```

### Suite-Level Setup

```swift
// XCTest
class Tests: XCTestCase {
    static var database: Database!
    
    override class func setUp() {
        database = Database.testInstance()
    }
    
    override class func tearDown() {
        database.teardown()
    }
}

// Swift Testing
@Suite("Database tests")
struct Tests {
    static let database = Database.testInstance()
    
    @Test func queryData() {
        let results = Self.database.query()
        #expect(results.count > 0)
    }
}
```

## Parameterized Test Migration

```swift
// XCTest (manual looping)
func testIsEven() {
    let testCases = [
        (0, true),
        (1, false),
        (2, true),
        (3, false),
    ]
    
    for (number, expected) in testCases {
        XCTAssertEqual(isEven(number), expected)
    }
}

// Swift Testing (built-in)
@Test(
    "validates even numbers",
    arguments: [
        (0, true),
        (1, false),
        (2, true),
        (3, false),
    ]
)
func isEven(number: Int, expected: Bool) {
    #expect(isEven(number) == expected)
}
```

## Async/Expectation Migration

### XCTest Expectations → Confirmations

```swift
// XCTest
func testCallback() {
    let exp = expectation(description: "callback fires")
    
    service.fetchData { result in
        XCTAssertNotNil(result)
        exp.fulfill()
    }
    
    wait(for: [exp], timeout: 5)
}

// Swift Testing
@Test func callback() async {
    await confirmation("callback fires") { confirm in
        service.fetchData { result in
            #expect(result != nil)
            confirm()
        }
    }
}
```

## Common Migration Patterns

### Pattern 1: Test Classes → Test Structs

Prefer structs for value semantics and simplicity:

```swift
// XCTest
final class ViewModelTests: XCTestCase {
    // Tests here
}

// Swift Testing
@Suite("ViewModel tests")
struct ViewModelTests {
    // Tests here
}
```

### Pattern 2: Grouped Tests

```swift
// XCTest
class UserTests: XCTestCase {
    func testValidation() { }
    func testAuthentication() { }
}

// Swift Testing - explicit grouping
@Suite("User management")
struct UserTests {
    
    @Suite("Validation")
    struct ValidationTests {
        @Test func emailFormat() { }
        @Test func passwordStrength() { }
    }
    
    @Suite("Authentication")
    struct AuthTests {
        @Test func login() { }
        @Test func logout() { }
    }
}
```

### Pattern 3: Conditional Tests

```swift
// XCTest
func testPremiumFeature() throws {
    try XCTSkipUnless(FeatureFlags.isPremiumEnabled, "Premium disabled")
    // Test premium feature
}

// Swift Testing
@Test(.enabled(if: FeatureFlags.isPremiumEnabled))
func premiumFeature() {
    // Test premium feature
}
```

## What to Keep in XCTest

### UI Tests (Must Stay)

```swift
// ❌ Cannot migrate to Swift Testing
import XCTest

final class AppUITests: XCTestCase {
    func testLoginFlow() {
        let app = XCUIApplication()
        app.launch()
        
        app.buttons["Login"].tap()
        // UI test logic
    }
}
```

Swift Testing does not support UI testing—keep these in XCUITest.

### Performance Tests (Must Stay)

```swift
// ❌ Cannot migrate to Swift Testing
import XCTest

final class PerformanceTests: XCTestCase {
    func testRenderingPerformance() {
        measure(metrics: [XCTClockMetric()]) {
            renderView()
        }
    }
}
```

Swift Testing doesn't have performance testing—keep in XCTest.

## Migration Gotchas

### 1. Test Discovery Changes

XCTest auto-discovers `test*` methods. Swift Testing uses `@Test`:

```swift
// XCTest - auto-discovered
func testSomething() { }

// Swift Testing - needs @Test
@Test func something() { }  // ✅
func something() { }        // ❌ Not discovered!
```

### 2. XCTFail Has No Direct Equivalent

```swift
// XCTest
func testLogic() {
    if condition {
        XCTFail("Should not happen")
    }
}

// Swift Testing - use proper assertion
@Test func logic() {
    #expect(!condition, "Should not happen")
}
```

### 3. Mocking XCTestCase Methods

Some test utilities expect `XCTestCase`:

```swift
// Library that expects XCTestCase
class CustomMatcher: XCTestCase {
    func customAssert() { }
}

// May need wrapper or wait for library update
```

### 4. Test Plans

XCTest test plans work differently:

```swift
// XCTest test plans → Swift Testing tags
// Migrate test plans to tag-based filtering
```

## Migration Metrics

Track migration progress:

```bash
# Count XCTest files
find . -name "*Tests.swift" -exec grep -l "XCTest" {} \; | wc -l

# Count Swift Testing files
find . -name "*Tests.swift" -exec grep -l "import Testing" {} \; | wc -l

# Generate migration report
python3 scripts/migration_report.py
```

## Timeline Estimates

**Small project** (< 100 test files):
- Preparation: 1 week
- Migration: 2-4 weeks
- Total: 3-5 weeks

**Medium project** (100-500 test files):
- Preparation: 2 weeks
- Migration: 2-3 months
- Total: 2.5-3.5 months

**Large project** (500+ test files):
- Preparation: 1 month
- Migration: 3-6 months
- Total: 4-7 months

## Best Practices During Migration

1. **Migrate file-by-file**: Complete one file before moving to next
2. **Test as you go**: Run tests after each file migration
3. **Keep commits small**: One test file per commit
4. **Update documentation**: Keep README in sync
5. **Communicate**: Let team know which files are migrated
6. **Don't mix styles**: Don't have both XCTest and Swift Testing in same file
7. **Prioritize green field**: New tests go straight to Swift Testing

## Team Coordination

### During Migration

1. **Designate owner**: One person coordinates migration effort
2. **Track progress**: Use GitHub project or JIRA
3. **Avoid conflicts**: Coordinate who's migrating what
4. **Review carefully**: PRs for migrations need extra attention
5. **Document decisions**: Keep notes on why certain tests weren't migrated

### Communication Template

```markdown
## Test Migration Status

**Phase**: 3 - Incremental Migration  
**Progress**: 45/200 files (22.5%)  
**Target completion**: Q2 2025

### Recently Migrated
- ✅ UserServiceTests
- ✅ AuthenticationTests  
- ✅ ValidationTests

### In Progress
- 🔄 PaymentTests (Alice)
- 🔄 NetworkTests (Bob)

### Blocked
- ❌ LegacyTests (depends on deprecated library)

### Won't Migrate
- UI Tests (XCUITest required)
- Performance Tests (XCTest required)
```

## Troubleshooting Migration Issues

### Issue: Tests Not Appearing

```swift
// ❌ Forgot @Test
func myTest() {
    #expect(true)
}

// ✅ Add @Test
@Test func myTest() {
    #expect(true)
}
```

### Issue: Build Errors After Migration

```swift
// ❌ Mixed imports
import XCTest
import Testing  // Conflict!

// ✅ Choose one
import Testing
```

### Issue: Performance Regression

Swift Testing runs tests in parallel by default:

```swift
// If tests conflict, mark as serial
@Test(.serialized)
func accessSharedResource() {
    // Test uses shared mutable state
}
```

## Success Criteria

Migration is complete when:
- [ ] All unit tests migrated to Swift Testing
- [ ] All integration tests migrated to Swift Testing
- [ ] UI tests remain in XCUITest
- [ ] Performance tests remain in XCTest
- [ ] CI/CD pipeline updated
- [ ] Documentation updated
- [ ] Team trained on Swift Testing
- [ ] Style guide updated

## Resources

- Swift Testing documentation: https://developer.apple.com/documentation/testing
- Migration examples: `/examples/migration/`
- Team training materials: `/docs/swift-testing-training.md`
- Migration tracking: [Project Board Link]

## Questions?

Common questions during migration:

**Q: Can we mix XCTest and Swift Testing in same target?**  
A: Yes! They coexist perfectly.

**Q: Should we migrate all tests at once?**  
A: No, migrate incrementally one file at a time.

**Q: What about our UI tests?**  
A: Keep them in XCUITest—Swift Testing doesn't support UI testing.

**Q: Will this break our CI?**  
A: No, but ensure CI uses Xcode 16+.

**Q: How long will this take?**  
A: Depends on project size—see timeline estimates above.

---

**Last Updated**: 2025-10-28  
**Next Review**: Check for Swift Testing updates quarterly
