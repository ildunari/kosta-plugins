---
name: apple-architecture-patterns
user-invocable: false
description: >
  Use when designing, comparing, refactoring, or reviewing architecture for
  iOS or macOS apps, especially for MVVM, The Composable Architecture (TCA),
  Clean Architecture, VIPER, Coordinators, Repository and dependency-injection
  patterns, modular Swift Package structure, Swift 6+, Observation, or
  architecture-level testing decisions. Do not use for narrow UI-only work
  that does not involve an app-structure choice.
version: 2.0.0
last_verified: "2025-10-28"
update_frequency: "quarterly"
third_party_versions:
  tca: "Check pointfree.co for latest"
swift_version: "6.0+"
tags:
  - iOS
  - macOS
  - Swift
  - SwiftUI
  - Architecture
  - MVVM
  - TCA
  - CleanArchitecture
  - VIPER
  - Coordinators
  - Repository
  - DependencyInjection
  - SwiftPackageManager
  - Testing
---

# Apple Architecture Patterns — Claude Agent Skill

> A curated toolkit of decision frameworks, runnable analyzers, boilerplate
> generators and reference guides for building maintainable Apple platform
> applications. This skill has been refreshed for Swift 6 and the new
> Observation framework, and it introduces guidance for staying current with
> evolving patterns and third‑party dependencies.

## Overview

Use this skill when you need to:

- Choose an architecture for a **new** iOS/macOS app or feature.
- **Migrate** an existing code base (e.g. MVC → MVVM → TCA) with minimal risk.
- Enforce **layer boundaries** and visualise dependencies between modules.
- Scaffold **boilerplate** projects or features with proven folder structures.
- Establish **testing strategies** for each pattern (unit, integration, snapshot, UI).
- Stay abreast of the latest Swift language and library features when making
  architecture recommendations.

## Staying Current with Architecture Patterns

Architecture patterns evolve quickly with language features and framework changes.
Before recommending a pattern or generating boilerplate, perform targeted
research using the web search tools built into the agent. The following list
summarises what to check and when:

### TCA (third‑party)

1. **Latest release** – Search for “Composable Architecture latest version 2025”
   and read the release notes or Point‑Free blog posts to identify new APIs or
   breaking changes. Recent releases include shared state support (`@Shared`) and
   improvements to observation and persistence【481379339866622†L27-L36】.【746950836239898†L232-L243】
2. **Breaking changes** – Monitor the GitHub releases for compiler warnings and
   removed APIs (for example, the 1.23.1 release fixed extraneous argument label
   errors and updated dependencies for Swift 6 compatibility【746950836239898†L232-L243】).
3. **Swift compatibility** – Search for “TCA Swift 6 compatibility” to ensure
   your target version of Xcode supports the library. If you find that
   `@Reducer` macros or `Store.publisher` behave differently, update your
   templates accordingly.

### All patterns

1. **Swift language features** – Review Swift release notes for new constructs
   (e.g. actors, macros, `async/await`), and enable strict concurrency checking
   in your build settings to catch data‑race safety issues early【723763396857538†L16-L24】.
2. **Observation framework** – With iOS 17 and Swift 5.9 Apple introduced the
   Observation framework. It provides a robust, type‑safe observer pattern
   implementation and eliminates the need for `ObservableObject` and
   `@Published` by using the `@Observable` macro【78975759551952†L201-L217】. The
   framework lets you mark a type as observable, track changes within an
   instance, and observe those changes in the UI【78975759551952†L209-L214】.
3. **Community discussions** – Search `site:reddit.com/r/iOSProgramming` for
   “MVVM vs TCA 2025” and `“modern iOS architecture 2025”` to understand
   developer sentiment. Many practitioners note that TCA’s learning curve and
   tight coupling can hinder adoption【285873496392749†L73-L88】, while MVVM
   implementations vary and may suffer from weak separation of concerns【285873496392749†L94-L99】.

### When to trigger a search

- The user mentions a specific Swift version (e.g. Swift 6 or Swift 7).
- The user asks “is [pattern] still recommended in 2025?” or “TCA vs [other pattern]”.
- The user references the Observation framework (`@Observable`) or upcoming
  language features.

### Primary sources

- **Point‑Free**: release notes and blog posts for TCA updates and migration guides.
- **Apple Developer Documentation**: SwiftUI, Observation and strict concurrency
  guides (see the concurrency migration doc【723763396857538†L16-L24】).
- **Community posts**: Reddit threads and medium articles provide insight into
  real‑world adoption challenges and workarounds【285873496392749†L73-L88】.

**Last verified**: 2025‑10‑28

## Contents

This skill contains:

```
apple-architecture-patterns/
├─ SKILL.md             # decision framework and high‑level guidance (this file)
├─ scripts/             # analyzers, graph generators, boilerplate and migration tools
├─ examples/            # mini‑apps demonstrating each pattern (MVVM, TCA, Clean, VIPER, etc.)
├─ references/          # detailed guides for each pattern (mvvm, tca, clean, viper)
└─ templates/           # ready‑made Swift files and folder layouts for rapid prototyping
```

## Pattern Deep Dives

Rather than crowd this top‑level skill with lengthy tutorials, detailed
information lives in separate reference files. Refer to the following for
in‑depth treatment:

- **MVVM Guide**: see [`references/mvvm-guide.md`](references/mvvm-guide.md) for
  updated MVVM practices, including how the `@Observable` macro simplifies
  state management and reduces boilerplate.
- **TCA Guide**: see [`references/tca-guide.md`](references/tca-guide.md) for
  the latest on reducers, stores, effects, shared state and testing.
- **Clean Architecture Guide**: see [`references/clean-guide.md`](references/clean-guide.md) for
  domain‑driven layers, strict concurrency, actors and dependency inversion.
- **VIPER Guide**: see [`references/viper-guide.md`](references/viper-guide.md) for
  module boundaries, navigation, and tips to avoid boilerplate.

Additional resources (migration strategies, comparison matrix, testing
approaches and project structure diagrams) live in the `references/` directory as
well.

## Decision Framework

Deciding on an architecture is not a one‑size‑fits‑all exercise. Use the
following high‑level decision tree (rendered in Mermaid syntax) to narrow down
options based on team size, domain complexity and legacy constraints:

```mermaid
flowchart TD
    A[Start: New or Existing App?] -->|New| B{Team Experience?}
    A -->|Existing| M[Audit code with scripts/architecture_analyzer.py]

    B -->|Small team, simple domain| MV[Choose MVVM (+Coordinators)]
    B -->|Large team or complex business rules| TCA[TCA or Clean Architecture]

    TCA --> T1[Need cross‑feature state sharing? Yes → TCA]
    MV --> MV1[UI‑first adoption → MVVM + Repository]
    T1 --> T2[Strict boundaries & longevity → Clean]

    M --> M2{Hotspots?}
    M2 -->|Massive VCs| MV2[Introduce ViewModel + Coordinator]
    M2 -->|Tight Coupling| R1[Introduce protocols & Repository]
    M2 -->|Layer Violations| CLN[Refactor toward Clean/TCA]
```

## Trade‑offs and Scalability

| Pattern | Pros | Cons |
|---|---|---|
| **MVVM** | Lightweight, works well with SwiftUI; easy to adopt; pairs with coordinators | Boundaries are cultural; view models can grow; inconsistent implementations; watch for over‑redrawing unless you use `@Observable`【285873496392749†L94-L99】 |
| **TCA** | Unidirectional data flow; excellent testability; composable reducers; new shared state tools【481379339866622†L27-L36】 | Steeper learning curve; ties code to a third‑party library; requires regular updates to avoid breaking changes【746950836239898†L232-L243】 |
| **Clean** | Clear separation of UI, domain and data; framework agnostic; longevity | Extra layers and indirection; requires documentation and code reviews |
| **VIPER** | Explicit module boundaries; highly testable | Verbose; heavy for simple screens |
| **Coordinators** | Separates navigation from views; reusable flows | Coordinators can become large; child‑parent lifecycle management required |

To scale your application:

- Keep features independent and avoid global mutable state; leverage TCA’s
  `@Shared` only when state truly needs to be shared【481379339866622†L27-L36】.
- Enable strict concurrency checking (`-strict-concurrency=complete`) to catch
  data races【723763396857538†L16-L24】.
- Use local Swift packages (SPM) to split features and enforce internal
  visibility.
- Prefer value types for models and protocols for capabilities; isolate reference
  semantics to the edges.

## Team Collaboration

- **Documentation first**: record decisions as Architecture Decision Records (see
  `templates/adr/ADR-000-template.md`).
- **Code ownership**: assign maintainers per module and review checklists.
- **Template‑driven**: use `scripts/boilerplate_generator.py` to create
  consistent folder structures.
- **Continuous analysis**: run `scripts/architecture_analyzer.py` and
  `scripts/dependency_graph_generator.py` in CI to detect layering violations.

## Best Practices

- Start with small, testable features; compose them gradually.
- Pin third‑party versions and monitor changelogs【746950836239898†L232-L243】.
- Prefer protocols over concrete classes for dependencies; inject at the edges.
- Adopt SwiftUI’s Observation framework (`@Observable`) to reduce boilerplate and
  improve performance【78975759551952†L201-L217】.
- Use feature flags to ship risky changes safely; separate policy (toggle
  decision) from mechanism (feature code).

## Anti‑Patterns

- Massive view controller/view model/coordinator.
- Service locators and hidden singletons.
- Shared mutable state without clear ownership.
- Cross‑layer imports (e.g. UI importing data implementations).
- Over‑engineering with too many patterns for a simple problem.

## Troubleshooting

- **Circular dependencies**: split interfaces and invert ownership.
- **Slow compile times**: break code into smaller Swift packages; avoid mega files.
- **Unclear ownership**: introduce coordinators and ADRs to document flows.
- **Testing brittleness**: isolate I/O and side effects; use proper dependency
  injection and test doubles.

## Tool Usage Examples

- **Audit a project**:

  ```bash
  python3 scripts/architecture_analyzer.py --path /path/to/MyApp --out report.json
  ```

- **Generate a dependency graph**:

  ```bash
  python3 scripts/dependency_graph_generator.py --path /path/to/MyApp --format mermaid --out deps.md
  ```

- **Detect architecture violations**:

  ```bash
  python3 scripts/violation_detector.py --path /path/to/MyApp --out violations.json
  ```

- **Suggest refactors** (e.g. MVC → MVVM → TCA):

  ```bash
  python3 scripts/refactor_suggester.py --path /path/to/MyApp --target tca
  ```

- **Scaffold a new feature/app**:

  ```bash
  python3 scripts/boilerplate_generator.py --arch mvvm --name Profile --into ./Features
  ```

- **Check the installed TCA version**:

  ```bash
  python3 scripts/check_tca_version.py --package-file /path/to/Package.swift
  ```

## References & Further Reading

- Point‑Free blog posts on shared state and Swift testing support for TCA【481379339866622†L27-L36】【584748763487444†L27-L47】.
- Infinum’s introduction to the Observation framework【78975759551952†L201-L217】.
- Swift.org guidance on enabling strict concurrency【723763396857538†L16-L24】.
- Discussions on the pros and cons of TCA vs MVVM adoption【285873496392749†L73-L88】【285873496392749†L94-L99】.
