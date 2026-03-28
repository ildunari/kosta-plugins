---
name: security-scan
description: Security audit for hardcoded secrets, missing encryption, and common vulnerabilities
---

Use the ios-security-hardening skill to perform a comprehensive security audit.

Scan the entire project for:

1. **Hardcoded secrets** — Search for API keys, tokens, passwords, and credentials in source code, Info.plist, and configuration files. Check string literals, comments, and even variable names that suggest secrets. These should be in the Keychain, environment variables, or a secure configuration system — never in source.

2. **Network security** — Verify App Transport Security (ATS) is not globally disabled. If there are ATS exceptions, check that each one is justified. Verify that all API calls use HTTPS. Check for certificate pinning on sensitive endpoints.

3. **Data at rest** — Sensitive data (user tokens, personal information) should be in the Keychain, not UserDefaults or plain files. Check that Core Data or SwiftData stores containing personal data use encryption.

4. **Authentication** — Verify token storage is secure, refresh token flows handle expiration correctly, biometric authentication (if used) has proper fallback, and logout clears all sensitive data.

5. **Input validation** — Check that user input is validated before use, especially in URLs, database queries, and display (preventing injection and XSS in web views).

6. **Logging** — Verify that sensitive data (tokens, passwords, personal information) is never printed to the console or written to log files.

7. **Third-party dependencies** — Check for known vulnerabilities in SPM packages. Verify that dependencies are pinned to specific versions, not floating.

8. **Privacy** — Verify all required purpose strings are present and descriptive (camera, location, photos, contacts, etc.). Check that privacy nutrition labels in App Store Connect match actual data collection.

Report findings by severity: critical (exposed secrets, disabled security), high (missing encryption, insecure storage), medium (logging concerns, unpinned dependencies), and low (best practice improvements). Provide the specific fix for each finding.
