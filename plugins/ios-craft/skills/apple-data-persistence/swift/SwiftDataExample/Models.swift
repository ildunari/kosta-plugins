import Foundation
import SwiftData

@Model
final class Project {
    @Attribute(.unique) var id: UUID
    var name: String
    var createdAt: Date
    @Relationship(deleteRule: .cascade, inverse: \Task.project) var tasks: [Task]

    init(id: UUID = UUID(), name: String, createdAt: Date = .now, tasks: [Task] = []) {
        self.id = id
        self.name = name
        self.createdAt = createdAt
        self.tasks = tasks
    }
}

@Model
final class Task {
    @Attribute(.unique) var id: UUID
    var title: String
    var done: Bool
    var project: Project?

    init(id: UUID = UUID(), title: String, done: Bool = false, project: Project? = nil) {
        self.id = id
        self.title = title
        self.done = done
        self.project = project
    }
}
