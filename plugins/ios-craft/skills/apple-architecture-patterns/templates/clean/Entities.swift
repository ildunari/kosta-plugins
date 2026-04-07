public struct TaskItem: Equatable, Identifiable {
    public let id: String
    public var title: String
    public var done: Bool
    public init(id: String = UUID().uuidString, title: String, done: Bool = false) {
        self.id = id; self.title = title; self.done = done
    }
}