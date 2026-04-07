---
name: apple-testing-architect
user-invocable: false
description: Comprehensive iOS/macOS testing skill covering Swift Testing (Xcode 16+), XCTest, XCUITest, snapshot testing, and CI/CD. Includes test generation, mock creation, coverage analysis, and flake detection. Use when working with Apple platform testing, migrating to Swift Testing, setting up CI/CD pipelines, or debugging test issues.
version: 1.0.0
last_verified: "2025-10-28"
xcode_versions: "15+ (XCTest), 16+ (Swift Testing)"
swift_testing_status: "early_adoption"
update_frequency: "quarterly"
owner: team/mobile-infra
capabilities:
  - test_template_generation
  - swift_protocol_mock_generation
  - coverage_parsing_reporting
  - flaky_test_detection
  - framework_migration_guidance
requires:
  - Xcode 15+ (XCTest); Xcode 16+ (Swift Testing)
  - Python 3.10+
  - Xcode CLT tools in PATH (xcodebuild, xcresulttool, xccov, llvm-cov)
tags:
  - testing
  - swift
  - ios
  - ci
  - swift-testing
  - xctest
  - xcuitest
---

# Apple Testing Architect

Comprehensive testing skill for Apple platforms covering Swift Testing, XCTest, XCUITest, snapshot testing, and CI/CD integration. This skill provides generators, analyzers, migration guides, and best practices for building robust test suites.

## What this Skill does

- **Generate test templates** for Swift Testing (Xcode 16+) or XCTest (Xcode 15+)
- **Generate mocks from Swift protocols** (fast, regex-based—no SourceKit required)
- **Parse coverage** from `.xcresult` bundles using `xccov`/`llvm-cov`
- **Detect flaky tests** by re-running suspicious suites
- **Provide migration guidance** from XCTest to Swift Testing
- **Snapshot testing helpers** for visual regression testing
- **UI test utilities** with Page Objects & fluent actions
- **CI/CD integration patterns** for GitHub Actions and Xcode Cloud

> ⚠️ Note: This skill intentionally avoids complex AST tooling for portability. For industrial-grade mock generation, consider Mockolo/Cuckoo/SwiftyMocky.

## Testing Framework Version Awareness

Testing frameworks evolve with Xcode releases. **Always verify current state when in doubt.**

### Swift Testing (NEW - Xcode 16+)

**⚠️ Swift Testing was introduced in 2024 and is actively evolving.**

**Current status** (as of 2025-10-28):
- **Introduced**: Xcode 16 (WWDC 2024), Swift 6.0
- **Maturity**: Early adoption phase, actively evolving
- **Recent updates**:
  - Swift 6.1 (Xcode 16.3): Ranged confirmations, custom test scoping
  - Swift 6.2 (Xcode 26 beta): Exit testing, test attachments, process isolation
- **Breaking changes**: Possible in Xcode 16.x and 26.x updates
- **Migration**: Gradual, XCTest still fully supported and co-exists in same target

**Before using Swift Testing, verify:**
1. **Syntax verification**: `web_search("Swift Testing Xcode [version] syntax changes")`
2. **Current features**: `web_search("Swift Testing Swift 6.[1|2] new features")`
3. **Known issues**: Check Swift forums for testing topics
4. **Migration guidance**: `web_search("XCTest to Swift Testing migration [year]")`

**When to use Swift Testing**:
- ✅ New projects targeting Xcode 16+
- ✅ Modern async/await-heavy codebases
- ✅ Projects wanting parallel test execution by default
- ⚠️ Existing projects: Consider migration cost and team familiarity
- ⚠️ CI/CD: Verify Xcode version support on build machines
- ❌ UI testing: Not yet supported, use XCUITest
- ❌ Performance testing: Not yet supported, use XCTest

**Key advantages**:
- Parallel execution by default (faster test runs)
- Clean macro-based syntax (@Test, @Suite)
- Better async/await integration
- Parameterized tests built-in
- Tags for flexible test organization
- Modern Swift language features

### XCTest Updates

**Before generating XCTest tests:**
1. **Async support**: XCTest supports async/await since Xcode 13
2. **Current patterns**: `web_search("XCTest iOS [version] async patterns")`
3. **Performance testing**: XCTest remains the only option for XCTMetric-based performance tests

**When to use XCTest**:
- ✅ UI testing (XCUITest)
- ✅ Performance measurement (XCTMetric)
- ✅ Legacy codebases
- ✅ Teams not ready for Swift Testing migration
- ✅ When targeting Xcode < 16

### XCUITest Evolution

**Before writing UI tests:**
1. **API updates**: `web_search("XCUITest iOS [version] improvements")`
2. **Accessibility**: `web_search("XCUITest accessibility testing [year]")`
3. **Xcode recorder**: Xcode 26+ includes AI-assisted test generation

**Current status**:
- Still requires XCTest (no Swift Testing support yet)
- Continues to evolve with iOS releases
- Focus on accessibility-first testing

### Third-Party Testing Libraries

**Before using testing libraries, verify compatibility:**

**swift-snapshot-testing** (Point-Free):
- ✅ Swift 6 compatible
- ✅ Swift Testing support (v1.17.0+)
- ✅ Actively maintained
- Use: Visual regression testing for SwiftUI/UIKit

**Quick/Nimble**:
- ⚠️ Check Swift 6 compatibility status
- ⚠️ No Swift Testing support yet
- Consider: Alternatives for new projects

**Mockolo/Cuckoo**:
- Search: `web_search("[library] Swift 6 support")`
- Industrial-grade mock generation
- May require Swift 6 migration

### CI/CD Testing (2025)

**GitHub Actions**:
- macOS 15 runners available (as of Aug 2025)
- Xcode 16+ supported
- 3 simulator runtime limit per runner (Aug 2025)
- macOS 13 deprecated (Nov 2025)

**Xcode Cloud**:
- Integrated with GitHub/GitLab
- 25 free hours/month
- Full Xcode 16+ support
- Parallel testing built-in

### When to Search for Updates

Search for current information when:
- User mentions Xcode version > 16
- Queries about "latest testing framework" or "best way to test in 2025"
- Swift Testing syntax questions
- Framework comparison questions
- CI/CD setup questions
- Third-party library compatibility questions

**Last verified**: 2025-10-28
**Next review**: 2026-01-28 (quarterly)

## Quick Start

1. **For new projects (Xcode 16+)**:
```bash
# Generate Swift Testing tests
python3 scripts/generate_tests.py \
  --style swift-testing \
  --module MyApp \
  --input Sources/MyApp/ViewModel.swift \
  --out Tests/MyAppTests/ViewModelTests.swift
```

2. **For existing projects (Xcode 15+)**:
```bash
# Generate XCTest tests
python3 scripts/generate_tests.py \
  --style xctest \
  --module MyApp \
  --input Sources/MyApp/ViewModel.swift \
  --out Tests/MyAppTests/ViewModelTests.swift
```

3. **Generate mocks**:
```bash
python3 scripts/mock_from_protocol.py \
  --input MyProtocol.swift \
  --out Tests/Mocks/MockMyProtocol.swift
```

4. **Analyze coverage**:
```bash
python3 scripts/coverage_analyzer.py \
  --xcresult .build/result.xcresult \
  --config coverage_config.json
```

## Opinionated Defaults

### Framework Selection
- **Unit/Integration tests**: Prefer Swift Testing (Xcode 16+), fallback to XCTest
- **UI tests**: Use XCUITest (only option)
- **Performance tests**: Use XCTest (only option)
- **Snapshot tests**: Use swift-snapshot-testing with Swift Testing

### Test Organization
- Use **accessibility identifiers** everywhere for UI testing
- Adopt **Page Objects** for UI test maintainability
- Keep tests hermetic: inject Date/Clock/RNG/Network dependencies
- Separate fast vs slow suites using tags (Swift Testing) or test plans (XCTest)

### Naming Conventions
- **Swift Testing**: Use descriptive @Test names: `@Test("validates email format")`
- **XCTest**: Use `test_methodName_condition_expectedResult` pattern

### Migration Strategy
- **Migrate opportunistically**: Start with new tests in Swift Testing
- **Co-exist peacefully**: Both frameworks work in same test target
- **Keep XCTest for**: UI tests, performance tests, legacy code

## Detailed Guides

For comprehensive information, see:
- `references/SWIFT_TESTING.md` - Deep dive into Swift Testing
- `references/XCTEST_PATTERNS.md` - Modern XCTest patterns
- `references/XCUITEST_GUIDE.md` - UI testing best practices
- `references/MIGRATION.md` - XCTest to Swift Testing migration
- `references/CI_CD.md` - CI/CD integration patterns
- `references/TROUBLESHOOTING.md` - Common issues and solutions

## Scripts

All scripts are in `/scripts`:
- `generate_tests.py` - Test template generator (Swift Testing or XCTest)
- `mock_from_protocol.py` - Simple protocol mock generator
- `coverage_analyzer.py` - Parse and enforce coverage thresholds
- `flake_detector.py` - Identify and re-run flaky tests

## Examples

Practical examples in `/examples`:
- `SwiftTestingUnitTests/` - Swift Testing patterns
- `XCTestAsyncTests/` - XCTest with async/await
- `UITests/` - XCUITest with Page Objects
- `SwiftUISnapshotTests/` - Snapshot testing
- `NetworkDateRandomnessTests/` - Dependency injection patterns

## Swift Utilities

Helper code in `/swift`:
- `SnapshotUtils/` - Snapshot testing extensions
- `UITestDSL/` - Fluent UI test helpers

## Framework Comparison Matrix

| Feature | XCTest | Swift Testing | Notes |
|---------|--------|---------------|-------|
| **Maturity** | ✅ Stable | 🟡 Evolving | XCTest battle-tested since iOS 7 |
| **Xcode Version** | 7+ | 16+ | |
| **Async/Await** | ✅ | ✅ Better | Swift Testing has superior async integration |
| **Parallel Execution** | ⚠️ Via plans | ✅ Default | Swift Testing parallelizes automatically |
| **Macros** | ❌ | ✅ | @Test, @Suite, traits |
| **Parameterization** | ❌ Manual | ✅ Built-in | `@Test(arguments: [...])` |
| **Setup/Teardown** | setUp/tearDown | init/deinit | Swift Testing uses standard Swift patterns |
| **Tags/Organization** | Test Plans | ✅ Tags | `.tags(.critical)` |
| **UI Testing** | ✅ XCUITest | ❌ | Not yet supported |
| **Performance Testing** | ✅ XCTMetric | ❌ | Not yet supported |
| **Expectations** | XCTestExpectation | confirmation | Different API |
| **CI Integration** | ✅ Mature | ✅ Growing | Both work well |
| **Learning Curve** | Low | Medium | Swift Testing requires Xcode 16+ knowledge |
| **Migration Cost** | N/A | Medium | Incremental migration possible |

**⚠️ Always verify this matrix with current documentation when Xcode version > 16**

## When to Use This Skill

Use this skill when:
- Setting up testing infrastructure for iOS/macOS projects
- Deciding between Swift Testing and XCTest
- Migrating existing XCTest suites to Swift Testing
- Debugging flaky or slow tests
- Setting up CI/CD pipelines for Apple platforms
- Implementing snapshot testing
- Writing UI tests with XCUITest
- Generating mocks from protocols
- Analyzing test coverage
- Troubleshooting test failures in CI

## Important Reminders

1. **Swift Testing is new**: Syntax and APIs may change. Always verify current documentation.
2. **Version requirements matter**: Document Xcode/Swift version for all examples.
3. **Co-existence works**: Swift Testing and XCTest can live together.
4. **UI testing**: Still requires XCUITest (Swift Testing doesn't support it yet).
5. **Performance testing**: Still requires XCTest (Swift Testing doesn't support it yet).
6. **Search when uncertain**: Use web_search to verify current state of frameworks.

## Contributing

When updating this skill:
1. Verify all code examples compile with latest Xcode
2. Update version number and last_verified date
3. Check Swift Testing evolution proposals
4. Test scripts with current Xcode CLT
5. Update framework comparison matrix
