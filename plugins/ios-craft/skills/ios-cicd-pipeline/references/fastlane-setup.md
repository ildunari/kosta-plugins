# Fastlane Setup for iOS

Getting started with Fastlane: scan (test), gym (build), pilot (TestFlight), and match (signing).

## Installation

```bash
# Install via Homebrew (recommended)
brew install fastlane

# Or via RubyGems
gem install fastlane

# Verify
fastlane --version
```

## Initialize Fastlane

```bash
cd /path/to/your/project
fastlane init
```

Choose option 2 (Automate beta distribution) or 4 (Manual setup).

This creates:
```
fastlane/
  Appfile      # App metadata (bundle ID, team ID)
  Fastfile     # Lane definitions (your automation scripts)
```

## Appfile

```ruby
# fastlane/Appfile

app_identifier("com.yourcompany.yourapp")
apple_id("your@email.com")
team_id("YOUR_TEAM_ID")

# App Store Connect API Key (recommended over password auth)
# Generate at: App Store Connect → Users and Access → Keys
json_key_file("fastlane/asc_api_key.json")  # Downloaded from ASC
```

## Fastfile — Complete Example

```ruby
# fastlane/Fastfile

default_platform(:ios)

platform :ios do

  # =========================================================================
  # TESTING
  # =========================================================================

  desc "Run all tests"
  lane :test do
    # scan is Fastlane's test runner (wraps xcodebuild test)
    scan(
      scheme: "YourApp",
      devices: ["iPhone 16 Pro"],
      code_coverage: true,
      output_types: "junit,html",
      output_directory: "fastlane/test_output",
      clean: true
    )
  end

  desc "Run tests and check coverage threshold"
  lane :test_with_coverage do
    test

    # Check coverage meets minimum
    xcov(
      scheme: "YourApp",
      minimum_coverage_percentage: 60.0,
      only_project_targets: true
    )
  end

  # =========================================================================
  # LINTING
  # =========================================================================

  desc "Run SwiftLint"
  lane :lint do
    swiftlint(
      mode: :lint,
      strict: true,
      reporter: "emoji"
    )
  end

  # =========================================================================
  # BUILDING
  # =========================================================================

  desc "Build for testing (no archive)"
  lane :build do
    # gym is Fastlane's build tool (wraps xcodebuild archive + export)
    gym(
      scheme: "YourApp",
      skip_archive: true,
      destination: "platform=iOS Simulator,name=iPhone 16 Pro"
    )
  end

  desc "Build and archive for App Store"
  lane :archive do
    # Increment build number
    increment_build_number(
      build_number: latest_testflight_build_number + 1
    )

    gym(
      scheme: "YourApp",
      export_method: "app-store",
      output_directory: "fastlane/builds",
      output_name: "YourApp.ipa",
      clean: true,
      include_bitcode: false
    )
  end

  # =========================================================================
  # DEPLOYMENT
  # =========================================================================

  desc "Push a new build to TestFlight"
  lane :beta do
    # Run tests first
    test

    # Archive
    archive

    # pilot is Fastlane's TestFlight uploader
    pilot(
      skip_waiting_for_build_processing: true,  # Don't wait for Apple to process
      distribute_external: false,                # Internal testers only
      changelog: "Bug fixes and improvements"    # TestFlight release notes
    )

    # Notify (optional)
    slack(
      message: "New TestFlight build uploaded!",
      slack_url: ENV["SLACK_WEBHOOK"]
    ) if ENV["SLACK_WEBHOOK"]
  end

  desc "Push to TestFlight and distribute to external testers"
  lane :beta_external do
    test
    archive

    pilot(
      distribute_external: true,
      groups: ["External Testers"],              # TestFlight group name
      changelog: "New beta release",
      demo_account_required: true,
      beta_app_review_info: {
        contact_email: "you@email.com",
        contact_first_name: "Your",
        contact_last_name: "Name",
        contact_phone: "+1234567890",
        demo_account_name: "demo@test.com",
        demo_account_password: "password123"
      }
    )
  end

  desc "Deploy to App Store (submit for review)"
  lane :release do
    test
    archive

    deliver(
      submit_for_review: true,
      automatic_release: false,                  # Manually release after approval
      force: true,                               # Skip HTML preview
      precheck_include_in_app_purchases: false,
      submission_information: {
        add_id_info_uses_idfa: false
      }
    )
  end

  # =========================================================================
  # CODE SIGNING (Match)
  # =========================================================================

  desc "Sync certificates and profiles (development)"
  lane :sync_dev do
    match(
      type: "development",
      readonly: true    # Don't create new certs, just download existing ones
    )
  end

  desc "Sync certificates and profiles (App Store)"
  lane :sync_appstore do
    match(
      type: "appstore",
      readonly: true
    )
  end

  desc "Register a new device and regenerate profiles"
  lane :add_device do |options|
    device_name = options[:name] || prompt(text: "Device name: ")
    device_udid = options[:udid] || prompt(text: "Device UDID: ")

    register_devices(
      devices: { device_name => device_udid }
    )

    match(
      type: "development",
      force_for_new_devices: true
    )
  end

  # =========================================================================
  # UTILITIES
  # =========================================================================

  desc "Take App Store screenshots"
  lane :screenshots do
    snapshot(
      devices: [
        "iPhone 16 Pro Max",
        "iPhone 14 Plus",
        "iPad Pro (12.9-inch) (6th generation)"
      ],
      languages: ["en-US"],
      clear_previous_screenshots: true,
      override_status_bar: true
    )
  end

  desc "Increment version number"
  lane :bump do |options|
    type = options[:type] || "patch"  # major, minor, or patch
    increment_version_number(bump_type: type)
    commit_version_bump
  end
end
```

## Match Setup (Code Signing)

Match stores signing certificates and profiles in a shared location (Git repo, Google Cloud, or S3).

```bash
# Initialize match
fastlane match init
```

Choose storage:
1. **Git** (private repo) — most common
2. **Google Cloud Storage**
3. **Amazon S3**

```bash
# Generate development certificates + profiles
fastlane match development

# Generate App Store certificates + profiles
fastlane match appstore
```

**Matchfile** (`fastlane/Matchfile`):

```ruby
# fastlane/Matchfile

git_url("https://github.com/your-org/certificates.git")  # Private repo
type("appstore")
app_identifier("com.yourcompany.yourapp")
team_id("YOUR_TEAM_ID")

# For CI: set MATCH_PASSWORD env var instead of prompting
# ENV["MATCH_PASSWORD"] = "your-encryption-password"
```

**Using match in CI (GitHub Actions):**

```yaml
- name: Sync signing
  env:
    MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
    MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_AUTH }}
  run: fastlane sync_appstore
```

## Running Lanes

```bash
# Run tests
fastlane test

# Push to TestFlight
fastlane beta

# Deploy to App Store
fastlane release

# Lint
fastlane lint

# Add a device
fastlane add_device name:"John's iPhone" udid:"00008110-XXXX"

# Bump version
fastlane bump type:minor

# Take screenshots
fastlane screenshots
```

## Environment Variables for CI

| Variable | Purpose |
|----------|---------|
| `MATCH_PASSWORD` | Decryption password for match certificates |
| `MATCH_GIT_BASIC_AUTHORIZATION` | Base64 of `username:token` for match Git repo |
| `FASTLANE_USER` | Apple ID (if not using API key) |
| `FASTLANE_PASSWORD` | Apple ID password (if not using API key) |
| `SLACK_WEBHOOK` | Slack webhook URL for notifications |
| `APP_STORE_CONNECT_API_KEY_ID` | ASC API key ID |
| `APP_STORE_CONNECT_API_ISSUER_ID` | ASC issuer ID |
| `APP_STORE_CONNECT_API_KEY_PATH` | Path to .p8 key file |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "No matching provisioning profiles" | Run `fastlane match development` or `fastlane match appstore` |
| "Session expired" | Use API key auth instead of password auth |
| Slow builds | Add `clean: false` to gym, use `derived_data_path` |
| "Could not find scheme" | Run `fastlane run list_schemes` to see available schemes |
| Match decryption fails | Verify `MATCH_PASSWORD` matches what was set during `match init` |
