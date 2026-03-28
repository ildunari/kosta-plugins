---
name: ios-freshness-checker
description: >
  Keep dependencies and APIs current. Use when checking for outdated SPM packages,
  deprecated APIs, or planning iOS version migration. Scans for deprecation warnings
  and recommends updates.
---

# iOS Freshness Checker

Guide the user through auditing their project for outdated dependencies, deprecated APIs, and opportunities to adopt new iOS features. The goal is keeping the app modern, secure, and maintainable.

## Workflow

### 1. Dependency Audit

Check all Swift Package Manager dependencies for updates:

```bash
# List current resolved versions
cat YourProject.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
pins = data.get('pins', data.get('object', {}).get('pins', []))
for pin in sorted(pins, key=lambda p: p.get('identity', p.get('package', ''))):
    name = pin.get('identity', pin.get('package', 'unknown'))
    version = pin.get('state', {}).get('version', pin.get('state', {}).get('revision', 'unknown')[:8])
    print(f'  {name}: {version}')
"
```

**For each dependency, check:**
- [ ] Is a newer version available? (Check GitHub releases or Swift Package Index)
- [ ] Are there security advisories? (Check GitHub Security tab)
- [ ] Is the dependency still maintained? (Last commit > 12 months ago = concern)
- [ ] Does it include a privacy manifest? (Required since 2024 for third-party SDKs)

**Updating SPM packages in Xcode:**
- File → Packages → Update to Latest Package Versions
- Or right-click a specific package → Update Package

**Manual version bump:**
Edit your `Package.swift` or Xcode project's package dependency version rules.

### 2. Deprecation Scan

Find deprecated API usage in your codebase:

```bash
# Build with all warnings visible
xcodebuild build \
  -scheme "YourApp" \
  -destination "platform=iOS Simulator,name=iPhone 16 Pro" \
  2>&1 | grep -i "deprecated"

# More targeted: find specific deprecation patterns in source
grep -rn "@available.*deprecated\|\.deprecated\|API_DEPRECATED\|is deprecated" \
  --include="*.swift" .
```

**Common deprecation patterns to check:**

```swift
// Search for these in your codebase
UIApplication.shared.keyWindow           // Deprecated iOS 13 — use scene-based window
UIApplication.shared.statusBarStyle      // Deprecated iOS 9 — use UIViewController
UIColor.groupTableViewBackground         // Deprecated iOS 13 — use .systemGroupedBackground
UITableViewCell.textLabel                // Deprecated iOS 14 — use content configurations
UIAlertView / UIActionSheet              // Deprecated iOS 9 — use UIAlertController
URLSession.shared.dataTask(with:completionHandler:)  // Not deprecated, but async/await is preferred
```

See `references/common-deprecation-migrations.md` for 30 common migrations with before/after code.

### 3. SDK Freshness

Check your project's deployment target and SDK version:

```bash
# Current deployment target
xcodebuild -showBuildSettings -scheme "YourApp" 2>/dev/null | grep IPHONEOS_DEPLOYMENT_TARGET

# SDK version
xcodebuild -showBuildSettings -scheme "YourApp" 2>/dev/null | grep SDK_VERSION
```

**Deployment target recommendations (as of 2026):**

| Target | Drops Support For | Gains Access To |
|--------|------------------|----------------|
| iOS 16 | iPhone 7, iPod Touch | Charts, NavigationStack, PhotosPicker |
| iOS 17 | iPhone 8, iPhone X | Observable, SwiftData, TipKit, StoreKit 2 |
| iOS 18 | iPhone XR, iPhone XS | ControlWidget, custom Lock Screen controls |

**Rule of thumb:** Support the last 2-3 major iOS versions. Check Apple's usage stats (Settings → Privacy → Analytics on your published app, or App Store Connect analytics).

### 4. API Verification

For each external API your app calls, verify:

- [ ] API endpoint URLs are still valid
- [ ] Authentication method hasn't changed
- [ ] Response format hasn't changed
- [ ] Rate limits haven't changed
- [ ] API version is still supported (not sunset)
- [ ] Any new required headers or parameters

**Automated check script:**

```swift
// Add to your test target
func testAPIEndpointsReachable() async throws {
    let endpoints = [
        "https://api.yourservice.com/v2/health",
        "https://api.yourservice.com/v2/config"
    ]

    for endpoint in endpoints {
        let url = URL(string: endpoint)!
        let (_, response) = try await URLSession.shared.data(from: url)
        let httpResponse = response as! HTTPURLResponse
        XCTAssertEqual(httpResponse.statusCode, 200, "Endpoint unreachable: \(endpoint)")
    }
}
```

### 5. New iOS Features Check

See `references/ios-version-feature-matrix.md` for a complete table of features by iOS version.

**Questions to ask for each new iOS version:**
1. Are there new APIs that would improve existing features?
2. Are there new frameworks that could replace custom implementations?
3. Are there new privacy requirements to comply with?
4. Do new devices have capabilities worth supporting (Dynamic Island, Always-On Display)?

### 6. Migration Guide

When raising the deployment target:

**Step 1: Audit availability checks**
```bash
# Find all #available and @available checks
grep -rn "#available\|@available" --include="*.swift" . | grep -v "Pods\|.build"
```

**Step 2: Remove unnecessary availability checks**
If your new deployment target is iOS 17, any `if #available(iOS 17, *)` check can be simplified — the else branch is dead code.

```swift
// BEFORE (when supporting iOS 16+)
if #available(iOS 17, *) {
    ContentView()
        .onChange(of: value) { oldValue, newValue in
            // iOS 17+ two-parameter closure
        }
} else {
    ContentView()
        .onChange(of: value) { newValue in
            // iOS 16 single-parameter closure
        }
}

// AFTER (when minimum is iOS 17)
ContentView()
    .onChange(of: value) { oldValue, newValue in
        // Just use the iOS 17+ API directly
    }
```

**Step 3: Adopt modern replacements**
Replace deprecated patterns with their modern equivalents. See the deprecation migrations reference.

**Step 4: Test on the new minimum**
- Delete the app and reinstall on a device/simulator running your new minimum iOS version
- Run your full test suite
- Test all user flows manually

### 7. Automated Freshness Check Script

Save as `check_freshness.sh` and run periodically:

```bash
#!/bin/bash
# iOS Project Freshness Checker
# Run from your project root

echo "=== iOS Project Freshness Report ==="
echo ""

# 1. Check Xcode version
echo "## Xcode Version"
xcodebuild -version
echo ""

# 2. Check deployment target
echo "## Deployment Target"
SCHEME="${1:-YourApp}"
TARGET=$(xcodebuild -showBuildSettings -scheme "$SCHEME" 2>/dev/null | grep IPHONEOS_DEPLOYMENT_TARGET | awk '{print $3}')
echo "  Minimum iOS: $TARGET"
echo ""

# 3. Count deprecation warnings
echo "## Deprecation Warnings"
WARNINGS=$(xcodebuild build -scheme "$SCHEME" \
  -destination "platform=iOS Simulator,name=iPhone 16 Pro" \
  2>&1 | grep -c "deprecated")
echo "  Found: $WARNINGS deprecation warnings"
echo ""

# 4. Check SPM dependencies
echo "## SPM Dependencies"
RESOLVED=$(find . -name "Package.resolved" -not -path "*/DerivedData/*" | head -1)
if [ -n "$RESOLVED" ]; then
    python3 -c "
import json
with open('$RESOLVED') as f:
    data = json.load(f)
pins = data.get('pins', data.get('object', {}).get('pins', []))
print(f'  Total packages: {len(pins)}')
for pin in sorted(pins, key=lambda p: p.get('identity', p.get('package', ''))):
    name = pin.get('identity', pin.get('package', 'unknown'))
    version = pin.get('state', {}).get('version', pin.get('state', {}).get('revision', 'unknown')[:8])
    print(f'    {name}: {version}')
"
else
    echo "  No Package.resolved found"
fi
echo ""

# 5. Check for availability annotations
echo "## Availability Checks"
CHECKS=$(grep -rc "#available\|@available" --include="*.swift" . 2>/dev/null | \
  awk -F: '{sum+=$2} END {print sum}')
echo "  #available / @available usages: ${CHECKS:-0}"
echo ""

# 6. Check for privacy manifest
echo "## Privacy Manifest"
if find . -name "PrivacyInfo.xcprivacy" -not -path "*/DerivedData/*" | head -1 | grep -q .; then
    echo "  PrivacyInfo.xcprivacy: Found"
else
    echo "  PrivacyInfo.xcprivacy: MISSING (required since 2024)"
fi
echo ""

echo "=== End Report ==="
```

## When to Run This

- **Monthly:** Quick dependency check and deprecation scan
- **Before each release:** Full audit including API verification
- **After WWDC:** New iOS features check and migration planning
- **After Xcode updates:** Rebuild and check for new warnings
