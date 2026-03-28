---
name: ship-it
description: App Store submission checklist and guided workflow
---

Use the ios-app-store-submission skill to walk through the complete App Store submission pipeline.

Run through every step of the release checklist:

1. **Pre-flight** — Version and build numbers correct? All tests passing? No debug code? App icons complete? Launch screen configured?

2. **Security scan** — Run the ios-security-hardening check: no hardcoded API keys, no test credentials, proper encryption for sensitive data, ATS configured correctly.

3. **Code signing** — Verify distribution certificate, provisioning profile, entitlements, and capabilities all match. Walk through any signing issues.

4. **Archive** — Clean build, archive for App Store distribution, validate the archive.

5. **Metadata review** — Check app name, subtitle, keywords, description, screenshots (all required sizes), privacy policy URL, age rating, and privacy nutrition labels.

6. **Common rejection check** — Scan for the top rejection reasons: missing purpose strings, placeholder content, broken links, missing demo account credentials, external payment references.

7. **Upload and TestFlight** — Upload the build, set up internal testing, verify it installs and runs correctly on TestFlight.

8. **Submit** — Walk through the App Store Connect submission, set expectations for review timeline.

At each step, explain what you're checking and why it matters. Stop and fix any issues before proceeding to the next step.
