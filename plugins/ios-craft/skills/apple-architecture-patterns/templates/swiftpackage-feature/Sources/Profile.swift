import Foundation
public struct ProfileState { public var name: String = "" }
public protocol ProfileService { func loadName() async throws -> String }
public struct LiveProfileService: ProfileService {
    public init() {}
    public func loadName() async throws -> String { "Taylor" }
}
