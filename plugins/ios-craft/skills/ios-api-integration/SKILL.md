---
name: ios-api-integration
description: >
  Build a complete network layer from an API endpoint. Use when the user needs to
  connect their app to a REST API, GraphQL, or WebSocket. Walks through: API client,
  Codable models, async/await calls, error handling, auth, pagination, offline caching,
  and testing. For beginners who have never built a networking stack.
---

# iOS API Integration — Complete Networking Guide

This skill walks you through building a production-quality network layer from scratch. Every step builds on the previous one. By the end, you'll have an API client that handles authentication, pagination, offline caching, WebSocket connections, and proper error handling — all fully tested.

Reference `apple-networking-apis` for deeper patterns on URLSession internals and transport-level concerns.

---

## Step 1: Interview — Understand the API

Before writing any code, gather these details from the user:

1. **What API are you connecting to?** (e.g., "my own backend," "a public REST API like PokeAPI," "a GraphQL endpoint")
2. **Base URL?** (e.g., `https://api.example.com/v1`)
3. **Authentication method?** (None, API key in header, Bearer token, OAuth2)
4. **Give me one example endpoint.** (e.g., `GET /users` returns `[{"id": 1, "name": "Alice"}]`)

If the user doesn't know the answer to something, pick sensible defaults and explain why. The goal is to unblock them, not quiz them.

Once you have a base URL and one endpoint, you can start building.

---

## Step 2: Model First — Codable Structs from JSON

Always start with the data model. Look at the JSON response and translate it into a Swift struct.

**Why Codable?** Swift's `Codable` protocol lets the compiler auto-generate the code that converts JSON into Swift structs. You write the struct, Swift handles the parsing.

**CodingKeys** — When the API uses `snake_case` but Swift uses `camelCase`, you bridge them with a `CodingKeys` enum. This tells Swift "when you see `created_at` in JSON, put it in the `createdAt` property."

```swift
// Example: API returns {"id": 1, "user_name": "Alice", "created_at": "2025-01-15T10:30:00Z"}

struct User: Codable, Identifiable, Sendable {
    let id: Int
    let userName: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userName = "user_name"
        case createdAt = "created_at"
    }
}
```

**Tip:** If ALL your API responses use `snake_case`, skip `CodingKeys` entirely and configure the decoder once:

```swift
let decoder = JSONDecoder()
decoder.keyDecodingStrategy = .convertFromSnakeCase
decoder.dateDecodingStrategy = .iso8601
```

**Nested JSON** — When the API wraps data in an envelope like `{"data": [...], "meta": {...}}`:

```swift
struct APIResponse<T: Codable>: Codable {
    let data: T
    let meta: Meta?
}

struct Meta: Codable {
    let currentPage: Int
    let totalPages: Int
    let totalCount: Int
}
```

---

## Step 3: Basic APIClient with async/await

This is the foundation everything else builds on. One generic method that can fetch any `Decodable` type from any URL.

**What `async/await` means:** Instead of using callbacks (closures that run "later"), you write code that reads top-to-bottom. The `await` keyword means "pause here until the network responds, then continue." The `try` keyword means "if something goes wrong, jump to the nearest `catch` block."

### Complete APIClient Template

```swift
import Foundation

/// A lightweight HTTP client built on URLSession with async/await.
/// Handles JSON encoding/decoding, authentication, and error mapping.
actor APIClient {

    // MARK: - Configuration

    private let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    /// Optional auth token. Set this after login; it's automatically
    /// included in every request as a Bearer token.
    var authToken: String?

    // MARK: - Init

    /// - Parameters:
    ///   - baseURL: The root URL for all API requests (e.g., "https://api.example.com/v1").
    ///   - session: A URLSession instance. Pass a custom one for testing.
    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session

        self.decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        self.encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
    }

    // MARK: - Core Request

    /// Send a request and decode the response into the specified type.
    ///
    /// This is the single method that powers every network call. It:
    /// 1. Builds a URLRequest from the Endpoint
    /// 2. Attaches auth headers if a token exists
    /// 3. Sends the request via URLSession
    /// 4. Checks the HTTP status code
    /// 5. Decodes the JSON response into type T
    ///
    /// - Parameter endpoint: A type-safe endpoint describing the request.
    /// - Returns: The decoded response of type T.
    /// - Throws: `APIError` if anything goes wrong.
    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        let urlRequest = try buildRequest(for: endpoint)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch let urlError as URLError {
            throw APIError.network(urlError)
        } catch {
            throw APIError.unknown(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Map HTTP status codes to errors
        switch httpResponse.statusCode {
        case 200...299:
            break // Success — continue to decode
        case 401:
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden
        case 404:
            throw APIError.notFound
        case 422:
            // Try to decode a validation error from the server
            let serverError = try? decoder.decode(ServerValidationError.self, from: data)
            throw APIError.validationFailed(serverError?.errors ?? [])
        case 429:
            let retryAfter = httpResponse.value(forHTTPHeaderField: "Retry-After")
                .flatMap(Double.init)
            throw APIError.rateLimited(retryAfter: retryAfter)
        case 500...599:
            throw APIError.server(statusCode: httpResponse.statusCode)
        default:
            throw APIError.httpError(statusCode: httpResponse.statusCode, data: data)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingFailed(error)
        }
    }

    /// Fire-and-forget variant for DELETE or POST requests that return no body.
    func requestVoid(_ endpoint: Endpoint) async throws {
        let _: EmptyResponse = try await request(endpoint)
    }

    // MARK: - Request Builder

    private func buildRequest(for endpoint: Endpoint) throws -> URLRequest {
        // Construct the full URL: baseURL + path + query items
        var components = URLComponents(url: baseURL.appendingPathComponent(endpoint.path), resolvingAgainstBaseURL: true)
        components?.queryItems = endpoint.queryItems

        guard let url = components?.url else {
            throw APIError.invalidURL(endpoint.path)
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        // Attach Bearer token if available
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Add any custom headers from the endpoint
        for (key, value) in endpoint.headers {
            request.setValue(value, forHTTPHeaderField: key)
        }

        // Encode the body if present
        if let body = endpoint.body {
            request.httpBody = try encoder.encode(body)
        }

        // Timeout
        request.timeoutInterval = endpoint.timeout

        return request
    }
}

/// Used for endpoints that return empty bodies (204 No Content, etc.)
private struct EmptyResponse: Decodable {}

/// Decode validation errors from the server (adjust to match your API)
struct ServerValidationError: Decodable {
    let errors: [String]
}
```

**Why `actor`?** An actor is like a class, but Swift guarantees that only one piece of code can access its properties at a time. This prevents race conditions — for example, two requests trying to read/write `authToken` simultaneously. If you're not familiar with concurrency yet, just think of it as "a thread-safe class."

---

## Step 4: Endpoint Abstraction — Type-Safe, Composable

Instead of scattering URL strings throughout your code, define each API call as a structured `Endpoint`. This makes your networking code self-documenting and impossible to mistype.

### Complete Endpoint Template

```swift
import Foundation

/// Describes a single API request — path, method, headers, body, and query parameters.
/// Create static methods or properties for each endpoint your app uses.
struct Endpoint: Sendable {
    let path: String
    let method: HTTPMethod
    let headers: [String: String]
    let queryItems: [URLQueryItem]?
    let body: (any Encodable & Sendable)?
    let timeout: TimeInterval

    init(
        path: String,
        method: HTTPMethod = .get,
        headers: [String: String] = [:],
        queryItems: [URLQueryItem]? = nil,
        body: (any Encodable & Sendable)? = nil,
        timeout: TimeInterval = 30
    ) {
        self.path = path
        self.method = method
        self.headers = headers
        self.queryItems = queryItems
        self.body = body
        self.timeout = timeout
    }
}

enum HTTPMethod: String, Sendable {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

// MARK: - Example Endpoints

/// Organize endpoints as static methods grouped by resource.
/// This keeps all your API surface in one place.
extension Endpoint {

    // --- Users ---

    static func getUsers(page: Int = 1, perPage: Int = 20) -> Endpoint {
        Endpoint(
            path: "/users",
            queryItems: [
                URLQueryItem(name: "page", value: "\(page)"),
                URLQueryItem(name: "per_page", value: "\(perPage)")
            ]
        )
    }

    static func getUser(id: Int) -> Endpoint {
        Endpoint(path: "/users/\(id)")
    }

    static func createUser(_ user: CreateUserRequest) -> Endpoint {
        Endpoint(path: "/users", method: .post, body: user)
    }

    static func updateUser(id: Int, _ update: UpdateUserRequest) -> Endpoint {
        Endpoint(path: "/users/\(id)", method: .put, body: update)
    }

    static func deleteUser(id: Int) -> Endpoint {
        Endpoint(path: "/users/\(id)", method: .delete)
    }

    // --- Posts ---

    static func getPosts(userId: Int? = nil) -> Endpoint {
        var queryItems: [URLQueryItem]? = nil
        if let userId {
            queryItems = [URLQueryItem(name: "user_id", value: "\(userId)")]
        }
        return Endpoint(path: "/posts", queryItems: queryItems)
    }
}

// MARK: - Request Bodies

struct CreateUserRequest: Encodable, Sendable {
    let name: String
    let email: String
}

struct UpdateUserRequest: Encodable, Sendable {
    let name: String?
    let email: String?
}
```

**Why this pattern?** When you write `Endpoint.getUser(id: 42)`, the compiler checks that `id` is an `Int`. You can't accidentally pass a string or forget a required parameter. Compare this to manually typing `"/users/\(id)"` every time — one typo and you get a 404 with no compile-time warning.

---

## Step 5: Error Handling — The APIError Enum

Network calls fail in many different ways. Your job is to catch each kind of failure and translate it into something the user can understand.

### Complete APIError Template

```swift
import Foundation

/// Every way a network request can fail, organized from most common to least.
enum APIError: LocalizedError, Sendable {

    // Network-level (no response from server)
    case network(URLError)

    // Response-level (server responded, but something's wrong)
    case invalidResponse
    case invalidURL(String)
    case unauthorized           // 401
    case forbidden              // 403
    case notFound               // 404
    case validationFailed([String]) // 422
    case rateLimited(retryAfter: Double?) // 429
    case server(statusCode: Int) // 500-599
    case httpError(statusCode: Int, data: Data)

    // Decoding-level (response was valid HTTP, but JSON didn't match our model)
    case decodingFailed(Error)

    // Catch-all
    case unknown(Error)

    // MARK: - User-Facing Messages

    /// A message safe to show directly to the user.
    /// Technical details are deliberately omitted — log those separately.
    var errorDescription: String? {
        switch self {
        case .network(let urlError):
            switch urlError.code {
            case .notConnectedToInternet:
                return "You're offline. Check your connection and try again."
            case .timedOut:
                return "The request timed out. Try again in a moment."
            case .cancelled:
                return nil // User cancelled — no message needed
            default:
                return "Couldn't reach the server. Try again."
            }
        case .invalidResponse, .invalidURL:
            return "Something went wrong. Please try again."
        case .unauthorized:
            return "Your session has expired. Please sign in again."
        case .forbidden:
            return "You don't have permission to do that."
        case .notFound:
            return "The content you're looking for doesn't exist."
        case .validationFailed(let errors):
            return errors.joined(separator: "\n")
        case .rateLimited:
            return "Too many requests. Please wait a moment."
        case .server:
            return "The server is having trouble. Try again later."
        case .httpError:
            return "Something went wrong. Please try again."
        case .decodingFailed:
            return "We received unexpected data. The app may need an update."
        case .unknown:
            return "An unexpected error occurred."
        }
    }

    // MARK: - Retry Logic

    /// Whether this error is worth retrying automatically.
    var isRetryable: Bool {
        switch self {
        case .network(let urlError):
            return urlError.code == .timedOut || urlError.code == .networkConnectionLost
        case .server:
            return true
        case .rateLimited:
            return true
        default:
            return false
        }
    }

    /// Suggested delay before retrying, in seconds.
    var suggestedRetryDelay: TimeInterval {
        switch self {
        case .rateLimited(let retryAfter):
            return retryAfter ?? 5.0
        case .server:
            return 2.0
        case .network:
            return 1.0
        default:
            return 0
        }
    }
}
```

**Mental model:** Think of errors in three layers:
1. **Network** — the request never reached the server (offline, timeout, DNS failure)
2. **HTTP** — the server responded, but with an error status code (401, 404, 500)
3. **Decoding** — the server responded with 200 OK, but the JSON didn't match your Swift struct

Each layer needs different handling. Network errors might be retryable. HTTP 401 means "log the user out." Decoding errors usually mean your model is out of date.

---

## Step 6: Authentication Patterns

### API Key in Header

The simplest approach. The server gives you a key, you send it with every request.

```swift
// Add to your Endpoint or set it in APIClient init
extension Endpoint {
    static func withAPIKey(_ key: String) -> [String: String] {
        ["X-API-Key": key]
    }
}

// Usage: headers are merged into every request
let endpoint = Endpoint(
    path: "/weather",
    headers: Endpoint.withAPIKey("your-api-key-here")
)
```

### Bearer Token with Refresh

Most real apps use this pattern. The user logs in, gets a short-lived access token and a long-lived refresh token. When the access token expires, use the refresh token to get a new one — without making the user log in again.

```swift
/// Manages auth tokens with automatic refresh.
actor AuthManager {
    private let client: APIClient
    private var accessToken: String?
    private var refreshToken: String?
    private var isRefreshing = false
    private var refreshContinuations: [CheckedContinuation<String, Error>] = []

    init(client: APIClient) {
        self.client = client
    }

    /// Get a valid access token, refreshing if needed.
    func validToken() async throws -> String {
        if let token = accessToken {
            return token
        }

        // If another call is already refreshing, wait for it
        if isRefreshing {
            return try await withCheckedThrowingContinuation { continuation in
                refreshContinuations.append(continuation)
            }
        }

        return try await refreshAccessToken()
    }

    private func refreshAccessToken() async throws -> String {
        guard let refresh = refreshToken else {
            throw APIError.unauthorized
        }

        isRefreshing = true
        defer {
            isRefreshing = false
            refreshContinuations.removeAll()
        }

        do {
            let response: TokenResponse = try await client.request(
                Endpoint(
                    path: "/auth/refresh",
                    method: .post,
                    body: RefreshRequest(refreshToken: refresh)
                )
            )

            self.accessToken = response.accessToken
            self.refreshToken = response.refreshToken

            // Resume anyone who was waiting
            for continuation in refreshContinuations {
                continuation.resume(returning: response.accessToken)
            }

            return response.accessToken
        } catch {
            for continuation in refreshContinuations {
                continuation.resume(throwing: error)
            }
            throw error
        }
    }

    func setTokens(access: String, refresh: String) {
        self.accessToken = access
        self.refreshToken = refresh
    }

    func clearTokens() {
        self.accessToken = nil
        self.refreshToken = nil
    }
}

struct TokenResponse: Decodable {
    let accessToken: String
    let refreshToken: String
}

struct RefreshRequest: Encodable, Sendable {
    let refreshToken: String
}
```

### OAuth2 with PKCE (Sign in with Google/Apple)

For OAuth2, use `ASWebAuthenticationSession` — Apple's built-in browser that handles the redirect flow securely.

```swift
import AuthenticationServices

actor OAuth2Manager {
    private let clientID: String
    private let redirectURI: String
    private let authURL: URL
    private let tokenURL: URL

    init(clientID: String, redirectURI: String, authURL: URL, tokenURL: URL) {
        self.clientID = clientID
        self.redirectURI = redirectURI
        self.authURL = authURL
        self.tokenURL = tokenURL
    }

    @MainActor
    func authenticate() async throws -> TokenResponse {
        // 1. Generate PKCE challenge
        let verifier = generateCodeVerifier()
        let challenge = generateCodeChallenge(from: verifier)

        // 2. Build the authorization URL
        var components = URLComponents(url: authURL, resolvingAgainstBaseURL: true)!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "scope", value: "openid profile email"),
        ]

        // 3. Open the browser
        let callbackURL = try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: components.url!,
                callbackURLScheme: "myapp"
            ) { url, error in
                if let error { continuation.resume(throwing: error) }
                else if let url { continuation.resume(returning: url) }
                else { continuation.resume(throwing: APIError.unauthorized) }
            }
            session.presentationContextProvider = nil // Uses the key window
            session.prefersEphemeralWebBrowserSession = true
            session.start()
        }

        // 4. Extract the auth code from the callback URL
        let code = URLComponents(url: callbackURL, resolvingAgainstBaseURL: true)?
            .queryItems?.first(where: { $0.name == "code" })?.value
        guard let code else { throw APIError.unauthorized }

        // 5. Exchange code for tokens
        return try await exchangeCodeForToken(code: code, verifier: verifier)
    }

    private func exchangeCodeForToken(code: String, verifier: String) async throws -> TokenResponse {
        // POST to tokenURL with the code + verifier
        // Implementation depends on your OAuth provider
        fatalError("Implement token exchange for your provider")
    }

    private func generateCodeVerifier() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return Data(bytes).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private func generateCodeChallenge(from verifier: String) -> String {
        let data = Data(verifier.utf8)
        var hash = [UInt8](repeating: 0, count: 32)
        data.withUnsafeBytes { _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash) }
        return Data(hash).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
```

---

## Step 7: Loading States in Views — AsyncContentView

Every screen that loads data from the network goes through three states: loading, loaded, and error. Instead of writing this logic in every view, extract it into a reusable pattern.

### Complete AsyncContentView Template

```swift
import SwiftUI

/// The three states any async-loaded content can be in.
enum LoadingState<Value> {
    case idle
    case loading
    case loaded(Value)
    case error(Error)

    var value: Value? {
        if case .loaded(let v) = self { return v }
        return nil
    }

    var isLoading: Bool {
        if case .loading = self { return true }
        return false
    }
}

/// A reusable view that handles loading/loaded/error states.
///
/// Usage:
///   AsyncContentView(
///       source: viewModel,
///       content: { users in
///           List(users) { user in Text(user.name) }
///       }
///   )
struct AsyncContentView<Source: LoadableObject, Content: View>: View {
    @ObservedObject var source: Source
    let content: (Source.Output) -> Content

    var body: some View {
        switch source.state {
        case .idle:
            Color.clear.onAppear { source.load() }

        case .loading:
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)

        case .loaded(let output):
            content(output)

        case .error(let error):
            ErrorView(error: error) {
                source.load()
            }
        }
    }
}

/// Any object that can load data and track its loading state.
@MainActor
protocol LoadableObject: ObservableObject {
    associatedtype Output
    var state: LoadingState<Output> { get }
    func load()
}

/// A reusable error view with retry button.
struct ErrorView: View {
    let error: Error
    let retry: () -> Void

    var body: some View {
        ContentUnavailableView {
            Label("Something Went Wrong", systemImage: "exclamationmark.triangle")
        } description: {
            Text(error.localizedDescription)
        } actions: {
            Button("Try Again", action: retry)
                .buttonStyle(.bordered)
        }
    }
}

// MARK: - Example ViewModel

@MainActor
final class UsersViewModel: LoadableObject {
    @Published var state: LoadingState<[User]> = .idle

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func load() {
        state = .loading
        Task {
            do {
                let users: [User] = try await client.request(.getUsers())
                state = .loaded(users)
            } catch {
                state = .error(error)
            }
        }
    }
}

// MARK: - Usage in a View

struct UsersScreen: View {
    @StateObject private var viewModel: UsersViewModel

    init(client: APIClient) {
        _viewModel = StateObject(wrappedValue: UsersViewModel(client: client))
    }

    var body: some View {
        NavigationStack {
            AsyncContentView(source: viewModel) { users in
                List(users) { user in
                    NavigationLink(user.userName) {
                        Text("User detail for \(user.userName)")
                    }
                }
            }
            .navigationTitle("Users")
            .refreshable {
                viewModel.load()
            }
        }
    }
}
```

---

## Step 8: Pagination — Cursor-Based and Offset-Based

Most APIs return data in pages. You need to load the first page, then load more as the user scrolls.

### Offset-Based Pagination

The simpler pattern. You tell the API "give me page 2, 20 items per page."

```swift
@MainActor
final class PaginatedListViewModel<Item: Decodable & Identifiable>: ObservableObject {
    @Published var items: [Item] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var hasMorePages = true

    private let client: APIClient
    private let endpoint: (Int, Int) -> Endpoint
    private var currentPage = 1
    private let perPage = 20

    /// - Parameter endpoint: A closure that builds the endpoint for a given page and perPage.
    init(client: APIClient, endpoint: @escaping (Int, Int) -> Endpoint) {
        self.client = client
        self.endpoint = endpoint
    }

    func loadFirstPage() {
        currentPage = 1
        items = []
        hasMorePages = true
        loadNextPage()
    }

    func loadNextPage() {
        guard !isLoading, hasMorePages else { return }

        isLoading = true
        Task {
            do {
                let newItems: [Item] = try await client.request(
                    endpoint(currentPage, perPage)
                )
                items.append(contentsOf: newItems)
                hasMorePages = newItems.count == perPage
                currentPage += 1
            } catch {
                self.error = error
            }
            isLoading = false
        }
    }

    /// Call this from the List row's `.onAppear` to trigger infinite scroll.
    func loadMoreIfNeeded(currentItem: Item) {
        guard let lastItem = items.last else { return }
        if currentItem.id == lastItem.id {
            loadNextPage()
        }
    }
}
```

### Cursor-Based Pagination

APIs like Twitter or GitHub use cursors. Instead of "page 2", you send the cursor from the previous response: "give me everything after cursor `abc123`."

```swift
@MainActor
final class CursorPaginatedViewModel<Item: Decodable & Identifiable>: ObservableObject {
    @Published var items: [Item] = []
    @Published var isLoading = false
    @Published var hasMore = true

    private let client: APIClient
    private let endpoint: (String?) -> Endpoint
    private var nextCursor: String?

    init(client: APIClient, endpoint: @escaping (String?) -> Endpoint) {
        self.client = client
        self.endpoint = endpoint
    }

    func loadMore() {
        guard !isLoading, hasMore else { return }
        isLoading = true

        Task {
            do {
                let response: CursorResponse<Item> = try await client.request(
                    endpoint(nextCursor)
                )
                items.append(contentsOf: response.data)
                nextCursor = response.nextCursor
                hasMore = response.nextCursor != nil
            } catch {
                // Handle error
            }
            isLoading = false
        }
    }
}

struct CursorResponse<T: Decodable>: Decodable {
    let data: [T]
    let nextCursor: String?
}
```

### Infinite Scroll View

```swift
struct InfiniteScrollList<Item: Decodable & Identifiable, Row: View>: View {
    @ObservedObject var viewModel: PaginatedListViewModel<Item>
    let row: (Item) -> Row

    var body: some View {
        List {
            ForEach(viewModel.items) { item in
                row(item)
                    .onAppear {
                        viewModel.loadMoreIfNeeded(currentItem: item)
                    }
            }

            if viewModel.isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            }
        }
        .refreshable {
            viewModel.loadFirstPage()
        }
        .onAppear {
            if viewModel.items.isEmpty {
                viewModel.loadFirstPage()
            }
        }
    }
}
```

---

## Step 9: Offline Caching — Stale-While-Revalidate

Show cached data immediately, then update in the background when fresh data arrives. This makes your app feel instant even on slow connections.

**Stale-while-revalidate** means: "Show the user what we have right now (even if it's old), and quietly fetch new data in the background. When the new data arrives, update the screen."

```swift
import Foundation

/// A simple disk cache that stores Codable values as JSON files.
actor DiskCache {
    private let directory: URL
    private let maxAge: TimeInterval // How old data can be before we consider it "stale"

    init(name: String = "APICache", maxAge: TimeInterval = 300) { // 5 min default
        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        self.directory = caches.appendingPathComponent(name)
        self.maxAge = maxAge
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    /// Save data to cache with a key (usually the endpoint path).
    func save<T: Encodable>(_ value: T, forKey key: String) throws {
        let entry = CacheEntry(
            data: try JSONEncoder().encode(value),
            timestamp: Date()
        )
        let fileURL = directory.appendingPathComponent(key.sha256Hash)
        try JSONEncoder().encode(entry).write(to: fileURL)
    }

    /// Load cached data. Returns nil if no cache exists.
    func load<T: Decodable>(forKey key: String, as type: T.Type) -> CachedValue<T>? {
        let fileURL = directory.appendingPathComponent(key.sha256Hash)
        guard let data = try? Data(contentsOf: fileURL),
              let entry = try? JSONDecoder().decode(CacheEntry.self, from: data),
              let value = try? JSONDecoder().decode(T.self, from: entry.data) else {
            return nil
        }

        let age = Date().timeIntervalSince(entry.timestamp)
        return CachedValue(value: value, isStale: age > maxAge)
    }

    /// Clear all cached data.
    func clear() throws {
        try FileManager.default.removeItem(at: directory)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }
}

struct CacheEntry: Codable {
    let data: Data
    let timestamp: Date
}

struct CachedValue<T> {
    let value: T
    let isStale: Bool
}

// MARK: - Usage with APIClient

extension APIClient {
    /// Fetch with stale-while-revalidate caching.
    /// Returns cached data immediately if available, then refreshes in background.
    func cachedRequest<T: Codable>(
        _ endpoint: Endpoint,
        cache: DiskCache,
        cacheKey: String
    ) async throws -> T {
        // 1. Check cache first
        if let cached: CachedValue<T> = await cache.load(forKey: cacheKey, as: T.self) {
            if !cached.isStale {
                return cached.value // Fresh cache — no network needed
            }
            // Stale cache — return it but refresh in background
            Task {
                if let fresh: T = try? await self.request(endpoint) {
                    try? await cache.save(fresh, forKey: cacheKey)
                }
            }
            return cached.value
        }

        // 2. No cache — fetch from network
        let value: T = try await request(endpoint)
        try? await cache.save(value, forKey: cacheKey)
        return value
    }
}

// Helper for cache key hashing
import CryptoKit

extension String {
    var sha256Hash: String {
        let data = Data(self.utf8)
        let hash = SHA256.hash(data: data)
        return hash.map { String(format: "%02x", $0) }.joined()
    }
}
```

---

## Step 10: WebSocket — Real-Time Data

For chat, live feeds, or real-time updates. Uses Apple's built-in `URLSessionWebSocketTask`.

```swift
import Foundation

/// A WebSocket connection that exposes incoming messages as an AsyncStream.
actor WebSocketClient {
    private var task: URLSessionWebSocketTask?
    private let session: URLSession
    private var continuation: AsyncStream<WebSocketMessage>.Continuation?

    init(session: URLSession = .shared) {
        self.session = session
    }

    /// Connect to a WebSocket URL and return a stream of messages.
    func connect(to url: URL) -> AsyncStream<WebSocketMessage> {
        // Disconnect any existing connection
        disconnect()

        let task = session.webSocketTask(with: url)
        self.task = task

        let stream = AsyncStream<WebSocketMessage> { continuation in
            self.continuation = continuation

            // When the stream is cancelled, clean up
            continuation.onTermination = { @Sendable _ in
                task.cancel(with: .normalClosure, reason: nil)
            }
        }

        task.resume()

        // Start the receive loop
        Task { await receiveLoop() }

        return stream
    }

    /// Send a text message.
    func send(_ text: String) async throws {
        guard let task else { throw APIError.network(URLError(.badServerResponse)) }
        try await task.send(.string(text))
    }

    /// Send an Encodable value as JSON.
    func send<T: Encodable>(_ value: T) async throws {
        let data = try JSONEncoder().encode(value)
        guard let task else { throw APIError.network(URLError(.badServerResponse)) }
        try await task.send(.data(data))
    }

    /// Disconnect and clean up.
    func disconnect() {
        task?.cancel(with: .normalClosure, reason: nil)
        task = nil
        continuation?.finish()
        continuation = nil
    }

    // MARK: - Private

    private func receiveLoop() async {
        guard let task else { return }

        while task.state == .running {
            do {
                let message = try await task.receive()
                switch message {
                case .string(let text):
                    continuation?.yield(.text(text))
                case .data(let data):
                    continuation?.yield(.data(data))
                @unknown default:
                    break
                }
            } catch {
                continuation?.yield(.disconnected(error))
                continuation?.finish()
                break
            }
        }
    }
}

enum WebSocketMessage {
    case text(String)
    case data(Data)
    case disconnected(Error)
}

// MARK: - Usage Example

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [String] = []
    private let ws = WebSocketClient()

    func connect() {
        Task {
            let stream = await ws.connect(to: URL(string: "wss://echo.websocket.org")!)
            for await message in stream {
                switch message {
                case .text(let text):
                    messages.append(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        messages.append(text)
                    }
                case .disconnected:
                    messages.append("[Disconnected]")
                }
            }
        }
    }

    func send(_ text: String) {
        Task { try? await ws.send(text) }
    }
}
```

---

## Step 11: Testing — Mock URLProtocol

You don't want your tests hitting real servers. Instead, intercept all network requests with a custom `URLProtocol` that returns fake responses.

```swift
import Foundation
import XCTest

/// A URLProtocol subclass that intercepts requests and returns mock responses.
/// Register handlers before each test to control exactly what the "server" returns.
final class MockURLProtocol: URLProtocol {
    /// Map of URL path -> mock handler. Set this in your test's setUp.
    nonisolated(unsafe) static var handlers: [String: (URLRequest) throws -> (Data, HTTPURLResponse)] = [:]

    override class func canInit(with request: URLRequest) -> Bool {
        true // Intercept everything
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        guard let path = request.url?.path,
              let handler = Self.handlers[path] else {
            // No handler registered — return 404
            let response = HTTPURLResponse(
                url: request.url!, statusCode: 404,
                httpVersion: nil, headerFields: nil
            )!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocolDidFinishLoading(self)
            return
        }

        do {
            let (data, response) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

// MARK: - Test Helpers

extension MockURLProtocol {
    /// Register a handler that returns JSON data with a 200 status.
    static func mockSuccess<T: Encodable>(path: String, response: T) {
        handlers[path] = { _ in
            let data = try JSONEncoder().encode(response)
            let httpResponse = HTTPURLResponse(
                url: URL(string: "https://api.test.com\(path)")!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (data, httpResponse)
        }
    }

    /// Register a handler that returns an HTTP error.
    static func mockError(path: String, statusCode: Int) {
        handlers[path] = { _ in
            let httpResponse = HTTPURLResponse(
                url: URL(string: "https://api.test.com\(path)")!,
                statusCode: statusCode,
                httpVersion: nil,
                headerFields: nil
            )!
            return (Data(), httpResponse)
        }
    }

    /// Register a handler that simulates a timeout.
    static func mockTimeout(path: String) {
        handlers[path] = { _ in
            throw URLError(.timedOut)
        }
    }

    /// Clear all handlers between tests.
    static func reset() {
        handlers = [:]
    }
}

// MARK: - Test Configuration

/// Create a URLSession configured to use the mock protocol.
func makeMockSession() -> URLSession {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [MockURLProtocol.self]
    return URLSession(configuration: config)
}

/// Create an APIClient wired to the mock session.
func makeMockClient() -> APIClient {
    APIClient(
        baseURL: URL(string: "https://api.test.com")!,
        session: makeMockSession()
    )
}

// MARK: - Example Tests

final class APIClientTests: XCTestCase {
    var client: APIClient!

    override func setUp() {
        super.setUp()
        MockURLProtocol.reset()
        client = makeMockClient()
    }

    func testGetUsersSuccess() async throws {
        // Arrange
        let mockUsers = [
            User(id: 1, userName: "Alice", createdAt: Date()),
            User(id: 2, userName: "Bob", createdAt: Date()),
        ]
        MockURLProtocol.mockSuccess(path: "/users", response: mockUsers)

        // Act
        let users: [User] = try await client.request(.getUsers())

        // Assert
        XCTAssertEqual(users.count, 2)
        XCTAssertEqual(users[0].userName, "Alice")
    }

    func testUnauthorizedThrows() async {
        MockURLProtocol.mockError(path: "/users", statusCode: 401)

        do {
            let _: [User] = try await client.request(.getUsers())
            XCTFail("Expected unauthorized error")
        } catch let error as APIError {
            XCTAssertEqual(error.errorDescription, "Your session has expired. Please sign in again.")
        } catch {
            XCTFail("Wrong error type: \(error)")
        }
    }

    func testTimeoutThrowsNetworkError() async {
        MockURLProtocol.mockTimeout(path: "/users")

        do {
            let _: [User] = try await client.request(.getUsers())
            XCTFail("Expected timeout error")
        } catch let error as APIError {
            XCTAssertTrue(error.isRetryable)
        } catch {
            XCTFail("Wrong error type: \(error)")
        }
    }
}
```

---

## Step 12: Environment Switching — Dev/Staging/Prod

Use Xcode build configurations and schemes to switch between different API environments without changing code.

### Step 12a: Define the Environments

```swift
import Foundation

enum AppEnvironment: String {
    case development
    case staging
    case production

    /// Read from Info.plist, set via build configuration.
    static var current: AppEnvironment {
        guard let value = Bundle.main.infoDictionary?["API_ENVIRONMENT"] as? String,
              let env = AppEnvironment(rawValue: value) else {
            #if DEBUG
            return .development
            #else
            return .production
            #endif
        }
        return env
    }

    var baseURL: URL {
        switch self {
        case .development: return URL(string: "http://localhost:8080/api/v1")!
        case .staging:     return URL(string: "https://staging-api.example.com/v1")!
        case .production:  return URL(string: "https://api.example.com/v1")!
        }
    }

    var logLevel: LogLevel {
        switch self {
        case .development: return .verbose
        case .staging:     return .info
        case .production:  return .error
        }
    }
}

enum LogLevel: Int, Comparable {
    case verbose, info, warning, error
    static func < (lhs: LogLevel, rhs: LogLevel) -> Bool { lhs.rawValue < rhs.rawValue }
}
```

### Step 12b: Xcode Configuration

1. In Xcode, go to **Project > Info > Configurations**
2. Duplicate "Debug" and name it "Staging"
3. In your target's **Build Settings**, add a user-defined setting: `API_ENVIRONMENT`
   - Debug: `development`
   - Staging: `staging`
   - Release: `production`
4. In **Info.plist**, add: `API_ENVIRONMENT = $(API_ENVIRONMENT)`
5. Create schemes: "MyApp-Dev", "MyApp-Staging", "MyApp-Prod" — each using the corresponding build configuration

### Step 12c: Wire It Up at App Launch

```swift
import SwiftUI

@main
struct MyApp: App {
    let client: APIClient

    init() {
        let env = AppEnvironment.current
        self.client = APIClient(baseURL: env.baseURL)
        print("Running in \(env.rawValue) environment: \(env.baseURL)")
    }

    var body: some Scene {
        WindowGroup {
            UsersScreen(client: client)
        }
    }
}
```

---

## Quick Start Checklist

If you want the fastest path to a working network layer:

1. Define your Codable model from the API response (Step 2)
2. Copy the APIClient (Step 3) and Endpoint (Step 4) templates
3. Copy the APIError enum (Step 5)
4. Write your first endpoint as a static method on Endpoint
5. Call it from a SwiftUI view using AsyncContentView (Step 7)
6. Add tests with MockURLProtocol (Step 11)

Everything else — auth, pagination, caching, WebSocket, environment switching — add when you need it.
