# Reviewer Selection

Choose the domain-specific reviewer based on the project type. This reviewer
runs in parallel with the general `code-reviewer` agent.

## Selection Table

| Project domain | Reviewer agent or skill | Focus areas |
|---------------|------------------------|-------------|
| iOS / Swift | `apple-swift-language-expert`, `apple-swiftui-mastery` | Swift idioms, SwiftUI lifecycle, actor isolation, Sendable |
| macOS apps | `apple-macos-ux-full`, `apple-architecture-patterns` | AppKit patterns, sandboxing, notarization |
| Web frontend (React) | `design-maestro`, `nextjs-app-router-patterns` | Component patterns, SSR/SSG, hydration, a11y |
| Web frontend (general) | `design-maestro` | HTML semantics, CSS architecture, responsive design |
| Python | Use `code-reviewer` only | No separate native reviewer needed |
| Go | Use `code-reviewer` only | Goroutine safety, error wrapping |
| Rust | Use `code-reviewer` only | Ownership, lifetime, unsafe blocks |

## Choosing When Multiple Apply

If a phase spans frontend and backend (e.g., API endpoint + React component),
dispatch two domain reviewers — one per layer. Run all reviewers in parallel.

## When No Domain Reviewer Exists

If the project domain has no specialist reviewer, dispatch `code-reviewer` only.
The build cycle still works — you just get one review instead of two.

## Reviewer Dispatch Rules

- Reviewers are **read-only**. They report findings, never make changes.
- Provide reviewers with: phase goal, the diff (or changed files), and any
  relevant spec/protocol reference.
- Instruct reviewers to use the severity scale from `review-dimensions.md`.
