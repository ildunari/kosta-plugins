import Foundation
import CoreData
import CloudKit

public final class CoreDataStack {
    public let container: NSPersistentCloudKitContainer

    public init(model: NSManagedObjectModel,
                containerIdentifier: String,
                databaseScope: CKDatabase.Scope = .private,
                storeURL: URL? = nil) {

        container = NSPersistentCloudKitContainer(name: "Model", managedObjectModel: model)
        let desc = NSPersistentStoreDescription(url: storeURL ?? CoreDataStack.defaultStoreURL())

        desc.setOption(true as NSNumber, forKey: NSMigratePersistentStoresAutomaticallyOption)
        desc.setOption(true as NSNumber, forKey: NSInferMappingModelAutomaticallyOption)
        desc.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
        desc.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)

        let options = NSPersistentCloudKitContainerOptions(containerIdentifier: containerIdentifier)
        options.databaseScope = databaseScope
        desc.cloudKitContainerOptions = options

        container.persistentStoreDescriptions = [desc]

        container.loadPersistentStores { _, error in
            if let error = error { fatalError("Store load failed: \(error)") }
        }

        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
        container.viewContext.automaticallyMergesChangesFromParent = true
    }

    public static func defaultStoreURL() -> URL {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: appSupport, withIntermediateDirectories: true)
        return appSupport.appendingPathComponent("Model.sqlite")
    }
}
