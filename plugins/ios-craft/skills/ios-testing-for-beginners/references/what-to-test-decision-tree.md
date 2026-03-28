# What to Test: Decision Tree

Use this tree to decide whether something in your app needs a test. Start at the top and follow the arrows.

---

## The Tree

```
Is this code YOUR logic (not Apple's framework code)?
│
├─ NO → Don't test it.
│       Example: Does Array.append work? Does NavigationStack push?
│       Apple already tests their frameworks.
│
└─ YES → Does it make a DECISION or TRANSFORM data?
         │
         ├─ YES → Does it involve BUSINESS RULES?
         │        │
         │        ├─ YES → ✅ ALWAYS TEST
         │        │        Examples:
         │        │        - Price calculation with discounts
         │        │        - Eligibility checks (age, subscription tier)
         │        │        - Input validation (email format, password strength)
         │        │        - State machine transitions (order: pending → paid → shipped)
         │        │
         │        └─ NO → Does it PARSE external data?
         │                │
         │                ├─ YES → ✅ ALWAYS TEST
         │                │        Examples:
         │                │        - JSON decoding from API responses
         │                │        - CSV/file parsing
         │                │        - Deep link URL parsing
         │                │        - Date string parsing
         │                │
         │                └─ NO → Does it FORMAT data for display?
         │                        │
         │                        ├─ YES → ⚠️ SOMETIMES TEST
         │                        │        Test if the formatting has conditional logic.
         │                        │        Examples worth testing:
         │                        │        - "2 minutes ago" vs "yesterday" vs "Jan 5"
         │                        │        - Currency formatting with locale rules
         │                        │        - Pluralization ("1 item" vs "3 items")
         │                        │        Skip if it's just a direct DateFormatter call.
         │                        │
         │                        └─ NO → Does it COORDINATE multiple systems?
         │                                │
         │                                ├─ YES → ⚠️ SOMETIMES TEST
         │                                │        Test the coordination logic, mock the systems.
         │                                │        Examples:
         │                                │        - "Save to database then sync to server"
         │                                │        - "If offline, queue; if online, send"
         │                                │
         │                                └─ NO → 🔻 RARELY TEST
         │                                         Simple pass-through, no decisions.
         │
         └─ NO → Is it LAYOUT or APPEARANCE?
                  │
                  ├─ YES → 🔻 RARELY TEST
                  │        Use SwiftUI Previews instead.
                  │        Exception: snapshot tests for critical branded screens.
                  │        Examples to skip:
                  │        - Padding values
                  │        - Font sizes
                  │        - Color assignments
                  │
                  └─ NO → Is it NAVIGATION?
                           │
                           ├─ YES → ⚠️ SOMETIMES TEST
                           │        Test if navigation has CONDITIONS.
                           │        Examples worth testing:
                           │        - "Show onboarding if first launch, home if returning"
                           │        - "Deep link /product/123 opens product detail"
                           │        Skip if it's just a NavigationLink with no conditions.
                           │
                           └─ NO → Probably skip it.
                                    Ask: "If this broke, would a user notice?"
                                    If yes, find a way to test it.
                                    If no, move on.
```

---

## Quick Reference Table

| Category | Test? | Examples |
|---|---|---|
| Business logic | Always | Pricing, validation, eligibility, state machines |
| API parsing | Always | JSON decoding, error mapping, response models |
| Data transformations | Always | Sorting, filtering, grouping, mapping |
| State transitions | Always | Login flow, order lifecycle, undo/redo |
| Conditional formatting | Sometimes | Relative dates, pluralization, locale-aware strings |
| Navigation with conditions | Sometimes | Deep links, conditional routing, tab selection |
| View model logic | Sometimes | If it has `if/else` or computed properties with logic |
| Coordination logic | Sometimes | Offline queue, retry, sync |
| Simple getters | Rarely | `var fullName: String { "\(first) \(last)" }` |
| Layout/appearance | Rarely | Padding, colors, fonts (use previews) |
| Apple framework calls | Never | URLSession, NavigationStack, List behavior |

---

## The Golden Rule

**If it makes a decision, test it. If it just displays a value, preview it.**

When in doubt, ask yourself: "If I changed this code and broke it, would my tests catch it?" If the answer is no and the code matters, add a test.
