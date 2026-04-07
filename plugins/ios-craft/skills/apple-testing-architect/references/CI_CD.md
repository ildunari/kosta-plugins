# CI/CD Testing Patterns

**Target**: Setting up automated testing in CI/CD pipelines  
**Platforms**: GitHub Actions, Xcode Cloud  
**Last Updated**: 2025-10-28

## Overview

Modern iOS/macOS testing in CI/CD requires consideration of:
- Xcode version management
- Test parallelization
- Coverage reporting
- Flake detection
- Cost optimization (compute time)

## GitHub Actions

### Basic Swift Testing Workflow (Xcode 16+)

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Run Tests
    runs-on: macos-15  # Updated Aug 2025, includes Xcode 16+
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Select Xcode
        run: sudo xcode-select -switch /Applications/Xcode_16.0.app
      
      - name: Run tests
        run: |
          xcodebuild test \
            -scheme MyApp \
            -destination 'platform=iOS Simulator,name=iPhone 15,OS=18.0' \
            -resultBundlePath TestResults.xcresult \
            | xcbeautify
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: TestResults.xcresult
```

### Matrix Testing (Multiple Xcode Versions)

```yaml
name: Matrix Tests

on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        xcode: ['16.0', '16.1']
        ios: ['18.0', '18.1']
        include:
          - xcode: '16.0'
            macos: macos-15
          - xcode: '16.1'
            macos: macos-15
    
    runs-on: ${{ matrix.macos }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Select Xcode ${{ matrix.xcode }}
        run: sudo xcode-select -switch /Applications/Xcode_${{ matrix.xcode }}.app
      
      - name: Run tests on iOS ${{ matrix.ios }}
        run: |
          xcodebuild test \
            -scheme MyApp \
            -destination 'platform=iOS Simulator,name=iPhone 15,OS=${{ matrix.ios }}'
```

### Coverage Reporting

```yaml
- name: Generate coverage
  run: |
    xcodebuild test \
      -scheme MyApp \
      -destination 'platform=iOS Simulator,name=iPhone 15' \
      -enableCodeCoverage YES \
      -resultBundlePath TestResults.xcresult

- name: Parse coverage
  run: |
    xcrun xccov view --report --json TestResults.xcresult > coverage.json
    python3 scripts/coverage_analyzer.py \
      --xcresult TestResults.xcresult \
      --config coverage_config.json \
      --fail-under 80

- name: Upload to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage.json
```

### Swift Package Testing

```yaml
name: Swift Package Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-15
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Swift tests
        run: swift test --parallel
      
      - name: Run Swift tests with coverage
        run: |
          swift test --enable-code-coverage
          xcrun llvm-cov export \
            .build/debug/MyPackagePackageTests.xctest/Contents/MacOS/MyPackagePackageTests \
            -instr-profile .build/debug/codecov/default.profdata \
            -format="lcov" > coverage.lcov
```

### Parallel Testing

```yaml
- name: Run tests in parallel
  run: |
    xcodebuild test \
      -scheme MyApp \
      -destination 'platform=iOS Simulator,name=iPhone 15' \
      -parallel-testing-enabled YES \
      -maximum-parallel-testing-workers 4
```

### UI Testing in CI

```yaml
- name: Run UI tests
  run: |
    # Disable animations for reliable UI tests
    defaults write com.apple.dt.XCTest AnimationsDisabledForTests -bool YES
    
    xcodebuild test \
      -scheme MyAppUITests \
      -destination 'platform=iOS Simulator,name=iPhone 15' \
      -only-testing:MyAppUITests
```

### Cache Dependencies

```yaml
- name: Cache Swift Package Manager
  uses: actions/cache@v3
  with:
    path: |
      .build
      ~/Library/Developer/Xcode/DerivedData/**/SourcePackages
    key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
    restore-keys: |
      ${{ runner.os }}-spm-

- name: Cache CocoaPods
  uses: actions/cache@v3
  with:
    path: Pods
    key: ${{ runner.os }}-pods-${{ hashFiles('**/Podfile.lock') }}
    restore-keys: |
      ${{ runner.os }}-pods-
```

### Complete Production Workflow

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  XCODE_VERSION: '16.0'
  IOS_VERSION: '18.0'

jobs:
  lint:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      
      - name: SwiftLint
        run: |
          brew install swiftlint
          swiftlint lint --strict

  unit-tests:
    runs-on: macos-15
    needs: lint
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Cache SPM
        uses: actions/cache@v3
        with:
          path: .build
          key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
      
      - name: Select Xcode
        run: sudo xcode-select -switch /Applications/Xcode_${{ env.XCODE_VERSION }}.app
      
      - name: Run unit tests
        run: |
          xcodebuild test \
            -scheme MyApp \
            -destination 'platform=iOS Simulator,name=iPhone 15,OS=${{ env.IOS_VERSION }}' \
            -only-testing:MyAppTests \
            -enableCodeCoverage YES \
            -resultBundlePath TestResults.xcresult \
            | xcbeautify
      
      - name: Check coverage
        run: |
          python3 scripts/coverage_analyzer.py \
            --xcresult TestResults.xcresult \
            --config coverage_config.json \
            --fail-under 80
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: unit-test-results
          path: TestResults.xcresult

  ui-tests:
    runs-on: macos-15
    needs: lint
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Select Xcode
        run: sudo xcode-select -switch /Applications/Xcode_${{ env.XCODE_VERSION }}.app
      
      - name: Run UI tests
        run: |
          defaults write com.apple.dt.XCTest AnimationsDisabledForTests -bool YES
          
          xcodebuild test \
            -scheme MyApp \
            -destination 'platform=iOS Simulator,name=iPhone 15,OS=${{ env.IOS_VERSION }}' \
            -only-testing:MyAppUITests \
            -resultBundlePath UITestResults.xcresult \
            | xcbeautify
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: ui-test-results
          path: UITestResults.xcresult
```

## Xcode Cloud

### Basic Configuration

Create `.xcode-cloud.yml` or configure in Xcode:

```yaml
version: 1.0

ci:
  # PR validation
  - name: PR Tests
    trigger:
      pull_request:
        branches: [main]
    steps:
      - name: Test
        scheme: MyApp
        destination:
          platform: iOS Simulator
          device: iPhone 15
        action: test
    post-actions:
      - name: Notify on failure
        script: scripts/notify_failure.sh

  # Main branch validation
  - name: Main Tests
    trigger:
      branch:
        name: main
    steps:
      - name: Test with Coverage
        scheme: MyApp
        destination:
          platform: iOS Simulator
          device: iPhone 15
        action: test
        options:
          code-coverage: true
      
      - name: Build Release
        scheme: MyApp
        action: archive
    post-actions:
      - name: Deploy to TestFlight
        condition: success
```

### Parallel Testing in Xcode Cloud

Xcode Cloud automatically parallelizes tests across multiple simulators.

### Tag-Based Test Selection

```swift
// In your tests
@Test("critical path", .tags(.critical))
func criticalTest() { }

// Run only critical tests in Xcode Cloud
// Configure in Xcode Cloud workflow: Test Plan > Only testing: Critical
```

### Environment Variables

Configure in Xcode Cloud settings:

```
TEST_ENV=ci
ENABLE_MOCKS=true
API_BASE_URL=https://staging.api.example.com
```

Access in tests:

```swift
let testEnv = ProcessInfo.processInfo.environment["TEST_ENV"]
```

## Best Practices

### 1. Test Timeout Configuration

```yaml
# GitHub Actions
- name: Run tests with timeout
  timeout-minutes: 30
  run: xcodebuild test ...

# Xcode Cloud - configure in Xcode
```

### 2. Flake Detection

```yaml
- name: Detect flaky tests
  if: always()
  run: |
    python3 scripts/flake_detector.py \
      --xcresult TestResults.xcresult \
      --threshold 0.95
```

### 3. Retry Failed Tests

```yaml
- name: Run tests (with retry)
  uses: nick-fields/retry@v2
  with:
    timeout_minutes: 20
    max_attempts: 2
    command: |
      xcodebuild test \
        -scheme MyApp \
        -destination 'platform=iOS Simulator,name=iPhone 15'
```

### 4. Test Result Parsing

```bash
# Install xcbeautify for better output
brew install xcbeautify

# Use in CI
xcodebuild test ... | xcbeautify --report github-actions
```

### 5. Cost Optimization

**GitHub Actions**:
- Use caching for dependencies
- Run only affected tests (if possible)
- Use matrix strategically
- Consider self-hosted runners for large projects

**Xcode Cloud**:
- 25 free hours/month
- Optimize test parallelization
- Use test plans to run only necessary tests
- Monitor usage in App Store Connect

## Troubleshooting

### Common Issues

**1. Xcode version mismatch**:
```yaml
# Always specify exact Xcode version
- name: Select Xcode 16.0
  run: sudo xcode-select -switch /Applications/Xcode_16.0.app

# Verify
- name: Verify Xcode
  run: xcodebuild -version
```

**2. Simulator boot timeout**:
```yaml
- name: Boot simulator
  run: |
    xcrun simctl boot "iPhone 15" || true
    sleep 30  # Give simulator time to boot
```

**3. Test failures only in CI**:
```swift
// Check if running in CI
let isCI = ProcessInfo.processInfo.environment["CI"] == "true"

// Adjust timing or behavior
let timeout: TimeInterval = isCI ? 10.0 : 5.0
```

**4. Code signing issues**:
```yaml
# For tests, code signing often not needed
- name: Run tests without code signing
  run: |
    xcodebuild test \
      -scheme MyApp \
      -destination 'platform=iOS Simulator,name=iPhone 15' \
      CODE_SIGN_IDENTITY="" \
      CODE_SIGNING_REQUIRED=NO
```

## Runner Versions (2025)

### GitHub Actions macOS Runners

As of 2025:
- `macos-15`: Xcode 16.0+ (recommended)
- `macos-14`: Xcode 15.x
- `macos-13`: Deprecated Nov 2025

**Important**: Simulator runtime limit of 3 per runner (Aug 2025+)

### Xcode Cloud

- Always uses latest stable Xcode
- Automatic updates
- No version management needed

## Security

### Secrets Management

```yaml
# GitHub Actions
- name: Run tests with API keys
  env:
    API_KEY: ${{ secrets.API_KEY }}
  run: xcodebuild test ...

# Access in tests
let apiKey = ProcessInfo.processInfo.environment["API_KEY"]
```

### Preventing Secret Leakage

```swift
// Don't print secrets in tests
#expect(apiKey != nil)  // ✅
print("API key: \(apiKey)")  // ❌ Don't do this!
```

## Monitoring

### Test Duration Tracking

```yaml
- name: Track test duration
  run: |
    START_TIME=$(date +%s)
    xcodebuild test ...
    END_TIME=$(date +%s)
    echo "Test duration: $((END_TIME - START_TIME))s"
```

### Failure Rate Monitoring

Use GitHub Actions or Xcode Cloud metrics to track:
- Test failure rate over time
- Flaky test detection
- Average test duration
- Coverage trends

## Resources

- GitHub Actions docs: https://docs.github.com/en/actions
- Xcode Cloud docs: https://developer.apple.com/xcode-cloud
- macOS runners: https://github.com/actions/runner-images
- xcbeautify: https://github.com/cpisciotta/xcbeautify

---

**Last Updated**: 2025-10-28  
**Next Review**: Check for runner updates quarterly
