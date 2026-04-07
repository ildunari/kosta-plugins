# THREADING.md
Core Data: never pass NSManagedObject across queues—pass NSManagedObjectID; main/private queue contexts; perform/performAndWait; merge policies by operation.
SwiftData: treat ModelContext as actor-isolated; create background contexts for heavy work; consider @ModelActor for pipelines; pass persistentModelID across actors and refetch.
