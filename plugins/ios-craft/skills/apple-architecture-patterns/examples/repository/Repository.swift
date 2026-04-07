import Foundation

// Domain contracts
public struct User: Codable, Equatable { public var id: String; public var name: String }
public protocol UserRepository {
    func fetch(id: String) async throws -> User
    func save(_ user: User) async throws
}

// Data implementations
public final class RemoteUserDataSource {
    public func get(id: String) async throws -> User { try await Task.sleep(nanoseconds: 10_000_000); return User(id: id, name: "Remote-\(id)") }
}
public final class LocalUserDataSource {
    private var store: [String: User] = [:]
    public func get(id: String) -> User? { store[id] }
    public func put(_ u: User) { store[u.id] = u }
}

// Repository
public final class DefaultUserRepository: UserRepository {
    let remote: RemoteUserDataSource
    let local: LocalUserDataSource
    public init(remote: RemoteUserDataSource, local: LocalUserDataSource) { self.remote = remote; self.local = local }
    public func fetch(id: String) async throws -> User {
        if let cached = local.get(id: id) { return cached }
        let u = try await remote.get(id: id); local.put(u); return u
    }
    public func save(_ user: User) async throws { local.put(user) }
}
