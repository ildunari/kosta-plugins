# API Error Handling Patterns

A decision tree for handling every kind of network error in iOS. Covers which errors to retry, which to show the user, and which to handle silently.

---

## The Decision Tree

When a network request fails, ask these questions in order:

```
Request failed
  |
  +-- Is the device offline?
  |     YES -> Show offline banner, queue for retry when connectivity returns
  |     NO  -> continue
  |
  +-- Did the request time out?
  |     YES -> Retry automatically (up to 3 times with exponential backoff)
  |     NO  -> continue
  |
  +-- What HTTP status code?
        |
        +-- 401 Unauthorized
        |     -> Try refreshing the auth token silently
        |     -> If refresh fails, show "Session expired. Please sign in again."
        |     -> Navigate to login screen
        |
        +-- 403 Forbidden
        |     -> Show "You don't have permission to do that."
        |     -> Do NOT retry (the user genuinely lacks access)
        |
        +-- 404 Not Found
        |     -> Show "This content doesn't exist or has been removed."
        |     -> Remove stale references if applicable
        |
        +-- 409 Conflict
        |     -> Show "This was modified by someone else. Refresh to see the latest."
        |     -> Offer to reload
        |
        +-- 422 Validation Error
        |     -> Parse the error body for field-level messages
        |     -> Show inline errors on the form (not an alert)
        |
        +-- 429 Rate Limited
        |     -> Read Retry-After header
        |     -> Wait that many seconds, then retry automatically
        |     -> Log the event (you may need to adjust request frequency)
        |     -> Do NOT show the user anything unless it persists
        |
        +-- 500 Internal Server Error
        |     -> Retry once after 2 seconds
        |     -> If still failing, show "Something went wrong on our end."
        |
        +-- 502 Bad Gateway / 503 Service Unavailable
        |     -> Retry up to 3 times with exponential backoff (1s, 2s, 4s)
        |     -> Show "The server is temporarily unavailable" only after all retries fail
        |
        +-- Decoding error (response was 200 but JSON didn't match)
              -> Log the raw response for debugging
              -> Show "We received unexpected data. The app may need an update."
              -> Do NOT retry (the server response won't change)
```

---

## Complete APIError Enum with User-Facing Messages

```swift
import Foundation

enum APIError: LocalizedError, Sendable {

    // --- Network Layer ---
    case offline
    case timeout
    case networkError(URLError)

    // --- HTTP Status Codes ---
    case unauthorized                       // 401
    case forbidden                          // 403
    case notFound                           // 404
    case conflict                           // 409
    case validationFailed([ValidationError]) // 422
    case rateLimited(retryAfter: TimeInterval?) // 429
    case serverError(statusCode: Int)       // 500-599

    // --- Data Layer ---
    case decodingFailed(context: String)    // JSON didn't match model
    case emptyResponse                      // Expected data, got nothing

    // --- App Layer ---
    case cancelled                          // User cancelled the operation
    case unknown(Error)

    // MARK: - User-Facing Message

    var errorDescription: String? {
        switch self {
        case .offline:
            return "You're offline. Check your connection and try again."
        case .timeout:
            return "The request timed out. Please try again."
        case .networkError:
            return "Couldn't reach the server. Please try again."
        case .unauthorized:
            return "Your session has expired. Please sign in again."
        case .forbidden:
            return "You don't have permission to do that."
        case .notFound:
            return "This content doesn't exist or has been removed."
        case .conflict:
            return "This was modified by someone else. Refresh to see the latest."
        case .validationFailed(let errors):
            // Join all field errors into one message
            return errors.map(\.message).joined(separator: "\n")
        case .rateLimited:
            return "Too many requests. Please wait a moment and try again."
        case .serverError:
            return "Something went wrong on our end. Please try again later."
        case .decodingFailed:
            return "We received unexpected data. The app may need an update."
        case .emptyResponse:
            return "No data received. Please try again."
        case .cancelled:
            return nil // Don't show anything — the user chose to cancel
        case .unknown:
            return "An unexpected error occurred. Please try again."
        }
    }

    // MARK: - Retry Classification

    /// Whether this error should be retried automatically.
    var retryStrategy: RetryStrategy {
        switch self {
        case .timeout, .networkError:
            return .retryWithBackoff(maxAttempts: 3, initialDelay: 1.0)
        case .serverError(let code) where code == 502 || code == 503:
            return .retryWithBackoff(maxAttempts: 3, initialDelay: 1.0)
        case .serverError:
            return .retryOnce(delay: 2.0)
        case .rateLimited(let retryAfter):
            return .retryOnce(delay: retryAfter ?? 5.0)
        case .offline, .unauthorized, .forbidden, .notFound, .conflict,
             .validationFailed, .decodingFailed, .emptyResponse,
             .cancelled, .unknown:
            return .doNotRetry
        }
    }

    /// Whether this error means the user needs to re-authenticate.
    var requiresReauth: Bool {
        if case .unauthorized = self { return true }
        return false
    }

    /// Whether this error should be logged to your crash reporter.
    var shouldLog: Bool {
        switch self {
        case .cancelled, .offline:
            return false // Normal user/device behavior
        case .rateLimited:
            return true  // Indicates a potential bug in request frequency
        default:
            return true
        }
    }
}

struct ValidationError: Sendable {
    let field: String
    let message: String
}

enum RetryStrategy: Sendable {
    case doNotRetry
    case retryOnce(delay: TimeInterval)
    case retryWithBackoff(maxAttempts: Int, initialDelay: TimeInterval)
}
```

---

## Automatic Retry Implementation

```swift
extension APIClient {
    /// Execute a request with automatic retry based on the error's retry strategy.
    func requestWithRetry<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        var lastError: APIError?

        // Determine max attempts from the first error's strategy (default: 1 attempt)
        var maxAttempts = 1
        var delay: TimeInterval = 0

        for attempt in 1...3 { // Hard cap at 3 attempts
            do {
                return try await request(endpoint)
            } catch let error as APIError {
                lastError = error

                // Check if we should retry
                switch error.retryStrategy {
                case .doNotRetry:
                    throw error

                case .retryOnce(let retryDelay):
                    if attempt >= 2 { throw error } // Already retried once
                    maxAttempts = 2
                    delay = retryDelay

                case .retryWithBackoff(let max, let initialDelay):
                    if attempt >= max { throw error }
                    maxAttempts = max
                    // Exponential backoff: 1s, 2s, 4s
                    delay = initialDelay * pow(2.0, Double(attempt - 1))
                }

                // Wait before retrying
                try await Task.sleep(for: .seconds(delay))
            }
        }

        throw lastError ?? APIError.unknown(NSError(domain: "Retry", code: 0))
    }
}
```

---

## Mapping URLError to APIError

Call this in your APIClient when `URLSession.data(for:)` throws.

```swift
extension APIError {
    /// Convert a URLError into a more specific APIError.
    static func from(_ urlError: URLError) -> APIError {
        switch urlError.code {
        case .notConnectedToInternet, .dataNotAllowed:
            return .offline
        case .timedOut:
            return .timeout
        case .cancelled:
            return .cancelled
        case .networkConnectionLost:
            return .networkError(urlError)
        default:
            return .networkError(urlError)
        }
    }
}
```

---

## Mapping HTTP Status to APIError

Call this after checking `HTTPURLResponse.statusCode`.

```swift
extension APIError {
    /// Convert an HTTP status code and response data into an APIError.
    static func from(statusCode: Int, data: Data, decoder: JSONDecoder) -> APIError? {
        switch statusCode {
        case 200...299:
            return nil // Success — no error
        case 401:
            return .unauthorized
        case 403:
            return .forbidden
        case 404:
            return .notFound
        case 409:
            return .conflict
        case 422:
            // Try to parse validation errors from the response body
            if let serverErrors = try? decoder.decode(ServerValidationResponse.self, from: data) {
                let errors = serverErrors.errors.map {
                    ValidationError(field: $0.field, message: $0.message)
                }
                return .validationFailed(errors)
            }
            return .validationFailed([ValidationError(field: "", message: "Invalid input")])
        case 429:
            return .rateLimited(retryAfter: nil) // Caller should check Retry-After header
        case 500...599:
            return .serverError(statusCode: statusCode)
        default:
            return .unknown(NSError(domain: "HTTP", code: statusCode))
        }
    }
}

/// What the server returns for 422 errors (adjust to match your API)
private struct ServerValidationResponse: Decodable {
    struct FieldError: Decodable {
        let field: String
        let message: String
    }
    let errors: [FieldError]
}
```

---

## Alert Presentation Patterns in SwiftUI

### Pattern 1: Simple Alert from APIError

```swift
struct ContentView: View {
    @State private var error: APIError?
    @State private var showError = false

    var body: some View {
        Text("Hello")
            .alert("Error", isPresented: $showError, presenting: error) { error in
                // Buttons
                if error.retryStrategy != .doNotRetry {
                    Button("Retry") { retryLastAction() }
                }
                if error.requiresReauth {
                    Button("Sign In") { navigateToLogin() }
                }
                Button("OK", role: .cancel) {}
            } message: { error in
                Text(error.localizedDescription)
            }
    }

    private func handleError(_ apiError: APIError) {
        // Skip cancelled errors — don't show anything
        guard apiError.errorDescription != nil else { return }
        self.error = apiError
        self.showError = true
    }
}
```

### Pattern 2: Inline Error Banner (Non-Blocking)

Better UX for non-critical errors — shows a banner instead of blocking the screen.

```swift
struct ErrorBanner: View {
    let error: APIError
    let retry: (() -> Void)?
    let dismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(iconColor)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.bold())
                if let message = error.errorDescription {
                    Text(message)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if let retry {
                Button("Retry", action: retry)
                    .font(.subheadline.bold())
            }

            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.caption)
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }

    private var title: String {
        switch error {
        case .offline: return "No Connection"
        case .serverError: return "Server Error"
        case .unauthorized: return "Session Expired"
        default: return "Error"
        }
    }

    private var icon: String {
        switch error {
        case .offline: return "wifi.slash"
        case .serverError: return "exclamationmark.icloud"
        case .unauthorized: return "lock"
        default: return "exclamationmark.triangle"
        }
    }

    private var iconColor: Color {
        switch error {
        case .offline: return .orange
        case .serverError: return .red
        case .unauthorized: return .yellow
        default: return .red
        }
    }
}
```

### Pattern 3: Form Validation Errors (Inline per Field)

For 422 errors, show the error message next to the offending field.

```swift
struct SignUpForm: View {
    @State private var name = ""
    @State private var email = ""
    @State private var fieldErrors: [String: String] = [:]
    // fieldErrors maps field name -> error message, e.g. ["email": "is already taken"]

    var body: some View {
        Form {
            Section {
                VStack(alignment: .leading) {
                    TextField("Name", text: $name)
                    if let error = fieldErrors["name"] {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }

                VStack(alignment: .leading) {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                    if let error = fieldErrors["email"] {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
            }

            Button("Sign Up") { submit() }
        }
    }

    private func submit() {
        fieldErrors = [:] // Clear previous errors
        Task {
            do {
                // ... make API call
            } catch APIError.validationFailed(let errors) {
                // Map validation errors to field names
                for error in errors {
                    fieldErrors[error.field] = error.message
                }
            } catch {
                // Handle other errors with an alert
            }
        }
    }
}
```

### Pattern 4: Offline Banner with Connectivity Monitoring

```swift
import Network

@MainActor
final class ConnectivityMonitor: ObservableObject {
    @Published var isConnected = true
    private let monitor = NWPathMonitor()

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                self?.isConnected = path.status == .satisfied
            }
        }
        monitor.start(queue: DispatchQueue(label: "connectivity"))
    }

    deinit { monitor.cancel() }
}

struct AppRootView: View {
    @StateObject private var connectivity = ConnectivityMonitor()

    var body: some View {
        ZStack(alignment: .top) {
            // Your main content
            NavigationStack {
                Text("Main App")
            }

            // Offline banner slides in from the top
            if !connectivity.isConnected {
                HStack {
                    Image(systemName: "wifi.slash")
                    Text("You're offline")
                }
                .font(.subheadline.bold())
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(.orange)
                .transition(.move(edge: .top))
            }
        }
        .animation(.default, value: connectivity.isConnected)
    }
}
```

---

## Quick Reference: Error Handling Cheat Sheet

| Error | Show User? | Retry? | Log? |
|-------|-----------|--------|------|
| Offline | Banner | When connection returns | No |
| Timeout | After retries fail | 3x with backoff | Yes |
| 401 Unauthorized | "Sign in again" | After token refresh | Yes |
| 403 Forbidden | "No permission" | Never | Yes |
| 404 Not Found | "Doesn't exist" | Never | Yes |
| 409 Conflict | "Modified by someone else" | Never | Yes |
| 422 Validation | Inline per field | Never | Yes |
| 429 Rate Limited | Only if persists | After Retry-After delay | Yes |
| 500 Server Error | After retry fails | Once after 2s | Yes |
| 502/503 Unavailable | After retries fail | 3x with backoff | Yes |
| Decoding Error | "App may need update" | Never | Yes |
| User Cancelled | Never | Never | No |
