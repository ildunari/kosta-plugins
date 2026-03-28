# GitHub Actions iOS Workflow

Complete `.github/workflows/ios.yml` with build, test, lint, and deploy stages. Every section is annotated.

```yaml
# =============================================================================
# iOS CI/CD Pipeline — GitHub Actions
# =============================================================================
# Triggers: push to main, pull requests to main
# Stages: lint → build → test → deploy (TestFlight, main branch only)
# =============================================================================

name: iOS CI/CD

# --- TRIGGERS ---
on:
  push:
    branches: [main]          # Run on pushes to main
  pull_request:
    branches: [main]          # Run on PRs targeting main
  workflow_dispatch:           # Allow manual trigger from GitHub UI

# --- PERMISSIONS ---
permissions:
  contents: read               # Read repo contents
  checks: write                # Write check results (for test reports)

# --- CONCURRENCY ---
# Cancel in-progress runs for the same branch (saves CI minutes)
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# =============================================================================
# STAGE 1: LINT
# =============================================================================
# Runs SwiftLint. Fails fast before expensive build/test.
# Cost: ~1 minute (cheap)

jobs:
  lint:
    name: SwiftLint
    runs-on: macos-15
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install SwiftLint
        run: brew install swiftlint

      - name: Run SwiftLint
        # github-actions-logging format shows warnings/errors inline in PR diffs
        run: swiftlint lint --reporter github-actions-logging

# =============================================================================
# STAGE 2: BUILD AND TEST
# =============================================================================
# Builds the app and runs unit + UI tests.
# Cost: ~5-15 minutes depending on project size

  build-and-test:
    name: Build & Test
    runs-on: macos-15
    timeout-minutes: 30
    needs: lint               # Only runs if lint passes

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # --- XCODE VERSION ---
      # Pin to a specific Xcode version for reproducible builds.
      # Check available versions: ls /Applications/Xcode*.app
      # GitHub's macos-15 runners ship with Xcode 16.x
      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_16.2.app

      # --- SPM CACHE ---
      # Cache Swift Package Manager dependencies to speed up builds.
      # Cache key is based on Package.resolved so it invalidates when deps change.
      - name: Cache SPM packages
        uses: actions/cache@v4
        with:
          path: |
            ~/Library/Developer/Xcode/DerivedData/**/SourcePackages
            ~/Library/Caches/org.swift.swiftpm
          key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
          restore-keys: |
            ${{ runner.os }}-spm-

      # --- RESOLVE PACKAGES ---
      # Pre-resolve packages separately so build step is cleaner.
      - name: Resolve packages
        run: |
          xcodebuild -resolvePackageDependencies \
            -scheme "YourApp" \
            -clonedSourcePackagesDirPath ~/Library/Developer/Xcode/DerivedData/SourcePackages

      # --- BUILD ---
      # Build for iOS Simulator. xcpretty formats the output for readability.
      - name: Build
        run: |
          set -o pipefail
          xcodebuild build-for-testing \
            -scheme "YourApp" \
            -destination "platform=iOS Simulator,name=iPhone 16 Pro" \
            -skipPackagePluginValidation \
            -derivedDataPath DerivedData \
            | xcpretty --color

      # --- TEST ---
      # Run tests with code coverage enabled.
      # test-without-building uses the build from the previous step (faster).
      - name: Test
        run: |
          set -o pipefail
          xcodebuild test-without-building \
            -scheme "YourApp" \
            -destination "platform=iOS Simulator,name=iPhone 16 Pro" \
            -derivedDataPath DerivedData \
            -enableCodeCoverage YES \
            -resultBundlePath TestResults.xcresult \
            | xcpretty --color --report junit \
            --output TestResults/junit.xml

      # --- COVERAGE REPORT ---
      # Extract and display code coverage percentage.
      - name: Code coverage
        if: always()  # Run even if tests fail (to see partial coverage)
        run: |
          if [ -d "TestResults.xcresult" ]; then
            xcrun xccov view --report TestResults.xcresult --json | \
              python3 -c "
          import json, sys
          data = json.load(sys.stdin)
          cov = data.get('lineCoverage', 0) * 100
          print(f'## Code Coverage: {cov:.1f}%')
          " >> $GITHUB_STEP_SUMMARY
          fi

      # --- UPLOAD TEST RESULTS ---
      # Save test results as an artifact for later inspection.
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            TestResults.xcresult
            TestResults/junit.xml
          retention-days: 7

# =============================================================================
# STAGE 3: DEPLOY TO TESTFLIGHT
# =============================================================================
# Archives, exports, and uploads to TestFlight.
# Only runs on main branch after tests pass.
# Cost: ~10-20 minutes

  deploy:
    name: Deploy to TestFlight
    runs-on: macos-15
    timeout-minutes: 45
    needs: build-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Select Xcode version
        run: sudo xcode-select -s /Applications/Xcode_16.2.app

      # --- SIGNING SETUP ---
      # Import the signing certificate from GitHub secrets.
      # The certificate must be exported as .p12 and base64 encoded.
      - name: Install signing certificate
        env:
          CERTIFICATE_P12: ${{ secrets.CERTIFICATE_P12 }}
          CERTIFICATE_PASSWORD: ${{ secrets.CERTIFICATE_PASSWORD }}
          PROVISIONING_PROFILE: ${{ secrets.PROVISIONING_PROFILE }}
        run: |
          # Create a temporary keychain
          KEYCHAIN_PATH=$RUNNER_TEMP/signing.keychain-db
          KEYCHAIN_PASSWORD=$(openssl rand -base64 32)

          security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
          security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

          # Import certificate
          echo "$CERTIFICATE_P12" | base64 --decode > "$RUNNER_TEMP/certificate.p12"
          security import "$RUNNER_TEMP/certificate.p12" \
            -P "$CERTIFICATE_PASSWORD" \
            -A -t cert -f pkcs12 \
            -k "$KEYCHAIN_PATH"
          security set-key-partition-list -S apple-tool:,apple: \
            -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
          security list-keychain -d user -s "$KEYCHAIN_PATH"

          # Install provisioning profile (if using manual signing)
          if [ -n "$PROVISIONING_PROFILE" ]; then
            mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
            echo "$PROVISIONING_PROFILE" | base64 --decode > \
              ~/Library/MobileDevice/Provisioning\ Profiles/profile.mobileprovision
          fi

      # --- SET BUILD NUMBER ---
      # Use the GitHub run number as the build number for unique, incrementing builds.
      - name: Set build number
        run: |
          agvtool new-version -all ${{ github.run_number }}

      # --- ARCHIVE ---
      # Create an archive for distribution.
      - name: Archive
        run: |
          set -o pipefail
          xcodebuild archive \
            -scheme "YourApp" \
            -destination "generic/platform=iOS" \
            -archivePath "$RUNNER_TEMP/YourApp.xcarchive" \
            -skipPackagePluginValidation \
            | xcpretty --color

      # --- EXPORT ---
      # Export the archive as an IPA using ExportOptions.plist.
      - name: Export IPA
        run: |
          xcodebuild -exportArchive \
            -archivePath "$RUNNER_TEMP/YourApp.xcarchive" \
            -exportOptionsPlist ExportOptions.plist \
            -exportPath "$RUNNER_TEMP/export"

      # --- UPLOAD TO TESTFLIGHT ---
      # Uses App Store Connect API key for authentication (no password needed).
      - name: Upload to TestFlight
        env:
          ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          ASC_PRIVATE_KEY: ${{ secrets.ASC_PRIVATE_KEY }}
        run: |
          # Write API key to file
          mkdir -p ~/private_keys
          echo "$ASC_PRIVATE_KEY" | base64 --decode > ~/private_keys/AuthKey_${ASC_KEY_ID}.p8

          xcrun altool --upload-app \
            -f "$RUNNER_TEMP/export/YourApp.ipa" \
            -t ios \
            --apiKey "$ASC_KEY_ID" \
            --apiIssuer "$ASC_ISSUER_ID"

      # --- CLEANUP ---
      # Remove signing credentials from the runner.
      - name: Cleanup signing
        if: always()
        run: |
          security delete-keychain $RUNNER_TEMP/signing.keychain-db 2>/dev/null || true
          rm -f $RUNNER_TEMP/certificate.p12
          rm -rf ~/private_keys
          rm -rf ~/Library/MobileDevice/Provisioning\ Profiles/profile.mobileprovision
```

## Customization Points

Replace `"YourApp"` with your actual scheme name throughout the file.

**To add SwiftFormat:**
```yaml
- name: Check formatting
  run: |
    brew install swiftformat
    swiftformat --lint .
```

**To add a Slack notification:**
```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    fields: repo,message,commit,author
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

**To run on multiple iOS versions:**
```yaml
strategy:
  matrix:
    destination:
      - "platform=iOS Simulator,name=iPhone 16 Pro,OS=18.2"
      - "platform=iOS Simulator,name=iPhone 14,OS=17.5"
```
