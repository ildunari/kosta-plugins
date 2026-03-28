---
name: ios-data-layer-guide
description: >
  Set up data persistence for iOS apps. Use when the user needs to save data locally.
  Decision tree: UserDefaults vs Keychain vs SwiftData vs Core Data vs files. Includes
  SwiftData recipes, CloudKit sync, and migration workflows. Beginner-friendly.
---

# iOS Data Layer Guide

You are a data persistence guide for iOS developers. Your job is to help users decide how to save data, then set it up correctly. Every recommendation includes working code and explains the tradeoffs. You start simple and only add complexity when the user needs it.

---

## Step 1: What Needs Saving?

Before choosing a technology, ask the user:

1. **What data do you need to persist?** (user preferences, structured records, files, credentials)
2. **How much data?** (a few settings vs thousands of records vs large files)
3. **Does it need to sync across devices?** (iCloud, CloudKit)
4. **Does it contain secrets?** (passwords, tokens, API keys)
5. **Does it need to survive app deletion?** (Keychain persists; everything else is deleted)

If the user isn't sure, walk them through the decision tree.

---

## Step 2: Decision Tree

Reference `references/persistence-decision-tree.md` for the full visual tree with code examples.

### Quick Decision

```
What kind of data are you saving?
│
├─ Simple preferences (theme, language, toggle states, small values)
│  → UserDefaults
│  → @AppStorage for SwiftUI bindings
│
├─ Secrets (passwords, tokens, API keys)
│  → Keychain
│  → Never UserDefaults for secrets
│
├─ Structured records (users, tasks, orders -- queryable, sortable)
│  │
│  ├─ New project, iOS 17+?
│  │  → SwiftData
│  │
│  └─ Need iOS 16 support or existing Core Data stack?
│     → Core Data
│
├─ Large files (images, PDFs, videos, audio)
│  → FileManager (Documents or Caches directory)
│
└─ Temporary cache (network responses, computed results)
   → URLCache for HTTP responses
   → NSCache for in-memory objects
   → FileManager (Caches directory) for disk cache
```

### Comparison Table

| Feature | UserDefaults | Keychain | SwiftData | Core Data | FileManager |
|---|---|---|---|---|---|
| Data type | Key-value (small) | Key-value (secrets) | Structured models | Structured models | Raw files |
| Query/filter | No | No | Yes | Yes | No |
| Max size | ~1 MB practical | Small values | Millions of records | Millions of records | Disk space |
| iCloud sync | NSUbiquitousKeyValueStore | Shared via Keychain sharing | CloudKit integration | CloudKit (NSPersistentCloudKitContainer) | iCloud Drive |
| Survives app delete | No | Yes | No | No | No |
| Thread safe | Yes | Yes | Actor-isolated | Context-per-thread | Yes (file coordination) |
| Setup effort | None | Low | Low | Medium | Low |

---

## Step 3: UserDefaults

For simple preferences and small values. SwiftUI provides `@AppStorage` for direct bindings.

### Basic Usage

```swift
// Writing
UserDefaults.standard.set("dark", forKey: "theme")
UserDefaults.standard.set(true, forKey: "notificationsEnabled")
UserDefaults.standard.set(42, forKey: "launchCount")

// Reading
let theme = UserDefaults.standard.string(forKey: "theme") ?? "system"
let enabled = UserDefaults.standard.bool(forKey: "notificationsEnabled")
let count = UserDefaults.standard.integer(forKey: "launchCount")
```

### SwiftUI with @AppStorage

```swift
struct SettingsView: View {
    @AppStorage("theme") private var theme = "system"
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true

    var body: some View {
        Form {
            Picker("Theme", selection: $theme) {
                Text("System").tag("system")
                Text("Light").tag("light")
                Text("Dark").tag("dark")
            }
            Toggle("Notifications", isOn: $notificationsEnabled)
        }
    }
}
```

### Rules

- Store only small, simple values (strings, numbers, booleans, dates, small arrays)
- Never store secrets, large data, or user-generated content
- Keys are strings -- use constants to avoid typos:

```swift
enum DefaultsKey {
    static let theme = "theme"
    static let onboardingComplete = "onboardingComplete"
    static let lastSyncDate = "lastSyncDate"
}
```

---

## Step 4: Keychain

For passwords, tokens, API keys, and other secrets. Data survives app deletion.

### Using a Simple Wrapper

The raw Keychain API is verbose C code. Use a wrapper:

```swift
import Security

enum KeychainManager {
    enum KeychainError: Error {
        case duplicateItem
        case itemNotFound
        case unexpectedStatus(OSStatus)
    }

    static func save(key: String, data: Data) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        if status == errSecDuplicateItem {
            // Update existing
            let updateQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrAccount as String: key
            ]
            let attributes: [String: Any] = [kSecValueData as String: data]
            let updateStatus = SecItemUpdate(updateQuery as CFDictionary, attributes as CFDictionary)
            guard updateStatus == errSecSuccess else {
                throw KeychainError.unexpectedStatus(updateStatus)
            }
        } else if status != errSecSuccess {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    static func load(key: String) throws -> Data {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let data = result as? Data else {
            throw KeychainError.itemNotFound
        }
        return data
    }

    static func delete(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }
}

// Usage
let token = "eyJhbGci..."
try KeychainManager.save(key: "authToken", data: Data(token.utf8))
let savedData = try KeychainManager.load(key: "authToken")
let savedToken = String(data: savedData, encoding: .utf8)
```

### Rules

- Only store secrets (tokens, passwords, encryption keys)
- Data persists after app deletion -- clean up if needed
- Consider using a library like KeychainAccess for a nicer API
- Test Keychain operations on a real device; the Simulator's Keychain behaves slightly differently

---

## Step 5: SwiftData Setup

SwiftData is Apple's modern persistence framework (iOS 17+). It replaces Core Data for new projects with a much simpler API.

Reference `references/swiftdata-recipes.md` for the full recipe catalog.

### Basic Setup

**1. Define your model:**

```swift
import SwiftData

@Model
class Task {
    var title: String
    var isCompleted: Bool
    var createdAt: Date
    var priority: Int

    init(title: String, isCompleted: Bool = false, priority: Int = 0) {
        self.title = title
        self.isCompleted = isCompleted
        self.createdAt = .now
        self.priority = priority
    }
}
```

**2. Add the model container to your app:**

```swift
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: Task.self)
    }
}
```

**3. Use @Query to read data:**

```swift
struct TaskListView: View {
    @Query(sort: \Task.createdAt, order: .reverse) var tasks: [Task]
    @Environment(\.modelContext) private var context

    var body: some View {
        List(tasks) { task in
            TaskRow(task: task)
        }
    }
}
```

**4. Create, update, delete:**

```swift
// Create
func addTask(title: String) {
    let task = Task(title: title)
    context.insert(task)
    // SwiftData auto-saves
}

// Update (just modify the property)
func toggleTask(_ task: Task) {
    task.isCompleted.toggle()
    // SwiftData auto-saves
}

// Delete
func deleteTask(_ task: Task) {
    context.delete(task)
}
```

---

## Step 6: Model Definition

### Property Types

SwiftData supports these property types out of the box:

| Type | Notes |
|---|---|
| `String`, `Int`, `Double`, `Bool` | Primitive types |
| `Date` | Stored as timestamps |
| `Data` | Raw bytes |
| `UUID` | Unique identifiers |
| `URL` | Stored as strings |
| `enum` with `Codable` conformance | Custom enums |
| Arrays of the above | Stored as transformable |
| Other `@Model` classes | Relationships |

### Attributes

```swift
@Model
class User {
    @Attribute(.unique) var email: String          // Unique constraint
    @Attribute(.externalStorage) var avatarData: Data?  // Store large data outside the database
    @Attribute(.spotlight) var name: String         // Indexed for Spotlight search

    @Transient var isEditing = false               // Not persisted

    var createdAt: Date

    init(email: String, name: String) {
        self.email = email
        self.name = name
        self.createdAt = .now
    }
}
```

---

## Step 7: CRUD Operations

### Create

```swift
func createUser(name: String, email: String) {
    let user = User(email: email, name: name)
    context.insert(user)
    // Auto-saved by SwiftData
}
```

### Read with @Query

```swift
// All tasks, sorted by creation date
@Query(sort: \Task.createdAt) var tasks: [Task]

// Only incomplete tasks
@Query(filter: #Predicate<Task> { !$0.isCompleted })
var incompleteTasks: [Task]

// Filtered and sorted
@Query(
    filter: #Predicate<Task> { $0.priority > 2 },
    sort: \Task.priority,
    order: .reverse
)
var highPriorityTasks: [Task]
```

### Read with FetchDescriptor (programmatic)

```swift
func searchTasks(matching query: String) throws -> [Task] {
    let predicate = #Predicate<Task> { task in
        task.title.localizedStandardContains(query)
    }
    let descriptor = FetchDescriptor<Task>(
        predicate: predicate,
        sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
    )
    return try context.fetch(descriptor)
}
```

### Update

```swift
// Just modify properties directly
func markAsCompleted(_ task: Task) {
    task.isCompleted = true
    task.completedAt = .now
}
```

### Delete

```swift
func deleteTask(_ task: Task) {
    context.delete(task)
}

// Delete multiple
func deleteCompletedTasks() throws {
    let completed = try context.fetch(
        FetchDescriptor<Task>(predicate: #Predicate { $0.isCompleted })
    )
    for task in completed {
        context.delete(task)
    }
}
```

---

## Step 8: Relationships

```swift
@Model
class Project {
    var name: String
    @Relationship(deleteRule: .cascade) var tasks: [Task] = []

    init(name: String) {
        self.name = name
    }
}

@Model
class Task {
    var title: String
    var isCompleted: Bool
    var project: Project?  // Inverse relationship (auto-inferred)

    init(title: String, isCompleted: Bool = false) {
        self.title = title
        self.isCompleted = isCompleted
    }
}
```

### Delete Rules

| Rule | What Happens When Parent Is Deleted |
|---|---|
| `.cascade` | Children are also deleted (Project deleted → all its Tasks deleted) |
| `.nullify` | Children's reference to parent becomes nil (Task.project = nil) |
| `.deny` | Deletion fails if children exist |
| `.noAction` | Children keep a dangling reference (avoid this) |

### Adding the Container for Multiple Models

```swift
.modelContainer(for: [Project.self, Task.self])
```

---

## Step 9: CloudKit Sync

SwiftData can sync with iCloud via CloudKit with minimal setup.

### Requirements

1. Enable **iCloud** capability in your target's Signing & Capabilities
2. Enable **CloudKit** and select or create a container
3. Enable **Background Modes > Remote notifications**

### Configuration

```swift
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: Task.self, inMemory: false, isAutosaveEnabled: true,
                        isUndoEnabled: true)
        // CloudKit sync is automatic when iCloud capability is enabled
    }
}
```

### CloudKit Constraints

- All properties must be **optional** or have **default values** (CloudKit requires this)
- **Unique constraints** are not supported with CloudKit
- Sync is **eventual** -- changes may take seconds to minutes to propagate
- **Conflicts** are resolved with last-writer-wins by default

### Adapting Models for CloudKit

```swift
@Model
class Task {
    var title: String = ""           // Default value (required for CloudKit)
    var isCompleted: Bool = false
    var createdAt: Date = Date.now
    var notes: String? = nil         // Optional is fine

    init(title: String) {
        self.title = title
    }
}
```

---

## Step 10: Migration Strategy

When you change your model (add properties, rename fields, change types), you need a migration plan.

### Lightweight Migration (Automatic)

SwiftData handles these changes automatically:
- Adding a new property with a default value
- Making a required property optional
- Adding a new model

No code needed. Just change the model and SwiftData adapts.

### Custom Migration

For breaking changes (renaming, type changes, data transformation):

```swift
enum TaskSchemaV1: VersionedSchema {
    static var versionIdentifier = Schema.Version(1, 0, 0)
    static var models: [any PersistentModel.Type] { [Task.self] }

    @Model
    class Task {
        var title: String
        var isDone: Bool  // Old name
        init(title: String, isDone: Bool = false) {
            self.title = title
            self.isDone = isDone
        }
    }
}

enum TaskSchemaV2: VersionedSchema {
    static var versionIdentifier = Schema.Version(2, 0, 0)
    static var models: [any PersistentModel.Type] { [Task.self] }

    @Model
    class Task {
        var title: String
        var isCompleted: Bool  // New name
        init(title: String, isCompleted: Bool = false) {
            self.title = title
            self.isCompleted = isCompleted
        }
    }
}

enum TaskMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] {
        [TaskSchemaV1.self, TaskSchemaV2.self]
    }

    static var stages: [MigrationStage] {
        [migrateV1toV2]
    }

    static let migrateV1toV2 = MigrationStage.custom(
        fromVersion: TaskSchemaV1.self,
        toVersion: TaskSchemaV2.self
    ) { context in
        // Transform data
        let tasks = try context.fetch(FetchDescriptor<TaskSchemaV1.Task>())
        for task in tasks {
            // Map old field to new field
            // (In practice, SwiftData handles simple renames;
            //  use custom migration for data transformations)
        }
        try context.save()
    }
}

// Apply in your app
.modelContainer(for: Task.self, migrationPlan: TaskMigrationPlan.self)
```

---

## Step 11: FileManager for Large Files

For images, PDFs, videos, and other files that don't belong in a database.

### Directories

| Directory | Use For | Backed Up? |
|---|---|---|
| Documents | User-generated content | Yes |
| Caches | Re-downloadable content | No |
| tmp | Temporary files | No |
| Application Support | App-generated data files | Yes |

```swift
// Get directory URLs
let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]

// Save an image
func saveImage(_ image: UIImage, named filename: String) throws -> URL {
    let url = documents.appendingPathComponent(filename)
    guard let data = image.jpegData(compressionQuality: 0.8) else {
        throw FileError.compressionFailed
    }
    try data.write(to: url)
    return url
}

// Load an image
func loadImage(named filename: String) throws -> UIImage {
    let url = documents.appendingPathComponent(filename)
    let data = try Data(contentsOf: url)
    guard let image = UIImage(data: data) else {
        throw FileError.invalidData
    }
    return image
}

// Delete a file
func deleteFile(at url: URL) throws {
    try FileManager.default.removeItem(at: url)
}
```

### Combining with SwiftData

Store the file on disk and save the file path in SwiftData:

```swift
@Model
class Photo {
    var caption: String
    var filePath: String  // Relative path within Documents

    @Transient
    var image: UIImage? {
        let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent(filePath)
        return UIImage(contentsOfFile: url.path)
    }
}
```

---

## Cross-References

- For deep SwiftData patterns and advanced persistence: invoke `apple-data-persistence`
- For SwiftData recipes with complete code: see `references/swiftdata-recipes.md`
- For the full persistence decision tree: see `references/persistence-decision-tree.md`

---

## Common Mistakes to Catch

| Mistake | Fix |
|---|---|
| Storing passwords in UserDefaults | Use Keychain for all secrets |
| Storing large images as Data in SwiftData | Use `@Attribute(.externalStorage)` or FileManager |
| Missing default values with CloudKit | All properties need defaults or be optional |
| Forgetting `.modelContainer` on the app | Views using `@Query` will crash without it |
| Using `@Attribute(.unique)` with CloudKit | Unique constraints aren't supported; use manual checks |
| Not handling migration for schema changes | Always plan migrations before changing models in production |
| Saving user files in Caches directory | Caches can be purged by the system; use Documents for user data |
