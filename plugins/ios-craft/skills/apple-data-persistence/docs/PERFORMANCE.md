# PERFORMANCE.md
- Index hot predicates (Core Data: NSFetchIndexDescription).
- Set fetchBatchSize and returnsObjectsAsFaults for large result sets.
- Use NSBatchUpdateRequest/NSBatchDeleteRequest for set-wide mutations; refresh/reset contexts afterward.
- Parent/child contexts (Core Data) and ModelActor (SwiftData) for heavy pipelines.
- Store blobs on disk (Application Support or Caches); keep Core Data rows lean.
- With CloudKit public DB mirroring, add recordName/modifiedAt indexes.
- Process persistent history off the main thread; coalesce UI updates.
- Enable SQL logging in debug: -com.apple.CoreData.SQLDebug 1.
