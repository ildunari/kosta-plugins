import Foundation

/// Minimal DI Container (no third-party libs)
public final class DIContainer {
    public static let shared = DIContainer()
    private var factories: [String: () -> Any] = [:]
    private init() {}

    public func register<T>(_ type: T.Type, factory: @escaping () -> T) {
        factories[String(reflecting: type)] = factory
    }
    public func resolve<T>(_ type: T.Type = T.self) -> T {
        let key = String(reflecting: type)
        guard let f = factories[key], let instance = f() as? T else {
            fatalError("No factory for \(key)")
        }
        return instance
    }
}

// Example usage
protocol Clock { func now() -> Date }
struct SystemClock: Clock { func now() -> Date { Date() } }

public func setupDI() {
    DIContainer.shared.register(Clock.self) { SystemClock() }
}

public func example() {
    let clock: Clock = DIContainer.shared.resolve()
    print("Time: ", clock.now())
}
