
import os
import Foundation

// Helper that wraps OSSignposter for convenient scoped intervals.
public struct Signpost {
    private let poster: OSSignposter
    private let id: OSSignpostID

    public init(subsystem: String = Bundle.main.bundleIdentifier ?? "app", category: String) {
        poster = OSSignposter(subsystem: subsystem, category: category)
        id = poster.makeSignpostID()
    }

    @discardableResult
    public func interval<T>(_ name: StaticString, _ work: () throws -> T) rethrows -> T {
        let state = poster.beginInterval(name, id: id)
        defer { poster.endInterval(name, id: id, state) }
        return try work()
    }

    public func event(_ name: StaticString) {
        poster.emitEvent(name, id: id)
    }
}
