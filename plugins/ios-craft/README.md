# ios-craft

Complete iOS development companion for Claude Code. Guided workflows for project setup, SwiftUI, networking, testing, Metal, design systems, accessibility, CI/CD, and App Store submission. Built for beginners who want expert-quality results.

## Design Principles

ios-craft follows a generator-evaluator separation pattern. Skills generate code and project artifacts (the project wizard scaffolds, the SwiftUI builder produces screens), while agents evaluate quality using domain-specific calibration examples. Each agent includes a "Quality Calibration" section with concrete good-vs-bad output examples, so the model can self-assess before delivering. Hooks enforce what prompts alone cannot guarantee — the swift-file-guard blocks dangerous edits deterministically, and the build-after-edit hook catches compile errors without relying on the model to remember to build. Scaffolding is matched to model capability: complex reasoning tasks (bug investigation, release engineering, mentoring) route to Opus, while fast implementation tasks (UI building, performance profiling, test writing) route to Sonnet.

## Structure

```
skills/          15 guided workflows (project setup, SwiftUI, networking, testing, etc.)
agents/          6 specialist agents (mentor, ui-builder, bug-doctor, test-coach, perf-profiler, ship-captain)
commands/        12 slash commands for common tasks
hooks/           3 hooks: project detection, file guards, incremental builds
```

## Skills

| Skill | What it does |
|-------|-------------|
| ios-project-wizard | New project from scratch: interview, scaffold, XcodeGen, first build, Git init |
| swiftui-guided-builder | Build complete SwiftUI screens from descriptions |
| ios-api-integration | Full networking stack: API client, models, auth, pagination, caching |
| ios-crash-investigator | Guided crash diagnosis with crash log reading and common fixes |
| ios-testing-for-beginners | Testing fundamentals: what to test, how to write tests, how to run them |
| ios-performance-beginner | Performance profiling with Instruments and common SwiftUI optimizations |
| ios-design-system | Design token system: colors, typography, spacing, components |
| ios-accessibility-engineer | VoiceOver, Dynamic Type, color contrast, accessibility audit |
| ios-animation-guide | SwiftUI animations: transitions, matched geometry, spring physics |
| ios-visual-effects | Metal shaders, particle systems, blur effects |
| ios-data-layer-guide | SwiftData, Core Data, UserDefaults, Keychain |
| ios-security-hardening | Secret management, certificate pinning, App Transport Security |
| ios-cicd-pipeline | Fastlane, Xcode Cloud, GitHub Actions for iOS |
| ios-app-store-submission | Full submission workflow: metadata, screenshots, review guidelines |
| ios-freshness-checker | Verify SDK versions, deprecated APIs, and minimum deployment targets |

## Agents

| Agent | Model | Domain |
|-------|-------|--------|
| ios-mentor | Opus | Patient teaching with analogies and progressive guidance |
| ui-builder | Sonnet | Fast SwiftUI screen implementation from descriptions or screenshots |
| bug-doctor | Opus | Systematic debugging: reproduce, hypothesize, verify, fix, test |
| test-coach | Sonnet | Test planning and writing for beginners |
| perf-profiler | Sonnet | Measurement-first performance optimization |
| ship-captain | Opus | Release pipeline from archive to App Store |

## Hooks

- **detect-ios-project.sh** (SessionStart) — Detects Xcode project type, deployment target, and build system on session start
- **swift-file-guard.sh** (PreToolUse) — Blocks direct .pbxproj edits when XcodeGen is present; warns on hardcoded secrets in Swift files
- **build-after-edit.sh** (PostToolUse) — Triggers incremental build every 3rd Swift file edit to catch compile errors early

## Feedback

Each skill has a `FEEDBACK.md` file for tracking what works and what doesn't across sessions. Update these after skill use to improve defaults, templates, and decision trees over time.
