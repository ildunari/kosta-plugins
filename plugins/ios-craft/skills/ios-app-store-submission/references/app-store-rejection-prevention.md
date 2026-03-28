# App Store Rejection Prevention

The 20 most common rejection reasons, organized by frequency. Each includes the guideline reference, what triggers it, and how to prevent it.

## Critical (Almost Guaranteed Rejection)

### 1. Crashes and Bugs (Guideline 2.1)
**Trigger:** App crashes during review, hangs on launch, or has obvious broken features.
**Prevention:**
- [ ] Test on the oldest iOS version you support
- [ ] Test on both iPhone and iPad if universal
- [ ] Test with airplane mode on (handle network failures gracefully)
- [ ] Test with low storage / low memory conditions
- [ ] Run the app fresh (delete and reinstall) — don't rely on cached state

### 2. Broken Links (Guideline 2.1)
**Trigger:** Any URL in the app (help, terms, support, external links) returns a 404 or error.
**Prevention:**
- [ ] Test every tappable link in the app
- [ ] Ensure privacy policy URL works
- [ ] Ensure support URL works
- [ ] Check that deep links handle missing content gracefully

### 3. Placeholder Content (Guideline 2.1)
**Trigger:** Lorem ipsum text, "TODO" labels, test data, placeholder images, or debug screens visible.
**Prevention:**
- [ ] Search codebase for "lorem", "TODO", "test", "placeholder", "dummy"
- [ ] Remove any debug/dev menus or hide them behind a flag
- [ ] Replace all stock photos if they suggest functionality that doesn't exist

### 4. Incomplete Metadata (Guideline 2.3)
**Trigger:** Screenshots don't match current app, description mentions features that don't exist, or category is wrong.
**Prevention:**
- [ ] Take fresh screenshots from the exact build you're submitting
- [ ] Re-read your description against actual app features
- [ ] Verify the app category matches the app's primary function

### 5. Privacy Policy Missing or Inadequate (Guideline 5.1.1)
**Trigger:** No privacy policy URL, URL is broken, or the policy doesn't cover what data the app collects.
**Prevention:**
- [ ] Add a privacy policy URL in App Store Connect AND inside the app
- [ ] Policy must describe: what data you collect, why, who you share it with, how to request deletion
- [ ] Policy must be accessible without login
- [ ] Free generators: [Privacy Policy Generator](https://www.privacypolicygenerator.info/) or similar — but review the output

## High Frequency

### 6. Login Wall Without Demo Account (Guideline 2.1)
**Trigger:** App requires login but reviewer has no way to access it.
**Prevention:**
- [ ] Provide demo credentials in the "Notes for Review" field in App Store Connect
- [ ] Verify the demo account works before submitting
- [ ] If using OAuth only (Sign in with Apple, Google), explain in review notes how the reviewer can test

### 7. In-App Purchase Violations (Guideline 3.1.1)
**Trigger:** Using Stripe, PayPal, or external payment for digital goods/services consumed within the app.
**Prevention:**
- [ ] Digital goods (subscriptions, premium features, virtual currency) MUST use Apple's In-App Purchase
- [ ] Physical goods and services (Uber, Amazon, food delivery) CAN use external payment
- [ ] Don't link to external payment pages for digital goods
- [ ] "Reader" apps (Netflix, Spotify) can link to their website for account creation as of 2024

### 8. Minimum Functionality (Guideline 4.2)
**Trigger:** App is just a wrapper around a website, a single-feature calculator, or could be a web page.
**Prevention:**
- [ ] App should use native iOS features (notifications, camera, sensors, offline mode)
- [ ] App should provide value beyond what a mobile website could
- [ ] If it's a web wrapper, add significant native functionality

### 9. Misleading Description (Guideline 2.3.1)
**Trigger:** App description promises features that don't exist or exaggerates capabilities.
**Prevention:**
- [ ] Every feature mentioned in the description must be testable in the app
- [ ] Don't claim "AI-powered" unless there's actual AI functionality
- [ ] Don't reference other platforms ("also available on Android") in the description

### 10. Privacy Manifest Missing (Guideline 5.1.1, effective 2024)
**Trigger:** App uses required reason APIs without a PrivacyInfo.xcprivacy file.
**Prevention:**
- [ ] Add PrivacyInfo.xcprivacy if you use: UserDefaults, file timestamp APIs, disk space APIs, system boot time APIs
- [ ] Declare all tracking domains
- [ ] Third-party SDKs must also include their own privacy manifests
- [ ] Check Apple's required reason API list: [Apple Documentation](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)

## Medium Frequency

### 11. Push Notification Misuse (Guideline 4.5.4)
**Trigger:** Asking for push permission on first launch without context, or using push for marketing/spam.
**Prevention:**
- [ ] Explain WHY you need notifications before requesting permission
- [ ] Don't request on first launch — wait until a contextually relevant moment
- [ ] Never use push notifications for advertising

### 12. Location Permission Without Justification (Guideline 5.1.1)
**Trigger:** Requesting "Always" location when "When In Use" would suffice, or no clear reason for location access.
**Prevention:**
- [ ] Use the minimum permission level needed
- [ ] Write a clear, specific purpose string (not "We need your location")
- [ ] Good: "Your location is used to show nearby restaurants on the map"
- [ ] Bad: "This app uses your location"

### 13. Intellectual Property Issues (Guideline 5.2)
**Trigger:** Using Apple trademarks, other app icons, copyrighted content, or trademarked names.
**Prevention:**
- [ ] Don't use "iPhone", "iPad" in your app name (use "mobile device" instead)
- [ ] Don't use Apple's SF Symbols in your app icon
- [ ] Don't use competitor logos or screenshots
- [ ] Ensure all images/audio are licensed or original

### 14. User-Generated Content Without Moderation (Guideline 1.2)
**Trigger:** App allows user-generated content (posts, photos, chat) without a way to report/block abuse.
**Prevention:**
- [ ] Add report/flag mechanism for user content
- [ ] Add block user functionality
- [ ] Include content moderation (even basic keyword filtering)
- [ ] Mention your moderation approach in review notes

### 15. Sign in with Apple Missing (Guideline 4.8)
**Trigger:** App offers third-party login (Google, Facebook, Twitter) but not Sign in with Apple.
**Prevention:**
- [ ] If you offer ANY third-party login, you MUST also offer Sign in with Apple
- [ ] Exception: apps that exclusively use their own login system (email/password)
- [ ] Sign in with Apple must be presented as an option of equal prominence

## Lower Frequency (But Still Common)

### 16. Kids Category Violations (Guideline 1.3)
**Trigger:** App in Kids category has ads, links to external sites, or collects data.
**Prevention:**
- [ ] No third-party analytics or ads in Kids category apps
- [ ] No links that leave the app without a parental gate
- [ ] Comply with COPPA

### 17. Health/Medical Claims (Guideline 1.4.1)
**Trigger:** App makes health claims without medical review board approval or appropriate disclaimers.
**Prevention:**
- [ ] Add disclaimers: "This app is not a substitute for professional medical advice"
- [ ] Don't claim to diagnose, treat, or cure conditions
- [ ] If using HealthKit, justify every data type you access

### 18. Background Mode Abuse (Guideline 2.5.4)
**Trigger:** App declares background modes (audio, location, VOIP) but doesn't actually use them.
**Prevention:**
- [ ] Only declare background modes you actively use
- [ ] Remove any background mode capabilities you added "just in case"
- [ ] If using background audio, the app must actually play audio

### 19. App Thinning / Binary Size Issues (Guideline 2.5.11)
**Trigger:** App is unreasonably large or includes unnecessary architectures.
**Prevention:**
- [ ] Enable App Thinning in archive export options
- [ ] Compress large assets
- [ ] Use on-demand resources for content the user might not need immediately

### 20. Inadequate Age Rating (Guideline 2.3.5)
**Trigger:** Content rating doesn't match actual app content. A chat app rated 4+ or a violent game rated 9+.
**Prevention:**
- [ ] Answer the content rating questionnaire honestly
- [ ] If app has user-generated content, rate for "Unrestricted Web Access"
- [ ] If app has mild cartoon violence, at least 9+
- [ ] If app has realistic violence or mature themes, 17+

## Pre-Submission Checklist

Run through this before every submission:

```
□ App doesn't crash on launch or during core flows
□ All links work (privacy policy, support, in-app URLs)
□ No placeholder text or debug UI
□ Screenshots match the current build
□ Privacy policy URL is set and accessible
□ Demo login credentials provided (if applicable)
□ Digital purchases use Apple IAP
□ PrivacyInfo.xcprivacy is included and accurate
□ Sign in with Apple offered (if using third-party login)
□ All permission request strings are specific and helpful
□ Content rating matches actual content
□ App provides value beyond a web wrapper
□ Description accurately reflects the app
□ No IP/trademark violations
```

## After Rejection

1. **Don't panic.** Most rejections are fixable in a day.
2. Read the specific guideline cited in the rejection.
3. Fix the exact issue — don't make other changes at the same time.
4. Reply in the Resolution Center (don't create a new submission).
5. Resubmissions typically get reviewed faster (often same day).
6. If you disagree with the rejection, you can appeal — but be polite and specific about why.
