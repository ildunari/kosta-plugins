import Foundation

public struct UserDefaultsStore {
    private let suite: UserDefaults
    public init(suiteName: String? = nil) {
        self.suite = suiteName.flatMap(UserDefaults.init(suiteName:)) ?? .standard
    }

    public func set<T: Encodable>(_ value: T, forKey key: String) throws {
        let data = try PropertyListEncoder().encode(value)
        suite.set(data, forKey: key)
    }

    public func get<T: Decodable>(_ type: T.Type, forKey key: String) throws -> T? {
        guard let data = suite.data(forKey: key) else { return nil }
        return try PropertyListDecoder().decode(T.self, from: data)
    }
}
