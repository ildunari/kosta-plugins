import Foundation
import CloudKit

public final class RawCloudKitSaver {
    let db: CKDatabase
    public init(db: CKDatabase) { self.db = db }

    public func save(records: [CKRecord]) {
        let op = CKModifyRecordsOperation(recordsToSave: records, recordIDsToDelete: nil)
        op.savePolicy = .ifServerRecordUnchanged
        op.modifyRecordsResultBlock = { result in
            switch result {
            case .success: break
            case .failure(let error):
                if let ckError = error as? CKError, ckError.code == .serverRecordChanged {
                    print("Conflict encountered: \(ckError)")
                } else {
                    print("Save failed: \(error)")
                }
            }
        }
        db.add(op)
    }
}
