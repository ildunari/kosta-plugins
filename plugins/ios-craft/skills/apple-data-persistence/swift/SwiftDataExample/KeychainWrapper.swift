import Foundation
import Security

public enum KeychainAccessibility: String {
    case whenUnlocked = "kSecAttrAccessibleWhenUnlocked"
    case afterFirstUnlock = "kSecAttrAccessibleAfterFirstUnlock"
    case whenUnlockedThisDeviceOnly = "kSecAttrAccessibleWhenUnlockedThisDeviceOnly"
}

public struct Keychain {
    public static func set(_ data: Data, service: String, account: String, accessGroup: String? = nil,
                           accessible: CFString = kSecAttrAccessibleWhenUnlocked) throws {
        var query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecAttrAccessible: accessible,
            kSecValueData: data
        ]
        if let ag = accessGroup { query[kSecAttrAccessGroup] = ag }
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else { throw NSError(domain: NSOSStatusErrorDomain, code: Int(status)) }
    }

    public static func get(service: String, account: String, accessGroup: String? = nil) throws -> Data? {
        var query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne
        ]
        if let ag = accessGroup { query[kSecAttrAccessGroup] = ag }
        var out: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &out)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw NSError(domain: NSOSStatusErrorDomain, code: Int(status)) }
        return (out as? Data)
    }

    public static func delete(service: String, account: String, accessGroup: String? = nil) throws {
        var query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: account
        ]
        if let ag = accessGroup { query[kSecAttrAccessGroup] = ag }
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
        }
    }
}
