---
name: ios-security-hardening
description: >
  Security best practices for iOS apps. Use for Keychain setup, certificate pinning,
  biometric auth, secure data storage, and vulnerability prevention. Consolidated
  security checklist for beginners.
---

# iOS Security Hardening

Guide the user through securing their iOS app from common vulnerabilities. Focus on practical, implementable patterns rather than theoretical security concepts.

## Workflow

### 1. Keychain for Secrets

**Never store sensitive data in UserDefaults, plists, or plain files.** UserDefaults is an unencrypted plist — anyone with device access (or a backup) can read it.

Use the Keychain for:
- Authentication tokens
- API keys
- Passwords
- Encryption keys
- Any secret the user or your server trusts you to protect

See `references/keychain-patterns.md` for a complete wrapper implementation.

Quick usage:

```swift
// Save a token
try KeychainHelper.save(token.data(using: .utf8)!, for: "auth-token")

// Load a token
if let data = try KeychainHelper.load(for: "auth-token"),
   let token = String(data: data, encoding: .utf8) {
    // Use token
}

// Delete on logout
try KeychainHelper.delete(for: "auth-token")
```

**Key rules:**
- Keychain data persists across app reinstalls (this is intentional — handle it)
- Use `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` for most secrets
- Use `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` for background refresh tokens

### 2. Certificate Pinning

Certificate pinning prevents man-in-the-middle attacks by verifying that the server's certificate matches one you expect.

**When to pin:**
- Banking, health, or financial apps (strongly recommended)
- Any app handling highly sensitive data
- Apps communicating with your own API server

**When NOT to pin:**
- Apps that only talk to well-known public APIs (Google, Apple, AWS)
- During early development (it complicates debugging)

**Implementation with URLSession:**

```swift
class PinnedSessionDelegate: NSObject, URLSessionDelegate {
    // SHA-256 hash of your server's public key
    let pinnedKeyHash = "base64EncodedHashOfYourPublicKey"

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard let serverTrust = challenge.protectionSpace.serverTrust,
              let serverCert = SecTrustCopyCertificateChain(serverTrust) as? [SecCertificate],
              let serverKey = SecCertificateCopyKey(serverCert[0]) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        let serverKeyData = SecKeyCopyExternalRepresentation(serverKey, nil)! as Data
        let serverKeyHash = sha256(serverKeyData).base64EncodedString()

        if serverKeyHash == pinnedKeyHash {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}
```

**Pin the public key, not the certificate.** Certificates rotate; public keys change less frequently.

### 3. App Transport Security (ATS)

ATS enforces HTTPS for all network connections by default. Do not weaken it.

```xml
<!-- Info.plist — DO NOT DO THIS in production -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>  <!-- This disables ALL security. Never ship this. -->
</dict>
```

**If you must allow HTTP for a specific domain** (e.g., a legacy API you don't control):

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSExceptionDomains</key>
    <dict>
        <key>legacy-api.example.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

Apple will ask you to justify any ATS exceptions during App Review.

### 4. Biometric Authentication (Face ID / Touch ID)

Use `LocalAuthentication` framework:

```swift
import LocalAuthentication

func authenticateWithBiometrics() async -> Bool {
    let context = LAContext()
    var error: NSError?

    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
        // Biometrics not available — fall back to passcode
        return await authenticateWithPasscode(context: context)
    }

    do {
        let success = try await context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: "Unlock your vault"  // Shown in the prompt
        )
        return success
    } catch {
        return false
    }
}

func authenticateWithPasscode(context: LAContext) async -> Bool {
    do {
        return try await context.evaluatePolicy(
            .deviceOwnerAuthentication,  // Includes passcode fallback
            localizedReason: "Unlock your vault"
        )
    } catch {
        return false
    }
}
```

**Required Info.plist key:**

```xml
<key>NSFaceIDUsageDescription</key>
<string>Authenticate to access your secure data</string>
```

**Key rules:**
- Always provide a passcode fallback
- Never store the biometric result — always re-evaluate
- Use `.deviceOwnerAuthenticationWithBiometrics` for biometric-only, `.deviceOwnerAuthentication` for biometric + passcode
- Combine with Keychain's `.biometryCurrentSet` for Keychain items that require biometric auth

### 5. Secure Data at Rest

| Data Type | Storage Method | Why |
|-----------|---------------|-----|
| Auth tokens, API keys | Keychain | Hardware-encrypted, access controlled |
| User preferences (non-sensitive) | UserDefaults | Convenient, not sensitive |
| Large sensitive files | Encrypted file with `FileProtectionType.complete` | OS-level encryption |
| Database with sensitive records | Core Data + `NSPersistentStoreFileProtectionKey` | Encrypted SQLite |
| Temporary sensitive data | Memory only, zero on dealloc | Never persisted |

**File Protection:**

```swift
// Write a file with complete protection (only accessible when device is unlocked)
try data.write(to: fileURL, options: [.completeFileProtection])

// Core Data with encryption
let description = NSPersistentStoreDescription()
description.setOption(
    FileProtectionType.complete as NSObject,
    forKey: NSPersistentStoreFileProtectionKey
)
```

**Clipboard security:**

```swift
// Set expiration on sensitive clipboard content
UIPasteboard.general.setItems(
    [[UIPasteboard.typeAutomatic: sensitiveString]],
    options: [.expirationDate: Date().addingTimeInterval(60)]  // Expires in 60 seconds
)

// Or use local-only pasteboard (not shared with other devices)
UIPasteboard.general.setItems(
    [[UIPasteboard.typeAutomatic: sensitiveString]],
    options: [.localOnly: true]
)
```

### 6. Common Vulnerabilities

**Jailbreak detection** (optional, for high-security apps):

```swift
func isJailbroken() -> Bool {
    #if targetEnvironment(simulator)
    return false
    #else
    let paths = [
        "/Applications/Cydia.app",
        "/usr/sbin/sshd",
        "/etc/apt",
        "/private/var/lib/apt/"
    ]
    for path in paths {
        if FileManager.default.fileExists(atPath: path) {
            return true
        }
    }
    // Check if app can write outside sandbox
    let testPath = "/private/test_jailbreak"
    do {
        try "test".write(toFile: testPath, atomically: true, encoding: .utf8)
        try FileManager.default.removeItem(atPath: testPath)
        return true
    } catch {
        return false
    }
    #endif
}
```

**Prevent screenshot capture** (for sensitive screens):

```swift
// In your sensitive view controller
override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    // Add a blur when app goes to background (prevents screenshot in app switcher)
    NotificationCenter.default.addObserver(
        self,
        selector: #selector(addBlur),
        name: UIApplication.willResignActiveNotification,
        object: nil
    )
    NotificationCenter.default.addObserver(
        self,
        selector: #selector(removeBlur),
        name: UIApplication.didBecomeActiveNotification,
        object: nil
    )
}
```

**Disable logging in production:**

```swift
func secureLog(_ message: String) {
    #if DEBUG
    print(message)
    #endif
}
// Never log tokens, passwords, or personal data even in debug
```

### 7. Security Checklist

See `references/security-checklist.md` for the complete 20-item checklist.

## When to Go Deeper

This guide covers the essentials. For apps handling financial, health, or government data, also consider:
- Advanced certificate pinning with backup pins
- Runtime integrity checks
- Encrypted Core Data with custom key management
- Server-side token rotation
- Obfuscation (though security through obscurity is never a primary defense)
