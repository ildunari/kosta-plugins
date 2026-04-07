import Foundation
import SwiftData

@MainActor
public struct SwiftDataStack {
    public static func makeContainer(storeURL: URL? = nil) throws -> ModelContainer {
        let schema = Schema([Project.self, Task.self])
        let config = storeURL != nil ? ModelConfiguration(url: storeURL) : ModelConfiguration()
        return try ModelContainer(
            for: schema,
            migrationPlan: AppSchemaMigrationPlan.self,
            configurations: config
        )
    }
}
