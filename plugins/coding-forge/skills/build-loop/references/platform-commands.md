# Platform Commands

Determine build and test commands based on the project type. If unsure, ask
the user — don't guess.

## Detection and Defaults

| Indicator | Platform | Build | Test |
|-----------|----------|-------|------|
| `Package.swift` | Swift/iOS | `swift build` or `xcodebuild -scheme <S> build` | `swift test` or `xcodebuild -scheme <S> test` |
| `*.xcodeproj` / `*.xcworkspace` | iOS/macOS | `xcodebuild -project <P> -scheme <S> build` | `xcodebuild -project <P> -scheme <S> test` |
| `package.json` + `tsconfig.json` | TypeScript | `npm run build` or `npx tsc --noEmit` | `npm test` |
| `package.json` (no TS) | JavaScript | `npm run build` (if exists) | `npm test` |
| `next.config.*` | Next.js | `npm run build` | `npm test` |
| `Cargo.toml` | Rust | `cargo build` | `cargo test` |
| `go.mod` | Go | `go build ./...` | `go test ./...` |
| `pyproject.toml` / `setup.py` | Python | `python -m py_compile` (or project-specific) | `pytest` |
| `Makefile` | Make-based | `make` or `make build` | `make test` |

## Xcode-Specific

For iOS/macOS projects, determine the scheme and destination:

```bash
# List schemes
xcodebuild -list

# Typical iOS simulator
xcodebuild -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 16'

# Typical macOS
xcodebuild -scheme MyApp -destination 'platform=macOS'
```

## Overrides

If the project has a `Makefile`, `justfile`, or `Taskfile.yml`, prefer those
over raw compiler commands — they encode project-specific flags.

Always confirm build and test commands with the user in the plan phase if
there's any ambiguity.
