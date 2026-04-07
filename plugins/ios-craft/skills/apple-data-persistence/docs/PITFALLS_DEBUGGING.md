# PITFALLS_DEBUGGING.md
- Main-thread blocking: huge UI queries; move heavy work off main.
- Context churn: reuse contexts.
- Batch ops bypass contexts: reset/refresh after.
- CloudKit conflicts: handle serverRecordChanged; merge per-field.
- Migrations: required non-optionals without defaults; renames without identifiers.
- Keychain: wrong kSecAttrAccessible or access group misconfigurations.
