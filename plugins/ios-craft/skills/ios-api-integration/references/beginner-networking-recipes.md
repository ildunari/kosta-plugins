# Beginner Networking Recipes

10 complete, copy-paste Swift networking recipes. Each one works standalone with the `APIClient` and `Endpoint` types from the main skill. Every recipe is 20-40 lines with inline comments explaining each step.

---

## Recipe 1: GET a List of Items

Fetch an array of items from a REST endpoint.

```swift
// Model
struct Post: Codable, Identifiable {
    let id: Int
    let title: String
    let body: String
    let userId: Int
}

// Endpoint
extension Endpoint {
    static var listPosts: Endpoint {
        Endpoint(path: "/posts")
    }
}

// Usage in a ViewModel
@MainActor
final class PostsViewModel: ObservableObject {
    @Published var posts: [Post] = []
    @Published var isLoading = false
    private let client: APIClient

    init(client: APIClient) { self.client = client }

    func fetchPosts() {
        isLoading = true
        Task {
            do {
                posts = try await client.request(.listPosts)
            } catch {
                print("Failed to load posts: \(error.localizedDescription)")
            }
            isLoading = false
        }
    }
}
```

---

## Recipe 2: GET a Single Item by ID

Fetch one resource using a path parameter.

```swift
// Endpoint — the ID goes right into the path
extension Endpoint {
    static func getPost(id: Int) -> Endpoint {
        Endpoint(path: "/posts/\(id)")
    }
}

// Usage
@MainActor
final class PostDetailViewModel: ObservableObject {
    @Published var post: Post?
    @Published var error: Error?
    private let client: APIClient
    private let postId: Int

    init(client: APIClient, postId: Int) {
        self.client = client
        self.postId = postId
    }

    func load() {
        Task {
            do {
                // The generic type is inferred from the property type
                post = try await client.request(.getPost(id: postId))
            } catch {
                self.error = error
            }
        }
    }
}
```

---

## Recipe 3: POST with JSON Body

Create a new resource by sending JSON in the request body.

```swift
// Request body — what we send to the server
struct CreatePostRequest: Encodable, Sendable {
    let title: String
    let body: String
    let userId: Int
}

// Endpoint
extension Endpoint {
    static func createPost(_ request: CreatePostRequest) -> Endpoint {
        Endpoint(
            path: "/posts",
            method: .post,
            body: request  // APIClient encodes this as JSON automatically
        )
    }
}

// Usage
func createNewPost(client: APIClient) async throws -> Post {
    let request = CreatePostRequest(
        title: "My First Post",
        body: "Hello from Swift!",
        userId: 1
    )
    // Server returns the created post with an assigned ID
    let createdPost: Post = try await client.request(.createPost(request))
    return createdPost
}
```

---

## Recipe 4: PUT Update

Replace a resource entirely with new data.

```swift
// Request body for the update
struct UpdatePostRequest: Encodable, Sendable {
    let title: String
    let body: String
    let userId: Int
}

// Endpoint
extension Endpoint {
    static func updatePost(id: Int, _ request: UpdatePostRequest) -> Endpoint {
        Endpoint(
            path: "/posts/\(id)",
            method: .put,
            body: request
        )
    }
}

// Usage
func updateExistingPost(client: APIClient) async throws -> Post {
    let update = UpdatePostRequest(
        title: "Updated Title",
        body: "Updated body content",
        userId: 1
    )
    // Server returns the updated post
    let updated: Post = try await client.request(.updatePost(id: 1, update))
    return updated
}
```

---

## Recipe 5: DELETE

Remove a resource. Most DELETE endpoints return no body (204 No Content).

```swift
// Endpoint
extension Endpoint {
    static func deletePost(id: Int) -> Endpoint {
        Endpoint(path: "/posts/\(id)", method: .delete)
    }
}

// Usage — use requestVoid since DELETE returns no body
func removePost(client: APIClient, postId: Int) async throws {
    try await client.requestVoid(.deletePost(id: postId))
    // If we get here without throwing, the delete succeeded
    print("Post \(postId) deleted")
}

// In a SwiftUI view with swipe-to-delete
struct PostListView: View {
    @ObservedObject var viewModel: PostsViewModel
    let client: APIClient

    var body: some View {
        List {
            ForEach(viewModel.posts) { post in
                Text(post.title)
            }
            .onDelete { indexSet in
                Task {
                    for index in indexSet {
                        let post = viewModel.posts[index]
                        try? await client.requestVoid(.deletePost(id: post.id))
                    }
                    viewModel.posts.remove(atOffsets: indexSet)
                }
            }
        }
    }
}
```

---

## Recipe 6: Upload Image (Multipart Form Data)

Upload an image using multipart/form-data encoding.

```swift
import UIKit

extension APIClient {
    /// Upload an image as multipart form data.
    /// Multipart is like stuffing multiple items into one envelope —
    /// each part has a name, a filename, and its data.
    func uploadImage(
        _ image: UIImage,
        to path: String,
        fieldName: String = "image",
        compressionQuality: CGFloat = 0.8
    ) async throws -> UploadResponse {
        guard let imageData = image.jpegData(compressionQuality: compressionQuality) else {
            throw APIError.unknown(NSError(domain: "ImageConversion", code: 0))
        }

        // Build the multipart body manually
        let boundary = UUID().uuidString
        var body = Data()
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"\(fieldName)\"; filename=\"photo.jpg\"\r\n")
        body.append("Content-Type: image/jpeg\r\n\r\n")
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n")

        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body

        let (data, _) = try await session.data(for: request)
        return try decoder.decode(UploadResponse.self, from: data)
    }
}

struct UploadResponse: Decodable {
    let url: String       // The URL of the uploaded image
    let filename: String
}

// Helper to append strings to Data
extension Data {
    mutating func append(_ string: String) {
        if let data = string.data(using: .utf8) {
            append(data)
        }
    }
}
```

---

## Recipe 7: Download File with Progress

Download a file and track progress with a delegate.

```swift
import Foundation

/// Downloads a file and reports progress via an AsyncStream.
actor FileDownloader {
    private let session: URLSession

    init() {
        self.session = .shared
    }

    /// Download a file and yield progress updates (0.0 to 1.0).
    /// Returns the local file URL when complete.
    func download(from url: URL) -> (progress: AsyncStream<Double>, result: Task<URL, Error>) {
        var progressContinuation: AsyncStream<Double>.Continuation!
        let progressStream = AsyncStream<Double> { continuation in
            progressContinuation = continuation
        }

        let task = Task<URL, Error> {
            let (localURL, response) = try await session.download(from: url) { progress in
                // This closure fires as bytes arrive
                progressContinuation.yield(progress.fractionCompleted)
            }

            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                throw APIError.invalidResponse
            }

            // Move from temp location to Documents
            let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let fileName = url.lastPathComponent
            let destination = documents.appendingPathComponent(fileName)
            try? FileManager.default.removeItem(at: destination) // Remove if exists
            try FileManager.default.moveItem(at: localURL, to: destination)

            progressContinuation.yield(1.0)
            progressContinuation.finish()
            return destination
        }

        return (progressStream, task)
    }
}

// Simpler version — just download without progress tracking
func downloadFile(from url: URL) async throws -> URL {
    let (localURL, response) = try await URLSession.shared.download(from: url)
    guard let httpResponse = response as? HTTPURLResponse,
          (200...299).contains(httpResponse.statusCode) else {
        throw APIError.invalidResponse
    }
    let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    let destination = documents.appendingPathComponent(url.lastPathComponent)
    try? FileManager.default.removeItem(at: destination)
    try FileManager.default.moveItem(at: localURL, to: destination)
    return destination
}
```

---

## Recipe 8: Paginated List with Cursor

Fetch pages of data using a cursor (the API tells you where the next page starts).

```swift
// Server response includes a cursor for the next page
struct PaginatedResponse<T: Decodable>: Decodable {
    let items: [T]
    let nextCursor: String?  // nil means no more pages
}

// Endpoint that accepts an optional cursor
extension Endpoint {
    static func listNotifications(cursor: String? = nil, limit: Int = 25) -> Endpoint {
        var queryItems = [URLQueryItem(name: "limit", value: "\(limit)")]
        if let cursor {
            queryItems.append(URLQueryItem(name: "cursor", value: cursor))
        }
        return Endpoint(path: "/notifications", queryItems: queryItems)
    }
}

// ViewModel that accumulates pages
@MainActor
final class NotificationsViewModel: ObservableObject {
    @Published var notifications: [Notification] = []
    @Published var isLoading = false
    private var nextCursor: String?
    private var hasMore = true
    private let client: APIClient

    init(client: APIClient) { self.client = client }

    func loadNextPage() {
        guard !isLoading, hasMore else { return }
        isLoading = true
        Task {
            do {
                let page: PaginatedResponse<Notification> = try await client.request(
                    .listNotifications(cursor: nextCursor)
                )
                notifications.append(contentsOf: page.items)
                nextCursor = page.nextCursor
                hasMore = page.nextCursor != nil
            } catch {
                print("Pagination error: \(error.localizedDescription)")
            }
            isLoading = false
        }
    }

    /// Call from onAppear of each row to trigger infinite scroll
    func onItemAppear(_ item: Notification) {
        if item.id == notifications.last?.id {
            loadNextPage()
        }
    }
}
```

---

## Recipe 9: Auth Token Refresh with Automatic Retry

When a request fails with 401, refresh the token and retry once automatically.

```swift
extension APIClient {
    /// Make a request with automatic token refresh on 401.
    /// If the first attempt returns 401:
    ///   1. Refresh the auth token
    ///   2. Retry the original request exactly once
    ///   3. If it fails again, throw the error
    func authenticatedRequest<T: Decodable>(
        _ endpoint: Endpoint,
        authManager: AuthManager
    ) async throws -> T {
        // Ensure we have a valid token before the request
        let token = try await authManager.validToken()
        self.authToken = token

        do {
            return try await request(endpoint)
        } catch APIError.unauthorized {
            // Token expired — try refreshing
            let newToken = try await authManager.validToken()
            self.authToken = newToken

            // Retry once with the new token
            return try await request(endpoint)
        }
    }
}

// Usage — same as a normal request, but pass the AuthManager
func loadProfile(client: APIClient, auth: AuthManager) async throws -> UserProfile {
    try await client.authenticatedRequest(.getProfile, authManager: auth)
}

extension Endpoint {
    static var getProfile: Endpoint {
        Endpoint(path: "/me")
    }
}

struct UserProfile: Decodable {
    let id: Int
    let name: String
    let email: String
    let avatarURL: String?
}
```

---

## Recipe 10: WebSocket Connect and Listen

Open a WebSocket connection and process messages as they arrive.

```swift
import Foundation

/// Minimal WebSocket that yields messages as an AsyncStream.
actor SimpleWebSocket {
    private var task: URLSessionWebSocketTask?

    /// Connect and return a stream of string messages.
    func connect(to url: URL) -> AsyncStream<String> {
        task?.cancel(with: .normalClosure, reason: nil)
        let wsTask = URLSession.shared.webSocketTask(with: url)
        self.task = wsTask

        let stream = AsyncStream<String> { continuation in
            // Clean up when the stream is cancelled
            continuation.onTermination = { @Sendable _ in
                wsTask.cancel(with: .normalClosure, reason: nil)
            }

            // Recursive receive loop
            Task {
                while wsTask.state == .running {
                    do {
                        let message = try await wsTask.receive()
                        switch message {
                        case .string(let text):
                            continuation.yield(text)
                        case .data(let data):
                            if let text = String(data: data, encoding: .utf8) {
                                continuation.yield(text)
                            }
                        @unknown default:
                            break
                        }
                    } catch {
                        // Connection closed or error — end the stream
                        continuation.finish()
                        break
                    }
                }
            }
        }

        wsTask.resume()
        return stream
    }

    /// Send a text message through the WebSocket.
    func send(_ text: String) async throws {
        try await task?.send(.string(text))
    }

    /// Close the connection gracefully.
    func disconnect() {
        task?.cancel(with: .normalClosure, reason: nil)
        task = nil
    }
}

// Usage in SwiftUI
struct ChatView: View {
    @State private var messages: [String] = []
    @State private var inputText = ""
    private let ws = SimpleWebSocket()

    var body: some View {
        VStack {
            // Message list
            ScrollView {
                LazyVStack(alignment: .leading) {
                    ForEach(messages, id: \.self) { msg in
                        Text(msg).padding(.horizontal)
                    }
                }
            }
            // Input bar
            HStack {
                TextField("Message", text: $inputText)
                    .textFieldStyle(.roundedBorder)
                Button("Send") {
                    let text = inputText
                    inputText = ""
                    Task { try? await ws.send(text) }
                }
            }
            .padding()
        }
        .task {
            let stream = await ws.connect(to: URL(string: "wss://echo.websocket.org")!)
            for await message in stream {
                messages.append(message)
            }
        }
    }
}
```
