---
name: apple-networking-apis
user-invocable: false
description: >
  Production-grade networking & API integration patterns for iOS and macOS.
  Use when designing, implementing, debugging, or reviewing app networking:
  URLSession async/await, authentication (OAuth2/JWT), error handling, retries,
  caching (ETag/URLCache), REST & GraphQL, WebSockets, network monitoring,
  offline queues, and example code + scripts to accelerate delivery.
version: 1.0.0
last_verified: "2025-10-28"
update_frequency: "quarterly"
tags:
  - ios
  - macos
  - networking
  - api
  - urlsession
  - swift
  - graphql
  - websocket
  - caching
  - auth
---

# Apple Networking & API Integration Skill

> **Purpose**: Equip Claude with a complete, opinionated, battle-tested approach to building robust networking layers for iOS/macOS apps, with copy‑pasteable Swift, production‑ready Python utilities, and thorough guidance.

---

## Overview

This Skill packages a pragmatic architecture for client networking that:
- Centers on `URLSession` with Swift Concurrency (async/await).
- Encapsulates authentication (OAuth 2.0 / JWT), refresh, and secure storage.
- Provides resilient error handling, retry with exponential backoff + jitter.
- Honors HTTP caching semantics (ETag, If-None-Match, Cache-Control) and `URLCache`.
- Supports REST, GraphQL (Apollo optional), and WebSockets.
- Monitors connectivity with `Network.framework` and adapts (e.g., waitsForConnectivity).
- Enables offline-first workflows with durable queues and background sync.
- Ships with generators and tools (OpenAPI client generator, mock server, interceptors).

**Folder Structure**

```
apple-networking-apis/
├── SKILL.md
├── scripts/
│   ├── generate_api_client.py
│   ├── mock_server.py
│   ├── network_interceptor.py
│   └── auth_manager_generator.py
├── swift/
│   ├── APIClientAsyncAwait.swift
│   ├── AuthManagerTokenRefresh.swift
│   ├── NetworkError.swift
│   ├── RetryWithBackoff.swift
│   ├── LoggingURLProtocol.swift
│   ├── MultipartUpload.swift
│   ├── WebSocketClient.swift
│   ├── NetworkMonitor.swift
│   └── OfflineQueue.swift
├── docs/
│   ├── authentication-flows.md
│   ├── error-handling-patterns.md
│   └── caching-strategies.md
└── examples/
    ├── mock-server-config.json
    ├── requests.http
    └── graphql/query.graphql
```

---

## Staying Current with Networking APIs

URLSession and networking standards evolve with each iOS and macOS release. In rapidly changing ecosystems you must verify your assumptions before implementing code. This skill includes a snapshot of best practices as of **28 Oct 2025**; use the guidelines below to keep your networking stack up to date.

### Before Implementation
1. **Check iOS version features** – Search the web to confirm what has changed in the version you’re targeting. For example, run `web_search("URLSession iOS [version] new features")` to identify new capabilities or deprecations.
2. **Verify security requirements** – Ensure your endpoints and certificate policies comply with the latest App Transport Security (ATS) and TLS mandates for your deployment target. Use `web_search("App Transport Security iOS [version] requirements")`.
3. **Check protocol support** – Confirm support for emerging protocols (HTTP/3, QUIC, WebSocket, gRPC, Server‑Sent Events). Use queries like `web_search("HTTP/3 iOS [version] support")` or `web_search("WebSocket iOS [version] native support")`.
4. **Review third‑party libraries** – Frameworks like Apollo GraphQL, Alamofire, gRPC‑Swift and others evolve quickly. Verify their minimum deployment targets, concurrency model, and compatibility with your Swift version by running searches such as `web_search("Apollo iOS Swift 6 concurrency support [version]")`.

### When to Search
Trigger a search whenever you encounter:

- An iOS or macOS version newer than those documented here (17+).
- Requests for the “latest OAuth flow,” “current auth best practices,” or other cutting‑edge security patterns.
- Mentions of **HTTP/3**, **QUIC**, **GraphQL**, **WebSocket**, **Server‑Sent Events**, **gRPC**, or other modern protocols.
- Questions about authentication errors, ATS/TLS issues, token storage, certificate pinning, or changes to Keychain APIs.
- Uncertainty about third‑party library versions, subscription support, or Swift concurrency.

### Primary Sources

- **Apple Developer Documentation** (URLSession, Network.framework, Security) for official APIs.
- **RFCs and IETF specs** for protocol standards (e.g., OAuth 2.1【964654021945925†L61-L80】, HTTP/3【468735740034669†L392-L400】).
- **Apple Developer Forums and release notes** for bug reports and simulator quirks (e.g., duplicate requests failing in the iOS 18.4 simulator; set `request.assumesHTTP3Capable = false` to disable HTTP/3 in tests【325481821916823†L20-L56】).
- **Reputable blogs and library repositories** for implementation updates, e.g., Apollo iOS 2.0 adopting Swift concurrency【885399316124246†L244-L275】 or gRPC Swift 2 adding modern concurrency【329925304272063†L20-L63】.

**Last verified**: 2025‑10‑28 (covering iOS 17–18)  
**Update frequency**: Quarterly (review after each major OS release)

---

## When to Use

Use this Skill when:
- Designing a new network stack or refactoring an ad‑hoc one.
- Integrating OAuth/OIDC providers with PKCE and secure token storage.
- Hardening reliability (timeouts, retries, idempotency, backoff/jitter).
- Implementing caching (ETag/Last‑Modified, URLCache) or optimizing bandwidth.
- Adding real‑time features with WebSockets or server push.
- Building offline/spotty‑network experiences with queues and sync.
- Creating test doubles with a configurable mock server.
- Generating clients from OpenAPI specs to speed up delivery and reduce drift.

Skip this Skill when:
- You only need a one‑off, throwaway script or playground snippet.
- Your app uses a fully managed SDK that prescribes its own client and auth.

---

## Core Concepts

**Layered Design**
1. **Transport**: A thin, generic layer around `URLSession` (data, upload, download) with request building, decoding, and cancellation.
2. **Auth**: An `AuthManager` that supplies/refreshes tokens and injects headers; isolates Keychain, PKCE, and provider‑specific quirks.
3. **API Client(s)**: Domain‑specific surfaces (e.g., `UserAPI`, `PaymentsAPI`) built on Transport; model decoding is local to each.
4. **Resilience**: Shared retry/backoff policy, circuit breakers (optional), and typed errors.
5. **Observability**: Interceptors for structured logging (with redaction), metrics, and trace IDs.
6. **State Awareness**: `NWPathMonitor` + `waitsForConnectivity` for graceful connectivity recovery.
7. **Offline**: Disk‑backed request queue, idempotency keys, merge policies, and background sync.

**Concurrency Principles**
- Prefer `async/await` over callbacks or Combine for clarity.
- Make shared managers `actor`s when they hold mutable state (e.g., token refresh coalescing).
- Propagate cancellation (e.g., drop work on navigation changes).
- Use `withTaskCancellationHandler` for cleanup (e.g., cancel WebSocket pings).

**HTTP Semantics**
- Respect server directives (Retry‑After, Cache‑Control, ETag).
- Retry **only** idempotent operations by default (GET/HEAD/PUT/DELETE) unless API explicitly permits POST with idempotency keys.
- Distinguish **transport** vs **application** errors; map to typed errors.

---

## URLSession Patterns

- **Configuration**:
  - `URLSessionConfiguration.default` for general API calls.
  - `.ephemeral` for privacy‑sensitive flows (no persistent cookies/cache).
  - `.background(withIdentifier:)` for long‑running uploads/downloads.
  - Set `waitsForConnectivity = true` to avoid failing immediately on brief outages.
  - Consider `multipathServiceType = .handover` for seamless Wi‑Fi/Cell transitions (entitlement required).
  - Tune `timeoutIntervalForRequest` and `timeoutIntervalForResource` distinctly.
  - Respect **Low Data Mode** by setting `configuration.allowsConstrainedNetworkAccess` to `false` for sessions (or `URLRequest.allowsConstrainedNetworkAccess` for individual requests). If a request fails because the network is constrained, inspect the error’s `networkUnavailableReason` for `.constrained` and fall back to lower‑resolution or delayed resources【313413104212836†L24-L64】【313413104212836†L144-L147】.

- **Request Building**:
  - Centralize default headers (Accept, Content‑Type, User‑Agent, app version).
  - Merge per‑request headers; last write wins.
  - Prefer `Encodable` for bodies and `URLQueryItem` for queries.

- **Decoding**:
  - One `JSONDecoder` with ISO‑8601 or server‑specific date strategy.
  - Gracefully handle `application/problem+json` error envelopes (RFC 7807).

- **Cancellation**:
  - Bubble up `CancellationError` as a non‑fatal path.
  - Clean up in‑flight tasks in view model `deinit` or `onDisappear`.

---

## Async/Await Best Practices

- Wrap legacy completion APIs with `withCheckedThrowingContinuation` carefully (avoid retaining self).
- Design `async` functions to be cancellation‑friendly; check `Task.isCancelled` before heavy work.
- Use `TaskGroup` for fan‑out/fan‑in where appropriate; cap concurrency.
- Never create unscoped `Task {}` from within `async` API code unless intentionally detaching work.
- Prefer `actor` isolation for token refresh and offline queue mutation.

---

## Authentication Flows (OAuth 2.1 / JWT)

 - **Authorization Code + PKCE (OAuth 2.1, recommended)**:
  - Use the authorization code flow with Proof Key for Code Exchange (PKCE). OAuth 2.1 removes the implicit grant flow and mandates PKCE for all public clients【964654021945925†L61-L80】.
  - Launch with `ASWebAuthenticationSession`, specifying a custom scheme or Universal Link. Enforce exact redirect URI matching and specify required scopes (e.g., `openid profile offline_access`).
  - Exchange the code for tokens at the token endpoint; store access and refresh tokens securely in the Keychain and never persist them in UserDefaults or plain files【544542894411502†L112-L140】.
  - Use short‑lived access tokens (5–15 minutes) and rotate refresh tokens on every use【544542894411502†L168-L174】【964654021945925†L139-L179】. Implement single‑flight refresh logic to avoid token storms.

- **Client Credentials (device‑to‑service)**:
  - Use sparingly on device; if needed for trusted enterprise contexts, scope narrowly and store minimally.

 - **JWT / Custom**:
  - Use signed JWTs for service authentication. Choose strong signing algorithms (RS256 or ES256), keep the payload minimal, and validate signature, expiration, issuer and audience on every request【544542894411502†L112-L140】.
  - Store JWTs securely in the Keychain; avoid localStorage or sessionStorage and always use HTTPS because JWTs are bearer tokens【544542894411502†L152-L160】.
  - Rotate signing keys regularly and use short expirations. Pair JWTs with refresh tokens when appropriate and rotate refresh tokens on each exchange【544542894411502†L168-L174】.

- **Keychain**:
  - Store tokens as `kSecClassGenericPassword`, scoped via access groups when sharing across apps or extensions.
  - Handle `errSecDuplicateItem` by updating; always set `kSecAttrAccessible` appropriately.

- **Edge Cases**:
  - 401 while refreshing → clear tokens and re‑authenticate.
  - Clock skew: respect `expires_in`, but proactively refresh within a safety window (e.g., 60–120s).
  - Multi‑window/macOS apps: serialize refresh via an `actor` to avoid token races.

---

## Error Handling Strategies

Define a typed `NetworkError` that captures:
- **transport**: `URLError` family (DNS, timeouts, TLS).
- **http(status: Int, problem: ProblemDetails?)**: non‑2xx with optional parsed envelope.
- **decoding**: JSON schema mismatch, date parsing.
- **unauthorized / forbidden**: 401/403 shortcuts for control flow.
- **cancelled**: user‑initiated cancellations.
- **unknown**: a safe catch‑all with context.

Log with a request ID and **redact sensitive fields** (Authorization, Set‑Cookie, tokens, PII).

---

## Retry Logic

- Default policy: retry **idempotent** methods on transient failures (5xx, network lost) with **exponential backoff + jitter**; honor `Retry-After`.
- Cap attempts (e.g., 3–5) and use full jitter: `sleep = random(0, base * 2^attempt)`.
- Don’t retry:
  - 4xx except 408/429 (with limits).
  - Non‑idempotent methods without idempotency keys.
  - Auth errors unless you refresh tokens first.
- Bubble a structured error with attempt count and last failure.

---

## Caching Strategies

- Honor server cache directives (`Cache-Control`, `ETag`, `Last-Modified`). Prefer **ETag** revalidation with `If-None-Match`.
- Use `URLCache` with tuned memory/disk sizes; set `useProtocolCachePolicy` unless the server is misconfigured.
- For image/content delivery, lean on CDN headers; avoid custom caches unless necessary.
- For “stale‑while‑revalidate”, serve cached content immediately and kick off a background refresh.
- Document cache invariants (e.g., vary by Accept‑Language).

---

## REST Patterns

- Strongly type endpoints: enums or small structs generate paths and parameters.
- Use `Encodable` request models and `Decodable` responses; keep DTOs separate from domain models if mapping is non‑trivial.
- Prefer **PATCH** for partial updates; include preconditions with `If-Match` when needed.
- Support idempotency keys for POST semantics when the backend allows it.

---

## GraphQL Integration

- Use Apollo iOS (SPM) for codegen, normalized caching, and typed operations.
- Co‑locate `.graphql` operations with feature code; generate during build via script.
- Enable persisted queries and automatic persisted queries (APQ) when available.
- Treat GraphQL errors distinctly: transport OK with `errors` array is still a failure at the application layer.
Cache normalized entities; prefer fine‑grained cache invalidation over manual busting.

- **Upgrade to Apollo iOS 2.0 when possible** – the 2025 major release embraces Swift 6 structured concurrency, making query execution `async/await` friendly. All generated types conform to `Sendable` and tasks compose elegantly. Deployment targets are raised to iOS 15/macOS 12 and CocoaPods support is dropped【885399316124246†L244-L275】【885399316124246†L283-L288】.

---

## Modern Protocol Support

### HTTP/3 and QUIC
HTTP/3 uses the QUIC transport to provide native multiplexing and eliminate head‑of‑line blocking. Safari and `URLSession` added experimental HTTP/3 support with Safari 14 (iOS 14/macOS 11) and enabled it by default in Safari 16.4 for all users starting in September 2024【468735740034669†L392-L400】. When targeting iOS 17/18, HTTP/3 is typically available, but some simulators (for example the iOS 18.4 simulator) have bugs that break duplicate requests; disable HTTP/3 for simulator builds by setting `request.assumesHTTP3Capable = false`【325481821916823†L20-L56】. Always let `URLSession` negotiate the protocol – it will automatically fall back to HTTP/2 or HTTP/1.1 when servers do not advertise HTTP/3 support. Monitor `task.metrics.protocolName` to observe negotiated versions and log anomalies. Before enabling HTTP/3 on your server, confirm your CDN, load balancer and TLS termination support QUIC and use strong cipher suites.

### Server‑Sent Events (SSE)
SSE delivers unidirectional, real‑time updates over a persistent HTTP connection. Although iOS lacks a first‑party SSE client, you can implement one by initiating a long‑lived `URLSession.dataTask` and parsing lines that start with `data:`. Ensure you handle reconnects with exponential backoff, send a `Last-Event-ID` header to resume from the last event, and switch to WebSockets when you need bi‑directional communication. Monitor network reachability and respect Low Data Mode by deferring high‑frequency events.

### WebSocket Improvements
`URLSessionWebSocketTask` provides first‑class WebSocket support on Apple platforms. It handles both text and binary messages, includes built‑in ping/pong, supports secure `wss://` connections, and lets you gracefully close connections【495094527833113†L80-L90】. For advanced use cases (custom protocols, high‑performance or peer‑to‑peer streams), use `NWConnection` from Network.framework (iOS 14+) to create WebSocket connections. `NWConnection` offers granular state management, custom protocol stacks, seamless network interface switching and improved performance【495094527833113†L144-L159】, and sample code demonstrates how to establish and handle connection states【495094527833113†L162-L182】. Wrap your send and receive loops with Swift concurrency (`for await`) and incorporate periodic pings and reconnect logic as shown in `WebSocketClient.swift`.

### gRPC and Protobuf
Use **grpc‑swift** for efficient, strongly‑typed remote procedure calls. gRPC Swift 2 (released Feb 14 2025) introduces first‑class concurrency with `async/await`, Protocol Buffers code generation, pluggable transports (HTTP/2), smart client features such as client‑side load balancing and retries, and a flexible interceptor layer for authentication, logging and metrics【329925304272063†L20-L63】. When adopting gRPC, ensure your deployment target meets the minimum requirement (typically iOS 15+) and validate that your API gateway and load balancer support HTTP/2 and streaming. Use interceptors to inject OAuth tokens or custom metadata and to implement metrics and tracing.

### Other Protocols
- **GraphQL subscriptions** – currently Apollo iOS uses HTTP‑based subscriptions. WebSocket-based subscriptions are under development; check the library’s release notes and enable APQ and persisted queries where possible.
- **Low Data Mode** – respect user preferences by setting `URLSessionConfiguration.allowsConstrainedNetworkAccess` and `URLRequest.allowsConstrainedNetworkAccess` to `false`. When a request fails because the network is constrained, inspect `error.networkUnavailableReason == .constrained` and fall back to lower‑quality assets【313413104212836†L24-L64】【313413104212836†L144-L147】.

---

## WebSocket Implementation

- Use `URLSessionWebSocketTask`:
  - Send periodic pings; configure receive loop via `for await` style or callback loop.
  - Reconnect with backoff on close (unless closed by policy).
  - Decode text frames to models; handle binary frames when necessary.
  - Gracefully close with reason and code; surface reachability changes.

---

## Network Monitoring

- Wrap `NWPathMonitor` to expose reachability, expensive path detection (cellular), and interface type.
- Use `waitsForConnectivity` for temporary outages; show lightweight UI affordances (“Connecting…”).
- Avoid blocking the main thread; debounce path changes.

---

## Offline Support

- Persist a queue of requests (method, path, headers, body, idempotency key).
- Replay requests when path becomes `satisfied`; respect ordering and backoff.
- Ensure **idempotency**: server must dedupe based on keys to prevent duplicates.
- For composed workflows, store a **saga** record for compensating actions on partial failure.

---

## Best Practices

- Prefer HTTPS with strong TLS; enable ATS and pin only when you control the server and rotation story.
- Keep default cookie storage disabled for API sessions unless needed.
- Record synthetic metrics (latency percentiles, error rates) for critical endpoints.
- Separate “user data” and “analytics/telemetry” sessions to avoid coupling retries/timeouts.

---

## Anti‑Patterns

- Global mutable singletons without isolation → race conditions.
- Blanket retries on all 4xx/5xx → thundering herd, duplicated writes.
- Swallowing `CancellationError` and showing spinners forever.
- Ignoring HTTP caching and over‑fetching.
- Logging tokens or PII.

---

## Troubleshooting

- **`NSURLErrorNotConnectedToInternet`**: ensure `waitsForConnectivity` or present offline UI; consider `NWPathMonitor` to avoid futile calls.
- **Token refresh storms**: implement single‑flight refresh (one refresh active, others await).
- **304s never returned**: verify `If-None-Match` is set and server emits strong or weak `ETag` consistently.
- **WebSocket silently dies**: add periodic pings and timeouts; inspect `closeCode` and reasons.
- **Decoding fails in production**: log a redacted response sample and server version; use resilient decoders for optional fields.

---

## Tool Reference (scripts/)

- **generate_api_client.py**: Generate Swift API clients from OpenAPI 3 specs. Handles endpoints, parameters, basic models, errors, and scaffolding.
- **mock_server.py**: Lightweight configurable mock server with templated responses, CORS, artificial delays, and failure sequences.
- **network_interceptor.py**: Generates a Swift `URLProtocol` logger with header/body redaction and OSLog integration.
- **auth_manager_generator.py**: Emits a Swift `AuthManager` for OAuth2/JWT with refresh, PKCE (optional), and Keychain storage.

---

## Examples Reference (swift/)

Key examples you can copy‑paste into your project:
- `APIClientAsyncAwait.swift` — generic send/decode + typed endpoint.
- `AuthManagerTokenRefresh.swift` — `actor`‑based token manager with single‑flight refresh.
- `NetworkError.swift` — unified error type and mapping.
- `RetryWithBackoff.swift` — generic retry helper with exponential backoff + jitter.
- `LoggingURLProtocol.swift` — request/response interceptor & redaction.
- `MultipartUpload.swift` — multipart/form‑data builder & upload.
- `WebSocketClient.swift` — robust WebSocket client (pings, reconnect).
- `NetworkMonitor.swift` — `NWPathMonitor` wrapper.
- `OfflineQueue.swift` — durable offline request queue.

---

## Closing Notes

This Skill is intentionally opinionated to minimize bikeshedding and maximize delivery speed. Adapt policies (timeouts, retry limits, logging) to your product and regulatory context. Integrate incrementally—start with Transport + Error types, then add Auth, Retry, and Caching. Build observability early to shorten MTTR.
