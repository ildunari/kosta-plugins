# Testing Troubleshooting Guide

**Last Updated**: 2025-10-28  
**Target**: Developers encountering testing issues

## Swift Testing Issues

### Tests Not Appearing in Test Navigator

**Symptom**: Tests with @Test don't show up in Xcode

**Cause**: Missing import or @Test attribute

**Solution**:
```swift
// ❌ Missing import
func myTest() {
    #expect(true)
}

// ✅ Correct
import Testing

@Test func myTest() {
    #expect(true)
}
```

### Build Error: "Cannot find 'Test' in scope"

**Symptom**: Compiler can't find @Test macro

**Cause**: Xcode version < 16

**Solution**: Upgrade to Xcode 16+ or use XCTest

### Parameterized Tests Not Running

**Symptom**: Parameterized tests show zero executions

**Cause**: Non-Codable parameter type

**Solution**:
```swift
// ❌ Not Codable
struct Complex {
    let dict: [String: Any]  // Not Codable!
}

// ✅ Codable
struct User: Codable {
    let name: String
}

@Test(arguments: [User(name: "Alice")])
func testUser(_ user: User) { }
```

### Parallel Test Failures

**Symptom**: Tests pass individually but fail when run together

**Cause**: Shared mutable state causing race conditions

**Solution**:
```swift
// ❌ Shared state
var counter = 0

@Test func incrementCounter() {
    counter += 1  // Race condition!
}

// ✅ Isolated state
@Test func incrementCounter() {
    var counter = 0
    counter += 1
}

// Or use .serialized
@Test(.serialized)
func accessSharedResource() {
    SharedResource.modify()
}
```

### Confirmation Timeout

**Symptom**: `await confirmation` times out

**Cause**: Callback never called or called too many/few times

**Solution**:
```swift
// Check callback is actually called
await confirmation("callback fires") { confirm in
    service.fetchData { result in
        confirm()  // Ensure this is reached
    }
}

// Adjust expected count if needed (Swift 6.1+)
await confirmation(expectedCount: 3) { confirm in
    // Must be called exactly 3 times
}
```

## XCTest Issues

### Async Tests Not Waiting

**Symptom**: Test completes before async work finishes

**Cause**: Missing `async` or `await` keyword

**Solution**:
```swift
// ❌ Not awaiting
func testFetch() {
    let result = service.fetch()  // Doesn't wait!
    XCTAssertNotNil(result)
}

// ✅ Properly async
func testFetch() async throws {
    let result = try await service.fetch()
    XCTAssertNotNil(result)
}
```

### XCTestExpectation Never Fulfilled

**Symptom**: Test times out waiting for expectation

**Cause**: Callback not called or `fulfill()` not reached

**Solution**:
```swift
func testCallback() {
    let exp = expectation(description: "completes")
    
    service.fetch { result in
        // Add debugging
        print("Callback called")
        XCTAssertNotNil(result)
        exp.fulfill()  // Ensure this is reached
    }
    
    wait(for: [exp], timeout: 10)  // Increase timeout while debugging
}
```

### Main Actor Isolation Errors

**Symptom**: "Main actor-isolated property X can not be referenced from a non-isolated context"

**Cause**: Accessing UI from non-main thread in tests

**Solution**:
```swift
// ❌ Error
func testUI() {
    let vc = MyViewController()
    XCTAssertTrue(vc.isVisible)  // Error!
}

// ✅ Use MainActor
@MainActor
func testUI() {
    let vc = MyViewController()
    XCTAssertTrue(vc.isVisible)
}

// Or await on main actor
func testUI() async {
    await MainActor.run {
        let vc = MyViewController()
        XCTAssertTrue(vc.isVisible)
    }
}
```

## XCUITest Issues

### Element Not Found

**Symptom**: `XCUIElement` query returns no matches

**Cause**: Missing accessibility identifier or timing issue

**Solution**:
```swift
// ❌ Element not ready
app.buttons["Login"].tap()  // Fails immediately

// ✅ Wait for element
let loginButton = app.buttons["Login"]
XCTAssertTrue(loginButton.waitForExistence(timeout: 5))
loginButton.tap()

// Ensure accessibility ID is set
// In app code:
Button("Login")
    .accessibilityIdentifier("loginButton")

// In test:
app.buttons["loginButton"].tap()
```

### Flaky UI Tests

**Symptom**: Tests pass/fail intermittently

**Cause**: Animations, timing, or state issues

**Solution**:
```swift
// Disable animations
override func setUpWithError() throws {
    continueAfterFailure = false
    
    let app = XCUIApplication()
    app.launchArguments += ["-UITestingMode"]
    
    // Disable animations in app with launch argument
    // In app code:
    if CommandLine.arguments.contains("-UITestingMode") {
        UIView.setAnimationsEnabled(false)
    }
    
    app.launch()
}

// Wait for stability
func waitForStability() {
    // Wait for network requests
    XCTAssertTrue(app.staticTexts["Content"].waitForExistence(timeout: 10))
    
    // Small delay for rendering
    Thread.sleep(forTimeInterval: 0.5)
}
```

### App State Issues

**Symptom**: Tests fail due to previous test state

**Cause**: App not reset between tests

**Solution**:
```swift
override func setUpWithError() throws {
    let app = XCUIApplication()
    app.launchArguments += ["-ResetUserDefaults"]
    app.launch()
    
    // In app code:
    if CommandLine.arguments.contains("-ResetUserDefaults") {
        UserDefaults.standard.removePersistentDomain(
            forName: Bundle.main.bundleIdentifier!
        )
    }
}
```

## CI/CD Issues

### Tests Pass Locally, Fail in CI

**Symptom**: Green locally, red in CI

**Cause**: Timing, environment differences, or state issues

**Solution**:
```swift
// Check if running in CI
let isCI = ProcessInfo.processInfo.environment["CI"] == "true"

// Adjust timeouts
let timeout: TimeInterval = isCI ? 30 : 10

// More verbose logging in CI
if isCI {
    print("Running test in CI environment")
    print("Environment: \(ProcessInfo.processInfo.environment)")
}
```

### Xcode Version Mismatch

**Symptom**: Build fails with "Unknown attribute" or similar

**Cause**: CI using different Xcode version

**Solution**:
```yaml
# GitHub Actions - specify exact version
- name: Select Xcode
  run: sudo xcode-select -switch /Applications/Xcode_16.0.app

# Verify
- name: Check Xcode version
  run: xcodebuild -version
```

### Simulator Boot Timeout

**Symptom**: CI fails with simulator timeout

**Cause**: Simulator taking too long to boot

**Solution**:
```yaml
# Pre-boot simulator
- name: Boot simulator
  run: |
    xcrun simctl boot "iPhone 15" || true
    sleep 30  # Give it time

# Or increase timeout in test command
xcodebuild test ... -maximum-parallel-testing-workers 1
```

### Code Signing Issues

**Symptom**: "Code signing error" in CI

**Cause**: Unnecessary code signing for tests

**Solution**:
```bash
# Disable code signing for simulator tests
xcodebuild test \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO
```

## Coverage Issues

### Coverage Not Generated

**Symptom**: No coverage data in results

**Cause**: Coverage not enabled

**Solution**:
```bash
xcodebuild test \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  -enableCodeCoverage YES \
  -resultBundlePath TestResults.xcresult
```

### Coverage Lower Than Expected

**Symptom**: Coverage report shows lower % than expected

**Cause**: Test target doesn't cover all code

**Solution**:
1. Check test target membership
2. Verify tests are actually running
3. Check for skipped tests
4. Review coverage report details:

```bash
xcrun xccov view --report TestResults.xcresult
```

## Performance Issues

### Slow Test Execution

**Symptom**: Tests take too long to run

**Cause**: Serial execution or slow operations

**Solution**:
```swift
// Swift Testing - parallel by default
// No action needed

// XCTest - enable parallel testing
xcodebuild test \
  -parallel-testing-enabled YES \
  -maximum-parallel-testing-workers 4

// Profile slow tests
xcodebuild test \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  | grep "Test Case.*passed"  # Shows timing
```

### Memory Issues in Tests

**Symptom**: Tests crash with memory warnings

**Cause**: Memory leaks or excessive allocations

**Solution**:
```swift
// Use autoreleasepool for bulk operations
@Test func bulkOperation() {
    for i in 0..<10000 {
        autoreleasepool {
            let object = createExpensiveObject(i)
            process(object)
        }
    }
}

// Enable memory diagnostics
// Edit scheme → Test → Diagnostics → Memory Management
```

## Migration Issues

### Mixed Framework Errors

**Symptom**: Build errors when mixing XCTest and Swift Testing

**Cause**: Conflicting imports or usage

**Solution**:
```swift
// ❌ Don't mix in same file
import XCTest
import Testing

class Tests: XCTestCase {
    @Test func swiftTest() { }  // Error!
}

// ✅ Separate files
// File 1: XCTests.swift
import XCTest
class OldTests: XCTestCase { }

// File 2: SwiftTests.swift
import Testing
@Test func newTest() { }
```

### Assertion Migration Errors

**Symptom**: Compiler errors after migrating assertions

**Cause**: Incorrect conversion

**Solution**:
```swift
// XCTest → Swift Testing conversions

// ❌ Wrong
#expect(XCTAssertEqual(a, b))  // Don't nest!

// ✅ Correct
#expect(a == b)

// ❌ Wrong
#expect(XCTAssertNil(x))  // Don't nest!

// ✅ Correct
#expect(x == nil)
```

## Getting Help

### Search Strategy

1. **Check this guide** for common issues
2. **Search Swift Forums** for Swift Testing questions
3. **Check Stack Overflow** for XCTest/XCUITest
4. **Review WWDC sessions** for official guidance
5. **Ask on Discord/Slack** in iOS dev communities

### Debugging Workflow

1. **Isolate**: Run failing test alone
2. **Log**: Add print statements
3. **Breakpoint**: Use debugger
4. **Simplify**: Remove code until it works
5. **Compare**: Check what's different when it works

### Creating Minimal Reproduction

```swift
import Testing

@Test func minimalReproduction() {
    // Simplest possible code that shows the issue
    #expect(2 + 2 == 4)  // This should pass
    
    // Add one thing at a time until issue reproduces
}
```

## Prevention

### Best Practices

1. **Isolate state**: Don't share mutable state between tests
2. **Use factories**: Create fresh objects per test
3. **Mock dependencies**: Inject controllable dependencies
4. **Wait explicitly**: Don't rely on timing
5. **Clean up**: Reset state in deinit/tearDown
6. **Test one thing**: Keep tests focused
7. **Name clearly**: Descriptive test names help debugging

### Code Review Checklist

- [ ] Tests are isolated (no shared state)
- [ ] Async operations properly awaited
- [ ] Timeouts set appropriately
- [ ] No hardcoded delays (use expectations)
- [ ] Accessibility IDs set for UI tests
- [ ] Tests run reliably 10 times in a row
- [ ] Tests pass in CI
- [ ] Coverage targets met

## Resources

- Swift Testing docs: https://developer.apple.com/documentation/testing
- Swift Forums: https://forums.swift.org/c/related-projects/swift-testing
- XCTest docs: https://developer.apple.com/documentation/xctest
- WWDC sessions: Search "testing" on developer.apple.com

---

**Last Updated**: 2025-10-28  
**Contribute**: Found a solution not listed? Add it to this guide!
