# ios-craft

Complete iOS development companion for Claude Code. Expert-level skills covering SwiftUI, Swift concurrency, architecture, networking, testing, performance, Liquid Glass, accessibility, CI/CD, and App Store submission.

## Design Principles

ios-craft follows a generator-evaluator separation pattern. Skills generate code and project artifacts (the project wizard scaffolds, the SwiftUI mastery skill produces screens), while agents evaluate quality using domain-specific calibration examples. Each agent includes a "Quality Calibration" section with concrete good-vs-bad output examples, so the model can self-assess before delivering. Hooks enforce what prompts alone cannot guarantee — the swift-file-guard blocks dangerous edits deterministically, and the build-after-edit hook catches compile errors without relying on the model to remember to build. Scaffolding is matched to model capability: complex reasoning tasks (bug investigation, release engineering, mentoring) route to Opus, while fast implementation tasks (UI building, performance profiling, test writing) route to Sonnet.

## Structure

```
skills/          18 expert skills (SwiftUI, architecture, concurrency, networking, testing, etc.)
agents/          6 specialist agents (mentor, ui-builder, bug-doctor, test-coach, perf-profiler, ship-captain)
commands/        12 slash commands for common tasks
hooks/           3 hooks: project detection, file guards, incremental builds
```

## Skills

### Core Development

| Skill | What it does |
|-------|-------------|
| swiftui-mastery | Expert SwiftUI guide: state management, layout, navigation, animation, accessibility, performance |
| swift-concurrency | async/await, actors, Sendable, Task groups, Swift 6 migration |
| apple-architecture-patterns | MVVM, TCA, Clean Architecture, Coordinators, modular SPM packages |
| apple-platform-features | WidgetKit, App Intents, Live Activities, StoreKit 2, App Clips, notifications |
| liquid-glass | iOS 26+ Liquid Glass design language: glass effects, morphing, translucency |

### Data & Networking

| Skill | What it does |
|-------|-------------|
| apple-networking-apis | Production-grade URLSession, OAuth2/JWT, caching, retries, WebSockets, offline queues |
| apple-data-persistence | SwiftData, Core Data, CloudKit, Keychain, migrations, offline-first sync |

### Quality & Testing

| Skill | What it does |
|-------|-------------|
| swift-testing-expert | Swift Testing framework: @Test, #expect, parameterized tests, XCTest migration |
| apple-testing-architect | Comprehensive testing: unit, integration, UI, snapshot, CI/CD, coverage, flake detection |
| apple-performance-engineer | Instruments-driven profiling: startup, scrolling, memory, energy, build time, app size |
| ios-debugger-agent | Simulator debugging via XcodeBuildMCP: build, run, inspect, capture logs |

### Design & UX

| Skill | What it does |
|-------|-------------|
| ios-design-system | Design token system: colors, typography, spacing, components |
| ios-accessibility-engineer | VoiceOver, Dynamic Type, color contrast, accessibility audit |
| ios-animation-guide | SwiftUI animations: transitions, matched geometry, spring physics, keyframes |

### Project Lifecycle

| Skill | What it does |
|-------|-------------|
| ios-project-wizard | New project from scratch: interview, scaffold, XcodeGen, first build, Git init |
| ios-security-hardening | Secret management, certificate pinning, App Transport Security |
| ios-cicd-pipeline | Fastlane, Xcode Cloud, GitHub Actions for iOS |
| ios-app-store-submission | Full submission workflow: metadata, screenshots, review guidelines |

## Agents

| Agent | Model | Domain |
|-------|-------|--------|
| ios-mentor | Opus | Patient teaching with analogies, covers SwiftUI, concurrency, and architecture |
| ui-builder | Sonnet | Fast SwiftUI screen implementation with Liquid Glass support |
| bug-doctor | Opus | Systematic debugging with simulator integration and regression tests |
| test-coach | Sonnet | Test planning and writing with Swift Testing and comprehensive coverage |
| perf-profiler | Sonnet | Instruments-driven, measurement-first performance optimization |
| ship-captain | Opus | Release pipeline from archive to App Store with platform feature verification |

## Hooks

- **detect-ios-project.sh** (SessionStart) — Detects Xcode project type, deployment target, and build system on session start
- **swift-file-guard.sh** (PreToolUse) — Blocks direct .pbxproj edits when XcodeGen is present; warns on hardcoded secrets in Swift files
- **build-after-edit.sh** (PostToolUse) — Triggers incremental build every 3rd Swift file edit to catch compile errors early

## Feedback

Each skill has a `FEEDBACK.md` file for tracking what works and what doesn't across sessions. Update these after skill use to improve defaults, templates, and decision trees over time.
