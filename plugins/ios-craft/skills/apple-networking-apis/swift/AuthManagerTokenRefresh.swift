import Foundation
import Security

public actor TokenManager {
    public struct Token: Codable { public var access: String; public var refresh: String?; public var expiresAt: Date? }
    private var token: Token?
    private var refreshing: Task<Token, Error>? = nil
    public init() { self.token = try? Self.load() }

    public func accessToken() async throws -> String {
        let t = try await validToken()
        return t.access
    }

    public func set(_ t: Token) async throws {
        token = t
        try Self.save(t)
    }

    public func clear() {
        token = nil
        try? Self.delete()
    }

    public func validToken() async throws -> Token {
        if let t = token, let exp = t.expiresAt, exp.timeIntervalSinceNow > 60 { return t }
        if let r = refreshing { return try await r.value }
        let task = Task<Token, Error> {
            // Replace with actual refresh call
            guard let old = token, let refresh = old.refresh else { throw URLError(.userAuthenticationRequired) }
            let new = Token(access: "new-\(refresh)", refresh: refresh, expiresAt: Date().addingTimeInterval(3600))
            try await set(new); return new
        }
        refreshing = task
        defer { refreshing = nil }
        return try await task.value
    }

    // Keychain helpers (simple demo; see generator for production variant)
    private static let svc = "com.example.app.auth"; private static let acct = "token"
    private static func save(_ t: Token) throws {
        let data = try JSONEncoder().encode(t)
        let q: [String:Any] = [kSecClass as String:kSecClassGenericPassword,
                               kSecAttrService as String: svc,
                               kSecAttrAccount as String: acct,
                               kSecValueData as String: data]
        SecItemDelete(q as CFDictionary); let s = SecItemAdd(q as CFDictionary, nil)
        guard s == errSecSuccess else { throw NSError(domain:"Keychain", code:Int(s)) }
    }
    private static func load() throws -> Token? {
        let q: [String:Any] = [kSecClass as String:kSecClassGenericPassword,
                               kSecAttrService as String: svc,
                               kSecAttrAccount as String: acct,
                               kSecReturnData as String:true]
        var item: CFTypeRef?; let s = SecItemCopyMatching(q as CFDictionary, &item)
        guard s == errSecSuccess, let data = item as? Data else { return nil }
        return try? JSONDecoder().decode(Token.self, from: data)
    }
    private static func delete() throws {
        let q: [String:Any] = [kSecClass as String:kSecClassGenericPassword,
                               kSecAttrService as String: svc,
                               kSecAttrAccount as String: acct]
        SecItemDelete(q as CFDictionary)
    }
}
