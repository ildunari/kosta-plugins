# Code Signing Explained for Beginners

## The Analogy

Think of publishing an iOS app like getting a book into a library:

| Concept | Real-World Analogy | What It Actually Is |
|---------|-------------------|---------------------|
| **Certificate** | Your author ID card | A cryptographic key pair that proves your identity to Apple |
| **Provisioning Profile** | A permission slip from the library | A file that ties your certificate + app + devices together |
| **Signing** | Stamping your name on every page | Cryptographically sealing your app so nobody can tamper with it |
| **App ID** | The book's ISBN number | Your app's unique identifier (Bundle ID) |
| **Team ID** | Your publisher's license | A 10-character ID Apple assigns to your developer account |

## How They Relate

```
┌─────────────────────────────────────────────────┐
│              PROVISIONING PROFILE                │
│                                                  │
│  ┌──────────────┐    ┌─────────────────────┐    │
│  │  Certificate │    │      App ID          │    │
│  │  (WHO you    │    │  (WHAT app this is)  │    │
│  │   are)       │    │                      │    │
│  └──────┬───────┘    └──────────┬──────────┘    │
│         │                       │                │
│         └───────────┬───────────┘                │
│                     │                            │
│         ┌───────────▼──────────┐                 │
│         │   Device List        │                 │
│         │   (WHERE it can run) │                 │
│         │                      │                 │
│         │   • Your iPhone      │                 │
│         │   • Tester's iPad    │                 │
│         │   • (App Store =     │                 │
│         │     all devices)     │                 │
│         └──────────────────────┘                 │
└─────────────────────────────────────────────────┘
```

## Two Kinds of Certificates

| Certificate | Purpose | When You Need It |
|-------------|---------|-----------------|
| **Development** | Run the app on your own devices during development | Always — Xcode creates this automatically |
| **Distribution** | Submit to TestFlight or the App Store | When you archive for distribution — Xcode handles this too |

You don't manually create these with automatic signing. Xcode does it behind the scenes.

## Automatic vs Manual Signing

### Automatic Signing (Recommended for Beginners)

```
Xcode → Target → Signing & Capabilities
  ✓ "Automatically manage signing"
  ✓ Select your Team
  → Xcode handles everything
```

**Pros:**
- Zero configuration
- Xcode creates, renews, and manages certificates and profiles
- Works perfectly for solo developers and small teams

**Cons:**
- Less control over which certificate is used
- Can be confusing in multi-team setups
- Not ideal for CI/CD (build machines need different handling)

### Manual Signing (Advanced)

You explicitly choose which certificate and profile to use. Required when:

- You have a CI/CD pipeline (GitHub Actions, Fastlane)
- Multiple teams share the same app
- Enterprise distribution
- You need to pin a specific certificate

**How manual signing works:**
1. Create certificates in Apple Developer Portal → Certificates
2. Create provisioning profiles in Certificates → Profiles
3. Download and install them
4. In Xcode, uncheck "Automatically manage signing"
5. Select the specific profile for Debug and Release

## Common Signing Problems and Fixes

### "No signing certificate found"
Your Mac doesn't have the private key for the certificate.
- **Fix**: Xcode → Settings → Accounts → Your Team → Manage Certificates → + button

### "Provisioning profile doesn't include signing certificate"
The profile was made with a different certificate than the one on your Mac.
- **Fix (automatic)**: Toggle automatic signing off and back on
- **Fix (manual)**: Regenerate the profile in Apple Developer Portal

### "The certificate has been revoked"
Someone on your team revoked the certificate, or it expired.
- **Fix**: Create a new certificate in Xcode → Settings → Accounts → Manage Certificates

### "No profiles for 'com.yourapp' were found"
The Bundle ID doesn't have a matching App ID registered.
- **Fix (automatic)**: Xcode registers it for you — just make sure you're signed in
- **Fix (manual)**: Create the App ID in Apple Developer Portal → Identifiers

## The Keychain Connection

Certificates live in your Mac's Keychain:
- Open **Keychain Access** → login → My Certificates
- You should see "Apple Development: your@email.com" and/or "Apple Distribution: your@email.com"
- Each certificate has a **private key** (the triangle expands to show it)
- If the private key is missing, the certificate is useless on this Mac

**Transferring to a new Mac:**
- Automatic signing: Just sign into your Apple ID in Xcode — new certificates are created
- Manual signing: Export the certificate + private key from Keychain as a .p12 file, import on the new Mac

## Quick Reference

```
Do I need to worry about signing?
  └─ Using automatic signing?
       ├─ Yes → You're fine. Xcode handles it.
       └─ No → Why not? (CI/CD, team, enterprise?)
            └─ Read the manual signing section above
```
