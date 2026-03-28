# Keychain Patterns

Complete Keychain wrapper for iOS with save, load, delete, biometric protection, and access groups.

## Basic Keychain Wrapper

```swift
import Foundation
import Security

enum KeychainError: Error, LocalizedError {
    case duplicateItem
    case itemNotFound
    case unexpectedStatus(OSStatus)
    case invalidData

    var errorDescription: String? {
        switch self {
        case .duplicateItem: return "Item already exists in Keychain"
        case .itemNotFound: return "Item not found in Keychain"
        case .unexpectedStatus(let status): return "Keychain error: \(status)"
        case .invalidData: return "Invalid data format"
        }
    }
}

struct KeychainHelper {

    // MARK: - Save

    /// Save data to the Keychain
    static func save(_ data: Data, for key: String, accessibility: CFString = kSecAttrAccessibleWhenUnlockedThisDeviceOnly) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: accessibility
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        switch status {
        case errSecSuccess:
            return
        case errSecDuplicateItem:
            // Item exists — update it
            try update(data, for: key)
        default:
            throw KeychainError.unexpectedStatus(status)
        }
    }

    /// Save a string to the Keychain
    static func save(_ string: String, for key: String) throws {
        guard let data = string.data(using: .utf8) else {
            throw KeychainError.invalidData
        }
        try save(data, for: key)
    }

    /// Save a Codable object to the Keychain
    static func save<T: Codable>(_ object: T, for key: String) throws {
        let data = try JSONEncoder().encode(object)
        try save(data, for: key)
    }

    // MARK: - Load

    /// Load data from the Keychain
    static func load(for key: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        switch status {
        case errSecSuccess:
            return result as? Data
        case errSecItemNotFound:
            return nil
        default:
            throw KeychainError.unexpectedStatus(status)
        }
    }

    /// Load a string from the Keychain
    static func loadString(for key: String) throws -> String? {
        guard let data = try load(for: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Load a Codable object from the Keychain
    static func loadObject<T: Codable>(for key: String) throws -> T? {
        guard let data = try load(for: key) else { return nil }
        return try JSONDecoder().decode(T.self, from: data)
    }

    // MARK: - Update

    /// Update existing Keychain item
    static func update(_ data: Data, for key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]

        let attributes: [String: Any] = [
            kSecValueData as String: data
        ]

        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)

        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    // MARK: - Delete

    /// Delete an item from the Keychain
    static func delete(for key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    /// Delete all items (use with caution — typically only on logout)
    static func deleteAll() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }
}
```

## Biometric-Protected Keychain Items

Items that require Face ID or Touch ID to access:

```swift
import LocalAuthentication

extension KeychainHelper {

    /// Save data that requires biometric authentication to access
    static func saveWithBiometrics(
        _ data: Data,
        for key: String,
        prompt: String = "Authenticate to access secure data"
    ) throws {
        // Create access control requiring biometric auth
        var error: Unmanaged<CFError>?
        guard let accessControl = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            .biometryCurrentSet,  // Invalidates if biometrics change (new face/finger enrolled)
            &error
        ) else {
            throw KeychainError.unexpectedStatus(-1)
        }

        let context = LAContext()
        context.localizedReason = prompt

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessControl as String: accessControl,
            kSecUseAuthenticationContext as String: context
        ]

        // Delete existing item first (can't update access control)
        try? delete(for: key)

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    /// Load data that is protected by biometrics
    /// The system will automatically show the biometric prompt
    static func loadWithBiometrics(
        for key: String,
        prompt: String = "Authenticate to access secure data"
    ) throws -> Data? {
        let context = LAContext()
        context.localizedReason = prompt

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecUseAuthenticationContext as String: context
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        switch status {
        case errSecSuccess:
            return result as? Data
        case errSecItemNotFound:
            return nil
        case errSecUserCanceled:
            return nil  // User cancelled biometric prompt
        default:
            throw KeychainError.unexpectedStatus(status)
        }
    }
}
```

### Biometric Access Control Options

| Flag | Behavior |
|------|----------|
| `.biometryCurrentSet` | Requires biometric auth. Invalidated if biometrics change (new finger/face enrolled). Most secure. |
| `.biometryAny` | Requires biometric auth. Survives biometric enrollment changes. |
| `.userPresence` | Biometric OR device passcode. Good fallback option. |
| `.devicePasscode` | Device passcode only (no biometric). |

**Recommended:** Use `.biometryCurrentSet` for high-security items (banking credentials) and `.userPresence` for moderate-security items (app lock).

## Access Groups (Sharing Between Apps)

Share Keychain items between apps from the same developer:

```swift
extension KeychainHelper {

    /// Save data accessible to apps in the same access group
    static func saveShared(
        _ data: Data,
        for key: String,
        accessGroup: String  // e.g., "TEAM_ID.com.yourcompany.shared"
    ) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessGroup as String: accessGroup,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        switch status {
        case errSecSuccess:
            return
        case errSecDuplicateItem:
            let updateQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrAccount as String: key,
                kSecAttrAccessGroup as String: accessGroup
            ]
            let attributes: [String: Any] = [kSecValueData as String: data]
            let updateStatus = SecItemUpdate(updateQuery as CFDictionary, attributes as CFDictionary)
            guard updateStatus == errSecSuccess else {
                throw KeychainError.unexpectedStatus(updateStatus)
            }
        default:
            throw KeychainError.unexpectedStatus(status)
        }
    }

    /// Load shared Keychain data
    static func loadShared(for key: String, accessGroup: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        switch status {
        case errSecSuccess:
            return result as? Data
        case errSecItemNotFound:
            return nil
        default:
            throw KeychainError.unexpectedStatus(status)
        }
    }
}
```

**Setup requirements for access groups:**
1. Enable "Keychain Sharing" capability in Xcode → Target → Signing & Capabilities
2. Add the access group identifier
3. Both apps must have the same Team ID and include the same access group

## Accessibility Levels Reference

| Level | Available When | Use For |
|-------|---------------|---------|
| `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` | Device unlocked, this device only | Most secrets (tokens, keys) |
| `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` | After first unlock until restart | Background refresh tokens |
| `kSecAttrAccessibleWhenUnlocked` | Device unlocked, syncs via iCloud Keychain | Cross-device shared secrets |
| `kSecAttrAccessibleAfterFirstUnlock` | After first unlock, syncs via iCloud Keychain | Cross-device background tokens |
| `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` | Passcode is set AND device unlocked | Highest security — deleted if passcode removed |

**Default recommendation:** `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` — secure and practical for most apps.

## Testing Keychain in Unit Tests

The Keychain works differently in test targets. Use a test-specific wrapper:

```swift
#if DEBUG
/// In-memory Keychain substitute for unit tests
actor MockKeychain {
    static let shared = MockKeychain()
    private var store: [String: Data] = [:]

    func save(_ data: Data, for key: String) {
        store[key] = data
    }

    func load(for key: String) -> Data? {
        store[key]
    }

    func delete(for key: String) {
        store.removeValue(forKey: key)
    }

    func clear() {
        store.removeAll()
    }
}
#endif
```
