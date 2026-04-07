# Authentication Flows (iOS/macOS)

This document complements `AuthManager*` by detailing recommended flows.

## OAuth 2.1 Authorization Code + PKCE (Recommended)

**Why**: OAuth 2.1 consolidates and strengthens the OAuth 2.0 specification. It mandates Proof Key for Code Exchange (PKCE) for all native apps and removes the implicit grant flow, making it the most secure and recommended approach for user sign‑in on iOS and macOS【964654021945925†L61-L80】.

**Steps**:
1. Generate a random PKCE verifier and derive its SHA‑256 challenge.
2. Launch an `ASWebAuthenticationSession` with `response_type=code`, the generated `code_challenge=S256` and your client ID. Ensure that the redirect URI exactly matches the one registered for your app.
3. After the user authorizes, receive the redirect (for example, `myapp://oauth/callback?code=…`).
4. POST to the token endpoint with the `code`, `code_verifier`, `client_id` and `redirect_uri` to obtain an `access_token` and `refresh_token`.
5. Store tokens securely in the Keychain; never persist them in plain files or UserDefaults【544542894411502†L112-L140】.
6. Use short‑lived access tokens (5–15 minutes) and rotate refresh tokens on every use【544542894411502†L168-L174】【964654021945925†L139-L179】.
7. Proactively refresh tokens shortly before expiry and implement single‑flight refresh logic to prevent token storms.

**Gotchas**:
- Register a custom URL scheme or Universal Link and use it consistently; many providers require explicit scopes such as `openid`, `profile` and `offline_access`.
- The implicit grant flow is deprecated; always use the authorization code + PKCE flow and enforce an exact redirect URI match【964654021945925†L61-L80】.
- Enforce TLS 1.2 or 1.3 and App Transport Security (ATS) for all auth endpoints; never disable certificate validation.
- On macOS, ensure the app has proper entitlements for Keychain and networking access.

## Client Credentials (Device‑to‑Service)

**Use sparingly** on end‑user devices; prefer server mediation. If you must:
- Store the client secret in the Secure Enclave or Keychain and never hard‑code secrets in your binary.
- Use narrow scopes and short lifetimes, and rotate both tokens and client secrets frequently.

## JWT Bearer

When an external IdP issues short‑lived client assertions:
- Implement `assertion()` to sign a JWT with your private key using a strong algorithm such as RS256 or ES256 and minimal claims【544542894411502†L112-L140】.
- Exchange it via `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` and validate the signature, expiration, issuer and audience on the server.
- Rotate signing keys regularly and keep assertions short‑lived. Pair JWTs with refresh tokens when appropriate and rotate refresh tokens on each exchange【544542894411502†L168-L174】.

## Keychain & Refresh Strategy

Use `kSecClassGenericPassword` with `kSecAttrService` and `kSecAttrAccount` to scope entries. Always set `kSecAttrAccessible` appropriately (for example `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`) and handle `errSecDuplicateItem` by updating existing entries. Use Access Groups to share tokens with extensions (same TeamID) and never store tokens in `UserDefaults` or plaintext files【544542894411502†L112-L140】.

### Refresh Strategy

- Single-flight: ensure only one refresh runs; other callers await the same Task.
- If refresh fails with 400/invalid_grant → prompt re-login and clear tokens.
- Add a safety window (buffer) to avoid racing expiry under clock skew.

