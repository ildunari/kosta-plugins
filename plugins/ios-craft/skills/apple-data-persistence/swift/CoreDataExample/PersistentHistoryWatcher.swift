import Foundation
import CoreData

public final class PersistentHistoryWatcher {
    private let container: NSPersistentCloudKitContainer
    private var token: NSPersistentHistoryToken?

    public init(container: NSPersistentCloudKitContainer) {
        self.container = container
        NotificationCenter.default.addObserver(self,
                                               selector: #selector(processRemoteChange),
                                               name: .NSPersistentStoreRemoteChange,
                                               object: container.persistentStoreCoordinator)
    }

    @objc private func processRemoteChange(_ note: Notification) {
        guard let _ = container.persistentStoreCoordinator.persistentStores.first else { return }
        let bg = container.newBackgroundContext()
        bg.perform {
            let request = NSPersistentHistoryChangeRequest.fetchHistory(after: self.token)
            request.fetchRequest = NSPersistentHistoryTransaction.fetchRequest!
            do {
                if let result = try bg.execute(request) as? NSPersistentHistoryResult,
                   let transactions = result.result as? [NSPersistentHistoryTransaction],
                   !transactions.isEmpty {
                    self.token = transactions.last?.token
                    let changes = transactions.compactMap { $0.objectIDNotification() }
                    DispatchQueue.main.async {
                        changes.forEach { self.container.viewContext.mergeChanges(fromContextDidSave: $0) }
                    }
                }
            } catch {
                print("History processing failed: \(error)")
            }
        }
    }
}
