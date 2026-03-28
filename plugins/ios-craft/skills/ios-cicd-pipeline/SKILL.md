---
name: ios-cicd-pipeline
description: >
  Set up CI/CD for iOS apps. Covers GitHub Actions, Xcode Cloud, and Fastlane.
  Automates build, test, lint, and deploy workflows. For beginners setting up
  their first automated pipeline.
---

# iOS CI/CD Pipeline

Guide the user through setting up automated build, test, and deployment for their iOS app. Recommend the right tool for their situation and walk through complete setup.

## Workflow

### 1. Choose Your Platform

| Platform | Best For | Cost | Setup Effort |
|----------|---------|------|-------------|
| **GitHub Actions** | Open source, GitHub-native teams, custom workflows | Free tier: 2,000 min/month (macOS uses 10x multiplier = 200 min). Paid: $0.08/min macOS. | Medium |
| **Xcode Cloud** | Small teams, Apple ecosystem, simplicity | 25 hrs/month free with Apple Developer account. Paid plans available. | Low |
| **Fastlane** | Advanced automation, multi-step deploys, runs anywhere | Free (open source). Runs on your CI of choice. | Medium-High |

**Recommendation:**
- Just starting out? **Xcode Cloud** — least setup, integrated with Xcode
- Already using GitHub? **GitHub Actions** — most flexible, great ecosystem
- Need advanced deployment (multiple apps, complex signing)? **Fastlane** on any CI

### 2. GitHub Actions Setup

See `references/github-actions-ios.md` for the complete annotated workflow file.

**Quick start:**

1. Create `.github/workflows/ios.yml` in your repo
2. The workflow triggers on push to main and pull requests
3. Four stages: lint, build, test, deploy

**Minimum viable workflow:**

```yaml
name: iOS CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4

      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_16.2.app

      - name: Build
        run: |
          xcodebuild build \
            -scheme "YourApp" \
            -destination "platform=iOS Simulator,name=iPhone 16 Pro" \
            -skipPackagePluginValidation \
            | xcpretty

      - name: Test
        run: |
          xcodebuild test \
            -scheme "YourApp" \
            -destination "platform=iOS Simulator,name=iPhone 16 Pro" \
            -skipPackagePluginValidation \
            | xcpretty
```

### 3. Code Signing in CI

The hardest part of iOS CI/CD. Two approaches:

**Option A: Fastlane Match (recommended for teams)**
- Stores certificates and profiles in a private Git repo or cloud storage
- All team members and CI use the same signing identity
- See `references/fastlane-setup.md` for Match configuration

**Option B: Manual certificate management**
- Export your signing certificate as a .p12 file
- Store it as a GitHub Actions secret (base64 encoded)
- Import into the CI keychain during the build

```yaml
# In your GitHub Actions workflow
- name: Install signing certificate
  env:
    CERTIFICATE_P12: ${{ secrets.CERTIFICATE_P12 }}
    CERTIFICATE_PASSWORD: ${{ secrets.CERTIFICATE_PASSWORD }}
  run: |
    # Create temporary keychain
    KEYCHAIN_PATH=$RUNNER_TEMP/signing.keychain-db
    KEYCHAIN_PASSWORD=$(openssl rand -base64 32)

    security create-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
    security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
    security unlock-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH

    # Import certificate
    echo "$CERTIFICATE_P12" | base64 --decode > $RUNNER_TEMP/certificate.p12
    security import $RUNNER_TEMP/certificate.p12 \
        -P "$CERTIFICATE_PASSWORD" \
        -A -t cert -f pkcs12 \
        -k $KEYCHAIN_PATH
    security set-key-partition-list -S apple-tool:,apple: \
        -k "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH

    # Add to search list
    security list-keychain -d user -s $KEYCHAIN_PATH
```

### 4. Test Automation

```yaml
# Run tests and generate coverage
- name: Test with coverage
  run: |
    xcodebuild test \
      -scheme "YourApp" \
      -destination "platform=iOS Simulator,name=iPhone 16 Pro" \
      -enableCodeCoverage YES \
      -resultBundlePath TestResults.xcresult \
      | xcpretty

# Extract coverage percentage
- name: Check coverage
  run: |
    xcrun xccov view --report TestResults.xcresult --json | \
      python3 -c "
    import json, sys
    data = json.load(sys.stdin)
    coverage = data['lineCoverage'] * 100
    print(f'Code coverage: {coverage:.1f}%')
    if coverage < 60:
        print('::warning::Coverage below 60% threshold')
        sys.exit(1)
    "
```

### 5. TestFlight Deployment

Automate uploading to TestFlight after tests pass:

```yaml
deploy:
  needs: build-and-test
  runs-on: macos-15
  if: github.ref == 'refs/heads/main'  # Only deploy from main

  steps:
    - uses: actions/checkout@v4

    - name: Select Xcode
      run: sudo xcode-select -s /Applications/Xcode_16.2.app

    - name: Install signing certificate
      # ... (certificate setup from step 3)

    - name: Archive
      run: |
        xcodebuild archive \
          -scheme "YourApp" \
          -archivePath $RUNNER_TEMP/YourApp.xcarchive \
          -destination "generic/platform=iOS"

    - name: Export IPA
      run: |
        xcodebuild -exportArchive \
          -archivePath $RUNNER_TEMP/YourApp.xcarchive \
          -exportOptionsPlist ExportOptions.plist \
          -exportPath $RUNNER_TEMP/export

    - name: Upload to TestFlight
      env:
        APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.ASC_KEY_ID }}
        APP_STORE_CONNECT_API_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
        APP_STORE_CONNECT_API_KEY: ${{ secrets.ASC_PRIVATE_KEY }}
      run: |
        xcrun altool --upload-app \
          -f $RUNNER_TEMP/export/YourApp.ipa \
          -t ios \
          --apiKey "$APP_STORE_CONNECT_API_KEY_ID" \
          --apiIssuer "$APP_STORE_CONNECT_API_ISSUER_ID"
```

**ExportOptions.plist** (create this in your repo):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>destination</key>
    <string>upload</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
</dict>
</plist>
```

### 6. Environment Variables and Secrets

**GitHub Actions secrets setup:**

1. Go to your repo → Settings → Secrets and variables → Actions
2. Add these secrets:

| Secret Name | What It Is | How to Get It |
|-------------|-----------|---------------|
| `CERTIFICATE_P12` | Base64-encoded signing certificate | Export from Keychain, `base64 -i cert.p12` |
| `CERTIFICATE_PASSWORD` | Password for the .p12 file | The password you set during export |
| `ASC_KEY_ID` | App Store Connect API key ID | App Store Connect → Users → Keys → + |
| `ASC_ISSUER_ID` | App Store Connect issuer ID | Same page as key ID |
| `ASC_PRIVATE_KEY` | Base64-encoded .p8 key file | Downloaded when creating the API key |

**App Store Connect API Key setup:**
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → Users and Access → Keys
2. Click + to create a new key
3. Name it (e.g., "CI/CD") and give it "App Manager" role
4. Download the .p8 file (can only download once)
5. Note the Key ID and Issuer ID

### Xcode Cloud (Alternative)

If you prefer Apple's built-in CI:

1. **In Xcode:** Product → Xcode Cloud → Create Workflow
2. **Configure triggers:** Push to main, pull requests
3. **Actions:** Build, test, archive, deploy to TestFlight
4. **Post-actions:** Notify via Slack, email

**Advantages:** No certificate management (Apple handles signing), integrated in Xcode, simple setup.

**Limitations:** Less customizable than GitHub Actions, limited to Apple ecosystem, harder to add custom scripts.

### Pipeline Best Practices

1. **Cache SPM packages** to speed up builds:
```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/Library/Developer/Xcode/DerivedData
      ~/Library/Caches/org.swift.swiftpm
    key: ${{ runner.os }}-spm-${{ hashFiles('**/Package.resolved') }}
```

2. **Run lint first** (fail fast before expensive builds):
```yaml
jobs:
  lint:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      - name: SwiftLint
        run: |
          brew install swiftlint
          swiftlint lint --reporter github-actions-logging
```

3. **Use `xcpretty`** for readable build output:
```bash
xcodebuild build ... | xcpretty
```

4. **Set timeout** to avoid stuck builds:
```yaml
jobs:
  build:
    runs-on: macos-15
    timeout-minutes: 30
```

5. **Version your builds** automatically:
```yaml
- name: Set build number
  run: |
    BUILD_NUMBER=${{ github.run_number }}
    agvtool new-version -all $BUILD_NUMBER
```
