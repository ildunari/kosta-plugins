# App Store Metadata Template

Fill in each field below. Character limits are enforced by App Store Connect.

## App Information (Set Once)

| Field | Your Value | Limit | Notes |
|-------|-----------|-------|-------|
| **App Name** | | 30 chars | Displayed on the App Store. Must be unique across all apps. |
| **Subtitle** | | 30 chars | Shown below the name in search results. Use for key differentiator. |
| **Bundle ID** | | — | Must match Xcode exactly. Cannot be changed after first submission. |
| **SKU** | | — | Internal reference only. Not visible to users. e.g., `myapp-2024-v1` |
| **Primary Category** | | — | Choose the best fit. Affects where the app appears in Browse. |
| **Secondary Category** | | — | Optional but recommended. Broader discovery. |
| **Content Rights** | | — | Does the app contain third-party content? If yes, you need proof of rights. |

## Version Information (Set Per Release)

### Text Fields

**App Description** (4000 chars max)
```
[First sentence is the most important — it shows in search results before "more"]

[Paragraph 1: What the app does and who it's for — 2-3 sentences]

[Paragraph 2: Key features as a short list]
• Feature one
• Feature two
• Feature three

[Paragraph 3: What makes it different — 1-2 sentences]

[Final line: Call to action or social proof]
```

Best practices:
- Lead with the value proposition, not the feature list
- Don't stuff keywords — Apple's algorithm penalizes this
- Don't mention pricing (it changes and looks stale)
- Don't reference specific iOS versions
- Don't say "new" for features that will age

**Promotional Text** (170 chars max)
```
[This appears above the description. Can be updated without a new version. Use for seasonal promotions, new feature announcements, or timely messaging.]
```

**Keywords** (100 chars max, comma-separated)
```
[keyword1,keyword2,keyword3,keyword4]
```

Best practices:
- Don't repeat words from your app name (Apple already indexes those)
- Use singular forms (Apple matches both singular and plural)
- Don't use spaces after commas (wastes characters)
- Don't use competitor names (grounds for rejection)
- Think about what users would search, not what you think is cool
- Use all 100 characters

**What's New** (4000 chars max)
```
[What changed in this version. Users see this on the update screen.]

• Fixed [specific bug]
• Added [specific feature]
• Improved [specific area]
```

Best practices:
- Be specific: "Fixed crash when opening photos" not "Bug fixes"
- Lead with what users care about most
- Keep it scannable — bullet points work well

### URLs

| Field | Your URL | Required? |
|-------|---------|-----------|
| **Privacy Policy URL** | | YES — mandatory for all apps |
| **Support URL** | | YES — mandatory |
| **Marketing URL** | | No — but recommended |

Privacy policy must:
- Be publicly accessible (no login required)
- Describe what data you collect
- Describe how you use it
- Describe how users can request deletion
- Be in the same language as your app's primary language

### Review Information

| Field | Your Value | Notes |
|-------|-----------|-------|
| **Contact First Name** | | Your name or team lead |
| **Contact Last Name** | | |
| **Contact Phone** | | Include country code |
| **Contact Email** | | Where Apple can reach you |
| **Demo Account Username** | | Required if app has login |
| **Demo Account Password** | | Must work at review time |
| **Notes for Review** | | Explain anything non-obvious |

Notes for Review best practices:
- Explain how to test features that need special setup
- If the app uses location, say where to set the simulated location
- If the app uses hardware features (camera, Bluetooth), explain what the reviewer should expect
- If the app uses background modes, explain why
- Character limit: 4000

### Content Rating Questionnaire

Answer these questions honestly — wrong answers lead to rejection:

| Question | Your Answer |
|----------|-------------|
| Cartoon or fantasy violence | None / Infrequent / Frequent |
| Realistic violence | None / Infrequent / Frequent |
| Sexual content or nudity | None / Infrequent / Frequent |
| Profanity or crude humor | None / Infrequent / Frequent |
| Alcohol, tobacco, or drug use | None / Infrequent / Frequent |
| Simulated gambling | None / Infrequent / Frequent |
| Horror/fear themes | None / Infrequent / Frequent |
| Medical/treatment info | None / Infrequent / Frequent |
| Unrestricted web access | Yes / No |

If the app has user-generated content, answer "Yes" to unrestricted web access.

### Pricing

| Field | Your Value | Notes |
|-------|-----------|-------|
| **Price** | | Free, or select a price tier ($0.99, $1.99, etc.) |
| **Availability** | | Which countries/regions |
| **Pre-Order** | | Optional. Available up to 180 days before release. |

### App Privacy (Privacy Nutrition Labels)

You must declare all data types your app collects:

| Data Type | Collected? | Linked to Identity? | Used for Tracking? |
|-----------|-----------|---------------------|-------------------|
| Contact Info | | | |
| Health & Fitness | | | |
| Financial Info | | | |
| Location | | | |
| Sensitive Info | | | |
| Contacts | | | |
| User Content | | | |
| Browsing History | | | |
| Search History | | | |
| Identifiers | | | |
| Purchases | | | |
| Usage Data | | | |
| Diagnostics | | | |

Common gotchas:
- Analytics SDKs (Firebase, Mixpanel) collect "Diagnostics" and "Usage Data"
- Crash reporting collects "Diagnostics"
- If you use AdMob/ads, declare "Identifiers" linked to tracking
- Apple counts device ID as an "Identifier"

## Localization

If you support multiple languages, you need separate metadata for each:
- App name (can differ per locale)
- Subtitle
- Description
- Keywords
- Screenshots
- What's New

Minimum: Your primary language. Apple recommends localizing for your top markets.

## Final Pre-Fill Checklist

- [ ] All required fields have values
- [ ] Privacy policy URL is live and accessible
- [ ] Support URL is live and accessible
- [ ] Demo account credentials work right now
- [ ] Keywords use all 100 characters
- [ ] Description leads with value, not features
- [ ] Content rating matches actual content
- [ ] Privacy nutrition labels are accurate
- [ ] Screenshots are from the current build
