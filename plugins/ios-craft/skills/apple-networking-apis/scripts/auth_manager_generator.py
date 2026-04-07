#!/usr/bin/env python3
"""
auth_manager_generator.py
-------------------------
Generate a Swift AuthManager that supports OAuth 2.0 (Authorization Code + PKCE
or Client Credentials) and JWT bearer tokens, with Keychain-backed storage and
single-flight refresh deduplication.

Usage examples:
  python auth_manager_generator.py --flow pkce \
    --auth-url https://idp.example.com/authorize \
    --token-url https://idp.example.com/oauth/token \
    --client-id abc123 --redirect com.acme.app:/oauth \
    --scopes "openid profile offline_access" \
    --out swift/AuthManager.swift

  python auth_manager_generator.py --flow client_credentials \
    --token-url https://idp.example.com/oauth/token \
    --client-id service-cli --client-secret env:OAUTH_SECRET \
    --out swift/AuthManagerService.swift
"""
import argparse, os, base64, secrets, textwrap, datetime

SWIFT = """// GENERATED: {ts}
import Foundation
import AuthenticationServices
import Security
#if canImport(CryptoKit)
import CryptoKit
#endif

public actor AuthManager {{
    public enum Flow {{
        case pkce(authURL: URL, tokenURL: URL, clientId: String, redirectScheme: String, scopes: [String])
        case clientCredentials(tokenURL: URL, clientId: String, clientSecret: String, scopes: [String])
        case jwtBearer(tokenURL: URL, assertion: () async throws -> String, scopes: [String])
    }}

    public struct Token: Codable {{
        public var accessToken: String
        public var refreshToken: String?
        public var expiresAt: Date? // absolute expiry
    }}

    private let flow: Flow
    private let keychainService = "{keychain_service}"
    private let keychainAccount = "{keychain_account}"
    private var token: Token? = nil
    private var refreshing: Task<Token, Error>? = nil

    public init(flow: Flow) {{
        self.flow = flow
        self.token = try? Self.loadFromKeychain(service: keychainService, account: keychainAccount)
    }}

    public func currentAccessToken() -> String? { token?.accessToken }

    public func inject(into request: inout URLRequest) async {{
        if let t = try? await validToken(), let val = t.accessToken as String? {{
            request.setValue("Bearer \\(val)", forHTTPHeaderField: "Authorization")
        }}
    }}

    public func clear() {{
        token = nil
        try? Self.deleteFromKeychain(service: keychainService, account: keychainAccount)
    }}

    // MARK: - Login / Refresh

    public func login(from viewController: ASWebAuthenticationPresentationContextProviding?) async throws {{
        switch flow {{
        case let .pkce(authURL, tokenURL, clientId, redirectScheme, scopes):
            let (code, codeVerifier) = try await Self.pkceAuthorize(authURL: authURL, clientId: clientId, redirectScheme: redirectScheme, scopes: scopes, presenter: viewController)
            let t = try await Self.exchangeCode(tokenURL: tokenURL, clientId: clientId, code: code, codeVerifier: codeVerifier, redirectScheme: redirectScheme)
            try await setToken(t)
        default:
            return
        }}
    }}

    public func validToken() async throws -> Token {{
        if let t = token, let exp = t.expiresAt, exp.timeIntervalSinceNow > 120 {{ // safety window
            return t
        }}
        if let refreshing = refreshing {{
            return try await refreshing.value
        }}
        let t = Task<Token, Error> {{
            let newToken = try await refreshOrAcquire()
            try await setToken(newToken)
            return newToken
        }}
        refreshing = t
        defer {{ refreshing = nil }}
        return try await t.value
    }}

    private func refreshOrAcquire() async throws -> Token {{
        switch flow {{
        case let .pkce(_, tokenURL, clientId, _, _):
            guard let rt = token?.refreshToken else {{ throw NSError(domain: "Auth", code: 401) }}
            return try await Self.refreshToken(tokenURL: tokenURL, clientId: clientId, refreshToken: rt)
        case let .clientCredentials(tokenURL, clientId, clientSecret, scopes):
            return try await Self.clientCredentials(tokenURL: tokenURL, clientId: clientId, clientSecret: clientSecret, scopes: scopes)
        case let .jwtBearer(tokenURL, assertion, scopes):
            let jwt = try await assertion()
            return try await Self.jwtBearer(tokenURL: tokenURL, assertion: jwt, scopes: scopes)
        }}
    }}

    private func setToken(_ t: Token) async throws {{
        token = t
        try Self.saveToKeychain(t, service: keychainService, account: keychainAccount)
    }}

    // MARK: - PKCE helpers

    private static func pkceAuthorize(authURL: URL, clientId: String, redirectScheme: String, scopes: [String], presenter: ASWebAuthenticationPresentationContextProviding?) async throws -> (code: String, verifier: String) {{
        let verifier = randomURLSafe(32)
        let challenge = sha256Base64(verifier)
        var comps = URLComponents(url: authURL, resolvingAgainstBaseURL: false)!
        comps.queryItems = [
            .init(name: "response_type", value: "code"),
            .init(name: "client_id", value: clientId),
            .init(name: "redirect_uri", value: "\(redirectScheme)://oauth/callback"),
            .init(name: "scope", value: scopes.joined(separator: " ")),
            .init(name: "code_challenge", value: challenge),
            .init(name: "code_challenge_method", value: "S256")
        ]
        let callback = "\(redirectScheme)://oauth/callback"
        let session = ASWebAuthenticationSession(url: comps.url!, callbackURLScheme: redirectScheme) {{ url, err in }}
        if let provider = presenter { session.presentationContextProvider = provider }
        return try await withCheckedThrowingContinuation {{ (cont: CheckedContinuation<(String,String), Error>) in
            let s = ASWebAuthenticationSession(url: comps.url!, callbackURLScheme: redirectScheme) {{ url, err in
                if let err = err {{ cont.resume(throwing: err); return }}
                guard let url = url, let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems,
                      let code = items.first(where: {{ $0.name == "code" }})?.value else {{
                    cont.resume(throwing: NSError(domain:"Auth", code: -1, userInfo:[NSLocalizedDescriptionKey:"Missing auth code"])) ; return
                }}
                cont.resume(returning: (code, verifier))
            }}
            s.prefersEphemeralWebBrowserSession = true
            s.start()
        }}
    }}

    private static func exchangeCode(tokenURL: URL, clientId: String, code: String, codeVerifier: String, redirectScheme: String) async throws -> Token {{
        var req = URLRequest(url: tokenURL)
        req.httpMethod = "POST"
        let body = [
            "grant_type":"authorization_code",
            "client_id": clientId,
            "code": code,
            "code_verifier": codeVerifier,
            "redirect_uri": "\(redirectScheme)://oauth/callback"
        ].map {{ "\($0.key)=\($0.value)" }}.joined(separator: "&").data(using: .utf-8)!
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
        let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
        return Token(accessToken: decoded.access_token, refreshToken: decoded.refresh_token, expiresAt: Date().addingTimeInterval(TimeInterval(decoded.expires_in ?? 3600)))
    }}

    private static func refreshToken(tokenURL: URL, clientId: String, refreshToken: String) async throws -> Token {{
        var req = URLRequest(url: tokenURL)
        req.httpMethod = "POST"
        let body = [
            "grant_type": "refresh_token",
            "client_id": clientId,
            "refresh_token": refreshToken
        ].map {{ "\($0.key)=\($0.value)" }}.joined(separator: "&").data(using: .utf-8)!
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
        let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
        return Token(accessToken: decoded.access_token, refreshToken: decoded.refresh_token ?? refreshToken, expiresAt: Date().addingTimeInterval(TimeInterval(decoded.expires_in ?? 3600)))
    }}

    private static func clientCredentials(tokenURL: URL, clientId: String, clientSecret: String, scopes: [String]) async throws -> Token {{
        var req = URLRequest(url: tokenURL)
        req.httpMethod = "POST"
        let basic = Data("\\(clientId):\\(clientSecret)".utf8).base64EncodedString()
        req.setValue("Basic \\(basic)", forHTTPHeaderField: "Authorization")
        let body = [
            "grant_type": "client_credentials",
            "scope": scopes.joined(separator: " ")
        ].map {{ "\($0.key)=\($0.value)" }}.joined(separator: "&").data(using: .utf-8)!
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
        let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
        return Token(accessToken: decoded.access_token, refreshToken: decoded.refresh_token, expiresAt: Date().addingTimeInterval(TimeInterval(decoded.expires_in ?? 3600)))
    }}

    private static func jwtBearer(tokenURL: URL, assertion: String, scopes: [String]) async throws -> Token {{
        var req = URLRequest(url: tokenURL)
        req.httpMethod = "POST"
        let body = [
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
            "scope": scopes.joined(separator: " ")
        ].map {{ "\($0.key)=\($0.value)" }}.joined(separator: "&").data(using: .utf-8)!
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
        let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
        return Token(accessToken: decoded.access_token, refreshToken: decoded.refresh_token, expiresAt: Date().addingTimeInterval(TimeInterval(decoded.expires_in ?? 3600)))
    }}

    // MARK: - Keychain
    private static func saveToKeychain(_ token: Token, service: String, account: String) throws {{
        let data = try JSONEncoder().encode(token)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {{ throw NSError(domain:"Keychain", code: Int(status)) }}
    }}

    private static func loadFromKeychain(service: String, account: String) throws -> Token? {{
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else {{ return nil }}
        return try? JSONDecoder().decode(Token.self, from: data)
    }}

    private static func deleteFromKeychain(service: String, account: String) throws {{
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
    }}

    // MARK: - utils
    private struct TokenResponse: Codable {{ let access_token: String; let refresh_token: String?; let expires_in: Int? }}

    private static func randomURLSafe(_ length: Int) -> String {{
        let bytes = (0..<length).map {{ _ in UInt8.random(in: 0...255) }}
        return Data(bytes).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }}

    private static func sha256Base64(_ input: String) -> String {{
        #if canImport(CryptoKit)
        import CryptoKit
        let digest = SHA256.hash(data: Data(input.utf8))
        return Data(digest).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        #else
        // Fallback non-cryptographic (development only). Recommend CryptoKit in production.
        return randomURLSafe(43)
        #endif
    }}
}}
"""

def main():
    ap = argparse.ArgumentParser(description="Generate a Swift AuthManager with OAuth/JWT support.")
    ap.add_argument("--flow", choices=["pkce","client_credentials","jwt_bearer"], required=False, help="Default flow (docs only; generated code supports all).")
    ap.add_argument("--out", required=True, help="Output .swift path")
    ap.add_argument("--keychain-service", default="com.example.app.auth", help="Keychain service name")
    ap.add_argument("--keychain-account", default="token", help="Keychain account key")
    args = ap.parse_args()
    code = SWIFT.format(ts=datetime.datetime.utcnow().isoformat()+"Z",
                        keychain_service=args.keychain_service,
                        keychain_account=args.keychain_account)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(code)
    print(f"[ok] Wrote AuthManager to {args.out}")

if __name__ == "__main__":
    main()
