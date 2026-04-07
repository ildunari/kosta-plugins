import Foundation
public final class InMemoryTaskRepository: TaskRepository {
    private var items: [TaskItem] = []
    public init() {}
    public func load() -> [TaskItem] { items }
    public func save(_ tasks: [TaskItem]) { items = tasks }
}