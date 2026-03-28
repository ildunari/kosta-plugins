---
name: perf-check
description: Performance audit for common SwiftUI issues
---

Use the ios-performance-beginner skill to scan the codebase for common performance issues.

Audit the project for these categories:

1. **SwiftUI view body complexity** — Find views with body properties that are too long or doing work they shouldn't (network calls, heavy computation, object creation). View bodies should only describe UI, never perform side effects.

2. **Unnecessary redraws** — Look for missing Equatable conformances on view models, @Observable objects that trigger updates too broadly, and views that depend on state they don't use.

3. **List and scroll performance** — Check that Lists use lazy loading, images in scroll views load asynchronously, and ForEach uses stable identifiers (not array indices).

4. **AnyView usage** — Find any use of AnyView, which defeats SwiftUI's type-based diffing and forces full redraws. Replace with concrete types or Group.

5. **Image handling** — Verify images are properly sized (not loading 4000px images into 100pt views), cached when reused, and loaded asynchronously from network or disk.

6. **Main thread work** — Identify synchronous operations that should be async: network calls, file I/O, heavy JSON parsing, image processing.

7. **Memory patterns** — Check for retain cycles in closures (missing [weak self]), unbounded caches, and objects that grow without limits.

8. **Launch time** — Review the app entry point for eager initialization that could be deferred.

For each issue found, explain what it causes (janky scrolling, slow launch, memory growth), how severe it is, and provide the specific fix. Prioritize by user impact.
