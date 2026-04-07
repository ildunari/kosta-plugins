# MIGRATIONS.md
SwiftData: use VersionedSchema + SchemaMigrationPlan, prefer lightweight stages first; add custom stages for renames/splits/backfills.
Core Data: enable lightweight migration flags; escalate to mapping models + NSEntityMigrationPolicy for complex diffs; chain staged migrations.
Testing: golden stores per app version; migration tests from N to N+1; validate invariants.
Rollbacks: take a store backup; restore on failure and prompt the user.
