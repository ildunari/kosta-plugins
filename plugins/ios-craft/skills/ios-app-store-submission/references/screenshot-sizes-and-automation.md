# App Store Screenshot Sizes and Automation

## Required Screenshot Sizes

### iPhone

| Display Size | Resolution (Portrait) | Resolution (Landscape) | Simulator Device |
|-------------|----------------------|----------------------|-----------------|
| **6.7"** (required) | 1290 x 2796 | 2796 x 1290 | iPhone 15 Pro Max, iPhone 16 Pro Max |
| **6.5"** (required if supporting older) | 1284 x 2778 | 2778 x 1284 | iPhone 14 Plus, iPhone 13 Pro Max |
| 6.1" | 1179 x 2556 | 2556 x 1179 | iPhone 15 Pro, iPhone 16 Pro |
| 5.5" | 1242 x 2208 | 2208 x 1242 | iPhone 8 Plus |

### iPad (Required if Universal App)

| Display Size | Resolution (Portrait) | Resolution (Landscape) | Simulator Device |
|-------------|----------------------|----------------------|-----------------|
| **12.9" (6th gen)** | 2048 x 2732 | 2732 x 2048 | iPad Pro 12.9" (6th gen) |
| **11"** | 1668 x 2388 | 2388 x 1668 | iPad Pro 11" (4th gen) |

### Rules

- Minimum: 2 screenshots per size
- Maximum: 10 screenshots per size
- Format: PNG or JPEG, no alpha channel
- The first 3 screenshots are shown in search results — make them count
- Screenshots can include device frames, text overlays, and marketing graphics
- Screenshots must represent actual app functionality (not misleading)

## Quick Capture with Simulator

### Manual Capture

```bash
# Launch a specific simulator
xcrun simctl boot "iPhone 15 Pro Max"

# Take a screenshot
xcrun simctl io booted screenshot ~/Desktop/screenshot.png

# Take screenshots on multiple devices
for device in "iPhone 15 Pro Max" "iPhone 14 Plus" "iPad Pro (12.9-inch) (6th generation)"; do
    xcrun simctl boot "$device"
    sleep 2
    xcrun simctl io booted screenshot ~/Desktop/"${device// /_}.png"
    xcrun simctl shutdown "$device"
done
```

### Automated Capture Script

Save as `capture_screenshots.sh`:

```bash
#!/bin/bash
# Automated App Store screenshot capture
# Usage: ./capture_screenshots.sh [scheme] [project_path]

SCHEME="${1:-YourApp}"
PROJECT="${2:-.}"
OUTPUT_DIR="$HOME/Desktop/AppStoreScreenshots"
mkdir -p "$OUTPUT_DIR"

# Devices to capture (name must match Simulator exactly)
DEVICES=(
    "iPhone 15 Pro Max"
    "iPhone 14 Plus"
    "iPad Pro (12.9-inch) (6th generation)"
)

for DEVICE in "${DEVICES[@]}"; do
    echo "==> Capturing on: $DEVICE"

    # Clean device name for filename
    SAFE_NAME=$(echo "$DEVICE" | tr ' ()' '_' | tr -d '"')

    # Boot simulator
    xcrun simctl boot "$DEVICE" 2>/dev/null

    # Build and install
    xcodebuild -scheme "$SCHEME" \
        -project "$PROJECT" \
        -destination "platform=iOS Simulator,name=$DEVICE" \
        -derivedDataPath /tmp/ScreenshotBuild \
        build 2>/dev/null

    # Install the app
    APP_PATH=$(find /tmp/ScreenshotBuild -name "*.app" -path "*/Debug-iphonesimulator/*" | head -1)
    xcrun simctl install booted "$APP_PATH"

    # Launch the app
    BUNDLE_ID=$(defaults read "$APP_PATH/Info.plist" CFBundleIdentifier)
    xcrun simctl launch booted "$BUNDLE_ID"

    sleep 3  # Wait for app to load

    # Capture screenshot
    xcrun simctl io booted screenshot "$OUTPUT_DIR/${SAFE_NAME}_01.png"

    echo "    Saved: ${SAFE_NAME}_01.png"

    # Shutdown
    xcrun simctl shutdown "$DEVICE" 2>/dev/null
done

echo ""
echo "Screenshots saved to: $OUTPUT_DIR"
```

## XCUITest Screenshot Capture (Recommended)

The most reliable approach — captures specific screens programmatically.

Create a UI test file:

```swift
import XCTest

final class ScreenshotTests: XCTestCase {

    let app = XCUIApplication()

    override func setUp() {
        continueAfterFailure = false
        app.launchArguments = ["--screenshot-mode"]  // Use to set up demo data
        app.launch()
    }

    func testCaptureScreenshots() {
        // Screenshot 1: Home screen
        sleep(1)  // Wait for animations
        takeScreenshot(name: "01_HomeScreen")

        // Screenshot 2: Navigate to detail
        app.buttons["Featured Item"].tap()
        sleep(1)
        takeScreenshot(name: "02_DetailView")

        // Screenshot 3: Settings
        app.navigationBars.buttons.element(boundBy: 0).tap()
        app.tabBars.buttons["Settings"].tap()
        sleep(1)
        takeScreenshot(name: "03_Settings")

        // Add more screens as needed
    }

    private func takeScreenshot(name: String) {
        let screenshot = app.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
```

Run for multiple devices:

```bash
# Capture on all required devices
for dest in \
    "platform=iOS Simulator,name=iPhone 15 Pro Max" \
    "platform=iOS Simulator,name=iPhone 14 Plus" \
    "platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation)"; do

    xcodebuild test \
        -scheme "YourApp" \
        -destination "$dest" \
        -testPlan "Screenshots" \
        -resultBundlePath "/tmp/Screenshots_$(date +%s)" \
        2>/dev/null
done
```

Extract screenshots from result bundles:

```bash
# Extract attachments from xcresult
xcrun xcresulttool get --path /tmp/Screenshots_*.xcresult \
    --format json | python3 -c "
import json, sys, subprocess, os
# Parse and extract screenshot attachments
data = json.load(sys.stdin)
# ... extraction logic depends on xcresulttool version
"
```

## Fastlane Snapshot (Most Automated)

If using Fastlane, `snapshot` handles everything:

```ruby
# Snapfile
devices([
  "iPhone 15 Pro Max",
  "iPhone 14 Plus",
  "iPad Pro (12.9-inch) (6th generation)"
])

languages(["en-US"])

scheme("YourApp")
output_directory("./screenshots")
clear_previous_screenshots(true)

# Optional: override status bar
override_status_bar(true)
```

Run:
```bash
fastlane snapshot
```

Then upload with `deliver`:
```bash
fastlane deliver
```

## Screenshot Design Tips

### What Makes Good App Store Screenshots

1. **First screenshot** = hero shot. Show the primary value proposition.
2. **Add text overlays** describing the benefit (not the feature):
   - Good: "Track your habits effortlessly"
   - Bad: "Habit tracking screen"
3. **Use consistent framing** — same device mockup style, same text treatment
4. **Show real content** — not empty states or lorem ipsum
5. **Dark mode variant** in at least one screenshot shows polish

### Tools for Adding Frames and Text

- **Figma** — free, templates available for App Store screenshots
- **Screenshots Pro** (macOS app) — drag-and-drop App Store screenshot builder
- **LaunchMatic** — automated screenshot framing
- **Fastlane Frameit** — CLI tool for adding device frames

### Status Bar

For clean screenshots, override the simulator status bar:

```bash
# Set clean status bar (full signal, WiFi, 9:41 AM, full battery)
xcrun simctl status_bar booted override \
    --time "9:41" \
    --batteryState charged \
    --batteryLevel 100 \
    --wifiBars 3 \
    --cellularBars 4
```

Reset when done:

```bash
xcrun simctl status_bar booted clear
```
