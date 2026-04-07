import Foundation
import SwiftData

public enum Backup {
    public static func exportJSON(context: ModelContext, to url: URL) throws {
        let projects = try context.fetch(FetchDescriptor<Project>())
        let tasks = try context.fetch(FetchDescriptor<Task>())
        struct P: Codable { let id: UUID; let name: String; let createdAt: Date }
        struct T: Codable { let id: UUID; let title: String; let done: Bool; let project: UUID? }
        let payload: [String: Any] = [
            "projects": projects.map { ["id": $0.id.uuidString, "name": $0.name, "createdAt": ISO8601DateFormatter().string(from: $0.createdAt)] },
            "tasks": tasks.map { ["id": $0.id.uuidString, "title": $0.title, "done": $0.done, "project": $0.project?.id.uuidString as Any] }
        ]
        let data = try JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted])
        try data.write(to: url)
    }
}
