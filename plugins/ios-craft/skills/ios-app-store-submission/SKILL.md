---
name: ios-app-store-submission
description: >
  Step-by-step App Store submission workflow. Use when the user wants to ship to TestFlight
  or the App Store. Covers certificates, provisioning, app icons, screenshots, metadata,
  review guidelines, and common rejection prevention. Written for first-time submitters.
---

# App Store Submission Workflow

Guide the user through publishing their iOS app from zero to live on the App Store. Adapt pace to their experience level — assume first-time submitter unless they indicate otherwise.

## Workflow

### 1. Prerequisite Check

Before anything else, confirm:

- [ ] Apple Developer Program membership ($99/year) — free accounts cannot submit
- [ ] Xcode is current stable release
- [ ] App has a unique Bundle Identifier (e.g., `com.yourname.appname`)
- [ ] App runs on a physical device (not just Simulator)
- [ ] No third-party framework license violations

If any prerequisite is missing, help the user resolve it before continuing.

### 2. Certificates Explained in Plain English

See `references/signing-explained-for-beginners.md` for the full explanation.

Key points to convey:
- A **certificate** is your identity card — it proves Apple knows who you are
- A **provisioning profile** is a permission slip — it says "this person can install this app on these devices"
- **Automatic signing** handles both for you in most cases

Recommend automatic signing for beginners. Only discuss manual signing if the user has a team, CI/CD pipeline, or enterprise distribution needs.

### 3. Automatic Signing Setup

Walk the user through:

```
Xcode → Target → Signing & Capabilities tab
  ✓ "Automatically manage signing" is checked
  ✓ Team is selected (their Apple Developer account)
  ✓ No red errors in the signing section
```

If errors appear, common fixes:
- "No accounts with valid signing identities": Sign into Apple ID in Xcode → Settings → Accounts
- "No profiles for bundle identifier": Change bundle ID to something unique
- "Provisioning profile doesn't include signing certificate": Revoke and regenerate in Xcode (automatic handles this)

### 4. App Icon Preparation

Requirements:
- Single 1024x1024 PNG image, no transparency, no alpha channel, no rounded corners (Apple applies them)
- Must be added to `Assets.xcassets` → `AppIcon`

Quick validation:

```bash
# Check image dimensions and alpha channel
sips -g pixelHeight -g pixelWidth -g hasAlpha /path/to/icon.png
```

If `hasAlpha: yes`, remove it:

```bash
sips -s format png --setProperty formatOptions 100 /path/to/icon.png -o /path/to/icon_no_alpha.png
```

Starting with Xcode 15, a single 1024x1024 icon auto-generates all sizes. No need for multiple icon files.

### 5. Build for Device

Before archiving, verify the app works on a physical device:

```
Xcode → Product → Destination → [Select physical device]
Xcode → Product → Run (⌘R)
```

Check for:
- No crashes on launch
- All features work as expected
- Network requests succeed (not just localhost)
- Push notifications configured (if applicable)

### 6. Archive and Export

```
Xcode → Product → Destination → "Any iOS Device (arm64)"
Xcode → Product → Archive (⌘⇧B doesn't work — must use Archive)
```

Wait for the archive to complete. The Organizer window opens automatically.

From Organizer:
1. Select the archive
2. Click "Distribute App"
3. Choose "App Store Connect"
4. Choose "Upload" (sends directly) or "Export" (creates .ipa for manual upload)
5. Follow prompts — accept defaults for automatic signing

Common archive failures:
- **"No such module"**: Clean build folder (⌘⇧K), resolve SPM packages
- **Bitcode errors**: Bitcode is no longer required as of Xcode 14 — disable it in Build Settings if a dependency complains
- **Architecture issues**: Ensure "Any iOS Device" is selected, not a specific Simulator

### 7. App Store Connect Setup

Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com):

1. **My Apps → + → New App**
2. Fill in:
   - Platform: iOS
   - Name: Your app's display name (30 char limit, must be unique on the store)
   - Primary language
   - Bundle ID: Must match Xcode exactly
   - SKU: Any unique string (e.g., `myapp-v1`)

3. Complete the required metadata — see `references/app-store-metadata-template.md`

### 8. Screenshots

See `references/screenshot-sizes-and-automation.md` for required sizes and automation.

Minimum required sets:
- 6.7" display (iPhone 15 Pro Max / 16 Pro Max)
- 6.5" display (iPhone 11 Pro Max) — only if supporting older sizes

Optional but recommended:
- 5.5" display (iPhone 8 Plus)
- iPad Pro 12.9" (if universal app)

Up to 10 screenshots per size. First 3 are most important — they appear in search results.

### 9. TestFlight Upload

After uploading the build from Xcode:

1. Wait 15-30 minutes for Apple to process the build
2. In App Store Connect → TestFlight tab, the build appears
3. If it says "Missing Compliance" → click and answer the encryption question:
   - If your app only uses HTTPS (standard networking): select "Yes, but only standard encryption"
   - This is the most common answer
4. Add internal testers (up to 100, must be App Store Connect users)
5. For external testers: create a Beta App Review submission (brief review, usually < 24 hours)

### 10. Beta Testing

Recommended testing checklist before submission:
- [ ] App launches without crash on oldest supported iOS version
- [ ] All core user flows complete successfully
- [ ] Works on both WiFi and cellular
- [ ] Works with different locale/language settings
- [ ] Dark mode doesn't break UI
- [ ] VoiceOver basics work (accessibility)
- [ ] Memory usage is reasonable (no obvious leaks)
- [ ] No debug/test data visible to users

### 11. Submission

In App Store Connect:

1. Go to your app → App Store tab
2. Select the build you want to submit
3. Fill in all required fields (version notes, content rating, pricing)
4. Click "Submit for Review"
5. Optionally: check "Manually release" if you want to control the exact launch moment

Review typically takes 24-48 hours. You'll receive email updates.

### 12. Review Guidelines Crash Course

See `references/app-store-rejection-prevention.md` for the full list.

**Top 10 rejection reasons to check before submitting:**

1. **Bugs and crashes** — test thoroughly, especially edge cases
2. **Broken links** — every URL in the app must work
3. **Placeholder content** — no lorem ipsum, no "TODO", no test data
4. **Incomplete metadata** — screenshots must match current app version
5. **Privacy policy missing** — required for ALL apps, must be a URL
6. **Login required but no demo account** — provide test credentials in review notes
7. **In-app purchase issues** — must use Apple's IAP for digital goods
8. **Minimum functionality** — app must do more than a simple website could
9. **Misleading description** — what you describe must match what the app does
10. **Privacy manifest missing** — required if using certain APIs (UserDefaults for tracking, etc.)

### 13. Post-Submission

After approval:

- **Monitor Crashes**: Xcode Organizer → Crashes, or App Store Connect → Analytics
- **Respond to Reviews**: App Store Connect → Ratings and Reviews
- **Plan Updates**: Keep a regular update cadence (Apple favors actively maintained apps)
- **Track Metrics**: App Store Connect → App Analytics for downloads, retention, etc.

If rejected:
1. Read the rejection reason carefully — Apple provides specific guideline references
2. Fix the issue
3. Reply in the Resolution Center (don't create a new submission)
4. Resubmit — resubmissions usually get faster review

## Key Reminders

- First submission is the hardest. Subsequent updates are much simpler.
- When in doubt about review guidelines, err on the side of caution.
- Apple's review team is human — be polite in Resolution Center communications.
- TestFlight is your friend. Use it extensively before submitting to the store.
