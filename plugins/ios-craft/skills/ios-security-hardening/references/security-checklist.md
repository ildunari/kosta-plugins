# iOS Security Checklist

20-item checklist for securing an iOS app. Ordered by impact — fix the top items first.

## Data Protection

- [ ] **1. No hardcoded secrets.** API keys, tokens, and passwords must not appear in source code. Use Keychain, environment variables, or a secure config fetched at runtime. Search your repo for patterns like `"sk-"`, `"Bearer "`, `password =`, `apiKey =`.

- [ ] **2. Sensitive data stored in Keychain, not UserDefaults.** UserDefaults is an unencrypted plist. Auth tokens, refresh tokens, API keys, and any credential must use the Keychain with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`.

- [ ] **3. Files with sensitive content use Complete file protection.** Write sensitive files with `.completeFileProtection` so they are encrypted when the device is locked. Core Data stores should set `NSPersistentStoreFileProtectionKey`.

- [ ] **4. Clipboard does not leak secrets.** If the app copies sensitive data (passwords, tokens, account numbers), set an expiration with `UIPasteboard.general.setItems(_:options:)` using `.expirationDate` and `.localOnly`.

- [ ] **5. Sensitive data cleared from memory when no longer needed.** Zero out sensitive byte arrays after use. Don't hold auth tokens in long-lived singletons if they can be re-fetched from Keychain on demand.

## Network Security

- [ ] **6. HTTPS everywhere.** All network requests use HTTPS. No ATS exceptions for `NSAllowsArbitraryLoads`. If an exception is absolutely required, scope it to the specific domain and document why.

- [ ] **7. Certificate pinning for sensitive APIs.** Pin the server's public key (not the full certificate) for APIs that handle authentication, payments, or personal data. Include a backup pin for certificate rotation.

- [ ] **8. No sensitive data in URLs.** Tokens and credentials must be in headers or request bodies, never in URL query parameters. URLs appear in server logs, proxy logs, and browser history.

- [ ] **9. Server responses validated.** Don't blindly trust server responses. Validate JSON structure, check for expected fields, and handle malformed responses without crashing.

## Authentication

- [ ] **10. Biometric authentication implemented correctly.** Use `LAContext` with `.deviceOwnerAuthenticationWithBiometrics` and always provide a passcode fallback. Never cache the biometric result — re-evaluate each time.

- [ ] **11. Session tokens expire and rotate.** Access tokens should have short expiration (15-60 minutes). Use refresh tokens stored in Keychain to get new access tokens. Rotate refresh tokens on use.

- [ ] **12. Sign in with Apple offered (if using third-party login).** Required by App Store guidelines if you offer any social login (Google, Facebook, etc.). Must be presented with equal prominence.

## Privacy

- [ ] **13. Privacy manifest included (PrivacyInfo.xcprivacy).** Required if using UserDefaults, file timestamps, disk space, boot time, or other required-reason APIs. Declare all data collection, tracking domains, and third-party SDK usage.

- [ ] **14. Minimal permission requests.** Only request permissions the app actively uses. Request at the point of use, not on first launch. Use the minimum level (e.g., "When In Use" location instead of "Always").

- [ ] **15. Purpose strings are specific and honest.** Every permission request (`NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, etc.) must explain exactly why the app needs access. Generic strings ("This app needs your location") lead to rejection and user distrust.

- [ ] **16. Analytics and tracking are disclosed.** If using Firebase Analytics, Mixpanel, or similar, declare it in your privacy manifest and App Store privacy labels. If tracking across apps or websites, show the ATT (App Tracking Transparency) prompt.

## App Integrity

- [ ] **17. Debug logging disabled in production.** Use `#if DEBUG` guards around all `print()` and `NSLog()` calls. Never log tokens, passwords, personal data, or API keys in any build configuration.

- [ ] **18. App switcher screenshot protection.** Add a blur or placeholder view when the app enters the background (`willResignActiveNotification`) to prevent sensitive content from appearing in the app switcher.

- [ ] **19. Input validation on all user input.** Validate and sanitize text fields, especially those sent to APIs. Guard against excessively long strings, special characters that could cause injection, and unexpected data types.

- [ ] **20. Third-party SDK audit.** Review all third-party SDKs for known vulnerabilities, excessive permissions, and data collection practices. Keep them updated. Remove SDKs you no longer use. Check that each SDK includes its own privacy manifest (required since 2024).

## Quick Priority Guide

| Priority | Items | Why |
|----------|-------|-----|
| **Do first** | 1, 2, 6, 13 | Prevent data leaks and App Store rejection |
| **Do before release** | 3, 5, 10, 11, 14, 15, 17 | Core security and privacy compliance |
| **Do for production** | 4, 7, 8, 9, 12, 16, 18, 19, 20 | Defense in depth and polish |

## Automated Checks

Some items can be verified automatically:

```bash
# Search for hardcoded secrets (item 1)
grep -rn "Bearer " --include="*.swift" .
grep -rn "apiKey\s*=" --include="*.swift" .
grep -rn "password\s*=" --include="*.swift" .
grep -rn "sk-" --include="*.swift" .

# Search for UserDefaults storing sensitive data (item 2)
grep -rn "UserDefaults.*token\|UserDefaults.*password\|UserDefaults.*key\|UserDefaults.*secret" --include="*.swift" .

# Search for NSAllowsArbitraryLoads (item 6)
grep -rn "NSAllowsArbitraryLoads" --include="*.plist" .

# Search for print statements without DEBUG guard (item 17)
grep -rn "print(" --include="*.swift" . | grep -v "#if DEBUG" | grep -v "// debug"

# Check for PrivacyInfo.xcprivacy (item 13)
find . -name "PrivacyInfo.xcprivacy" | head -1 || echo "WARNING: No privacy manifest found"
```
