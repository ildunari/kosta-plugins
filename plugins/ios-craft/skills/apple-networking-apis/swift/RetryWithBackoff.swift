import Foundation

public struct RetryPolicy {
    public var maxAttempts: Int = 3
    public var baseDelay: TimeInterval = 0.5
    public var maxDelay: TimeInterval = 8.0
    public init() {}
}

public func withRetry<T>(policy: RetryPolicy = .init(), shouldRetry: @escaping (Error) -> Bool = { _ in true }, op: @escaping () async throws -> T) async throws -> T {
    var attempt = 0
    var lastError: Error?
    while attempt < policy.maxAttempts {
        if Task.isCancelled { throw CancellationError() }
        do { return try await op() } catch {
            lastError = error
            if !shouldRetry(error) { throw error }
            attempt += 1
            if attempt >= policy.maxAttempts { break }
            let exp = min(policy.baseDelay * pow(2, Double(attempt-1)), policy.maxDelay)
            let jitter = Double.random(in: 0...(exp))
            try? await Task.sleep(nanoseconds: UInt64((exp + jitter) * 1_000_000_000))
        }
    }
    throw lastError ?? URLError(.unknown)
}
