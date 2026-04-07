# Apple Testing Architect v1.0.0

Comprehensive testing skill for Apple platforms covering Swift Testing, XCTest, XCUITest, snapshot testing, and CI/CD integration.

## What's Included

### Core Documentation
- **SKILL.md** - Main skill file with framework version awareness
- **SUMMARY.md** - Complete update summary and research findings

### Reference Guides
- **references/SWIFT_TESTING.md** - Complete Swift Testing reference
- **references/MIGRATION.md** - XCTest to Swift Testing migration guide
- **references/CI_CD.md** - Modern CI/CD patterns for 2025
- **references/TROUBLESHOOTING.md** - Common issues and solutions

### Scripts
- **scripts/generate_tests.py** - Generate Swift Testing or XCTest tests
- **scripts/mock_from_protocol.py** - Simple protocol mock generator
- **scripts/coverage_analyzer.py** - Parse and enforce coverage
- **scripts/flake_detector.py** - Identify flaky tests

### Examples
- **examples/SwiftTestingExamples/** - Comprehensive Swift Testing patterns
- **examples/XCTestModernExamples/** - Modern XCTest with async/await
- **examples/MigrationExamples/** - Before/after migration examples
- **examples/CICDExamples/** - CI/CD workflow examples

### Configuration
- **coverage_config.json** - Coverage thresholds configuration

## Quick Start

### 1. Choose Your Framework

**For new projects (Xcode 16+)**:
```bash
python3 scripts/generate_tests.py \
  --style swift-testing \
  --module MyApp \
  --input Sources/MyApp/ViewModel.swift \
  --out Tests/MyAppTests/ViewModelTests.swift
```

**For existing projects (Xcode 15+)**:
```bash
python3 scripts/generate_tests.py \
  --style xctest \
  --module MyApp \
  --input Sources/MyApp/ViewModel.swift \
  --out Tests/MyAppTests/ViewModelTests.swift
```

### 2. Read the Documentation

Start with `SKILL.md`, then dive into specific reference guides as needed.

### 3. Explore Examples

Check `examples/SwiftTestingExamples/ComprehensiveExamples.swift` for modern patterns.

## What's New in v1.0.0

### Major Updates

1. **Swift Testing Support** (Xcode 16+)
   - Complete API reference
   - Best practices and patterns
   - Known limitations documented

2. **Framework Version Awareness**
   - Current state tracking
   - Evolution monitoring
   - Verification guidance

3. **Migration Guide**
   - Incremental migration strategy
   - Assertion conversion tables
   - Real-world examples
   - Timeline estimates

4. **Modern CI/CD Patterns**
   - GitHub Actions (2025 updates)
   - Xcode Cloud integration
   - Parallel testing strategies
   - Cost optimization

5. **Updated Scripts**
   - Support for both Swift Testing and XCTest
   - Auto-detection of async/throws
   - Better code generation

6. **Comprehensive Examples**
   - Swift Testing patterns
   - Modern XCTest patterns
   - Migration examples
   - CI/CD workflows

## Framework Decision Matrix

| Use Case | Framework | Xcode Version |
|----------|-----------|---------------|
| New unit tests | Swift Testing | 16+ |
| New integration tests | Swift Testing | 16+ |
| UI automation | XCUITest | 15+ |
| Performance testing | XCTest | 15+ |
| Legacy projects | XCTest | 15+ |
| Snapshot testing | swift-snapshot-testing + Swift Testing | 16+ |

## Framework Status (2025-10-28)

### Swift Testing
- **Status**: Early adoption, actively evolving
- **Stability**: API stabilizing, minor changes possible
- **Support**: Unit tests, integration tests
- **Missing**: UI testing, performance testing

### XCTest
- **Status**: Mature, stable
- **Stability**: Fully stable
- **Support**: All test types
- **Best for**: UI tests, performance tests, legacy projects

### XCUITest
- **Status**: Mature, evolving with iOS
- **Stability**: Stable
- **Support**: UI automation only
- **Note**: Still requires XCTest

## When to Use This Skill

Use this skill when:
- Setting up testing infrastructure
- Deciding between Swift Testing and XCTest
- Migrating to Swift Testing
- Debugging test issues
- Setting up CI/CD pipelines
- Implementing snapshot testing
- Writing UI tests
- Generating mocks
- Analyzing coverage

## Requirements

- **Xcode**: 15+ (16+ for Swift Testing)
- **Python**: 3.10+ (for scripts)
- **Xcode CLT**: Command line tools in PATH
- **macOS**: For CI/CD - macOS 15 recommended

## Resources

### Official Documentation
- Swift Testing: https://developer.apple.com/documentation/testing
- XCTest: https://developer.apple.com/documentation/xctest
- XCUITest: https://developer.apple.com/documentation/xctest/user_interface_tests

### WWDC Sessions
- Meet Swift Testing (2024): Session 10179
- Go further with Swift Testing (2024): Session 10195

### Community
- Swift Forums: https://forums.swift.org/c/related-projects/swift-testing
- Swift Evolution: https://github.com/apple/swift-evolution/tree/main/proposals/testing

## Contributing

To update this skill:
1. Verify all code examples compile
2. Update version number and last_verified date
3. Check Swift Testing evolution proposals
4. Test scripts with current Xcode CLT
5. Update framework comparison matrix

## Version History

- **v1.0.0** (2025-10-28): Swift Testing integration, migration guide, modern CI/CD
- **v0.1.0**: Initial version (XCTest only)

## Support

### Getting Help
1. Read SKILL.md for overview
2. Check TROUBLESHOOTING.md for common issues
3. Review examples for patterns
4. Search Swift Forums for Swift Testing questions
5. Use web_search for latest information

### Reporting Issues
When skill needs updates:
1. Note framework/version
2. Describe what's outdated
3. Provide source for current info
4. Suggest specific changes

## License

See LICENSE.txt for complete terms.

## Acknowledgments

Research sources:
- Apple Developer Documentation
- Swift Evolution Community
- Point-Free (swift-snapshot-testing)
- iOS Developer Community
- WWDC 2024 Sessions

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-28  
**Next Review**: 2026-01-28 (quarterly)  
**Maintained by**: team/mobile-infra
