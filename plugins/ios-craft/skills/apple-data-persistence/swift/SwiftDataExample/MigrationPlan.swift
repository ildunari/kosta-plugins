import SwiftData

enum AppSchemaV1: VersionedSchema {
    static var versionIdentifier: String { "V1" }
    static var models: [any PersistentModel.Type] { [Project.self, Task.self] }
}

enum AppSchemaV2: VersionedSchema {
    static var versionIdentifier: String { "V2" }
    static var models: [any PersistentModel.Type] { [Project.self, Task.self] }
}

enum AppSchemaMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] { [AppSchemaV1.self, AppSchemaV2.self] }
    static var stages: [MigrationStage] { [ .lightweight(fromVersion: AppSchemaV1.self, toVersion: AppSchemaV2.self) ] }
}
