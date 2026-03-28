# SwiftData Recipes

8 complete recipes covering common SwiftData patterns. Each includes full, compilable code.

---

## Recipe 1: Basic Model

The simplest SwiftData model with standard types.

```swift
import SwiftData

@Model
class Bookmark {
    var title: String
    var url: URL
    var note: String?
    var createdAt: Date
    var isFavorite: Bool

    init(title: String, url: URL, note: String? = nil, isFavorite: Bool = false) {
        self.title = title
        self.url = url
        self.note = note
        self.createdAt = .now
        self.isFavorite = isFavorite
    }
}

// App setup
@main
struct BookmarkApp: App {
    var body: some Scene {
        WindowGroup {
            BookmarkListView()
        }
        .modelContainer(for: Bookmark.self)
    }
}
```

---

## Recipe 2: Relationships

Parent-child relationships with cascade delete.

```swift
@Model
class Folder {
    var name: String
    var color: String
    @Relationship(deleteRule: .cascade) var bookmarks: [Bookmark] = []

    init(name: String, color: String = "blue") {
        self.name = name
        self.color = color
    }
}

@Model
class Bookmark {
    var title: String
    var url: URL
    var folder: Folder?  // Inverse relationship, auto-inferred

    init(title: String, url: URL) {
        self.title = title
        self.url = url
    }
}

// Usage
func addBookmarkToFolder(_ bookmark: Bookmark, folder: Folder) {
    bookmark.folder = folder
    // OR: folder.bookmarks.append(bookmark)
    // Both directions work; SwiftData keeps them in sync
}

// Container for multiple models
.modelContainer(for: [Folder.self, Bookmark.self])
```

---

## Recipe 3: Queries with Predicates

Filtering, sorting, and combining conditions.

```swift
struct BookmarkListView: View {
    // Simple: all bookmarks sorted by date
    @Query(sort: \Bookmark.createdAt, order: .reverse)
    var allBookmarks: [Bookmark]

    // Filtered: only favorites
    @Query(filter: #Predicate<Bookmark> { $0.isFavorite })
    var favorites: [Bookmark]

    // Combined: favorites sorted by title
    @Query(
        filter: #Predicate<Bookmark> { $0.isFavorite },
        sort: \Bookmark.title
    )
    var sortedFavorites: [Bookmark]

    var body: some View {
        List(allBookmarks) { bookmark in
            BookmarkRow(bookmark: bookmark)
        }
    }
}

// Dynamic query (search)
struct SearchableBookmarkList: View {
    @State private var searchText = ""

    var body: some View {
        BookmarkResults(searchText: searchText)
            .searchable(text: $searchText)
    }
}

struct BookmarkResults: View {
    @Query var bookmarks: [Bookmark]

    init(searchText: String) {
        if searchText.isEmpty {
            _bookmarks = Query(sort: \Bookmark.createdAt, order: .reverse)
        } else {
            _bookmarks = Query(
                filter: #Predicate<Bookmark> {
                    $0.title.localizedStandardContains(searchText)
                },
                sort: \Bookmark.createdAt,
                order: .reverse
            )
        }
    }

    var body: some View {
        List(bookmarks) { bookmark in
            BookmarkRow(bookmark: bookmark)
        }
    }
}
```

---

## Recipe 4: Sorting

Multiple sort descriptors and user-selectable sort order.

```swift
enum BookmarkSort: String, CaseIterable {
    case dateNewest = "Newest First"
    case dateOldest = "Oldest First"
    case titleAZ = "Title A-Z"
    case titleZA = "Title Z-A"

    var descriptors: [SortDescriptor<Bookmark>] {
        switch self {
        case .dateNewest: [SortDescriptor(\.createdAt, order: .reverse)]
        case .dateOldest: [SortDescriptor(\.createdAt, order: .forward)]
        case .titleAZ:    [SortDescriptor(\.title, order: .forward)]
        case .titleZA:    [SortDescriptor(\.title, order: .reverse)]
        }
    }
}

struct SortableBookmarkList: View {
    @State private var sortOrder: BookmarkSort = .dateNewest

    var body: some View {
        SortedBookmarkList(sort: sortOrder)
            .toolbar {
                Menu("Sort", systemImage: "arrow.up.arrow.down") {
                    ForEach(BookmarkSort.allCases, id: \.self) { option in
                        Button(option.rawValue) { sortOrder = option }
                    }
                }
            }
    }
}

struct SortedBookmarkList: View {
    @Query var bookmarks: [Bookmark]

    init(sort: BookmarkSort) {
        _bookmarks = Query(sort: sort.descriptors)
    }

    var body: some View {
        List(bookmarks) { bookmark in
            BookmarkRow(bookmark: bookmark)
        }
    }
}
```

---

## Recipe 5: Fetching with @Query

Using `@Query` with animation and limits.

```swift
// Limited results (pagination-like)
@Query(sort: \Bookmark.createdAt, order: .reverse)
var bookmarks: [Bookmark]

var recentBookmarks: [Bookmark] {
    Array(bookmarks.prefix(10))
}

// With animation when data changes
struct AnimatedBookmarkList: View {
    @Query(sort: \Bookmark.createdAt, order: .reverse, animation: .default)
    var bookmarks: [Bookmark]

    var body: some View {
        List(bookmarks) { bookmark in
            BookmarkRow(bookmark: bookmark)
        }
    }
}

// Grouping results (computed from @Query)
struct GroupedBookmarkList: View {
    @Query(sort: \Bookmark.createdAt, order: .reverse)
    var bookmarks: [Bookmark]

    var groupedByFolder: [String: [Bookmark]] {
        Dictionary(grouping: bookmarks) { $0.folder?.name ?? "Unfiled" }
    }

    var body: some View {
        List {
            ForEach(groupedByFolder.keys.sorted(), id: \.self) { folderName in
                Section(folderName) {
                    ForEach(groupedByFolder[folderName]!) { bookmark in
                        BookmarkRow(bookmark: bookmark)
                    }
                }
            }
        }
    }
}
```

---

## Recipe 6: Background Context

Performing heavy operations (imports, batch deletes) without blocking the UI.

```swift
class DataImporter {
    let container: ModelContainer

    init(container: ModelContainer) {
        self.container = container
    }

    func importBookmarks(from jsonData: Data) async throws {
        // Create a background context
        let context = ModelContext(container)

        // Decode the data
        let decoded = try JSONDecoder().decode([BookmarkDTO].self, from: jsonData)

        // Insert in the background
        for dto in decoded {
            let bookmark = Bookmark(
                title: dto.title,
                url: URL(string: dto.url)!
            )
            context.insert(bookmark)
        }

        // Save explicitly (background contexts don't auto-save)
        try context.save()
    }

    func deleteAllBookmarks() async throws {
        let context = ModelContext(container)
        try context.delete(model: Bookmark.self)
        try context.save()
    }
}

// Usage from a view
struct ImportButton: View {
    @Environment(\.modelContext) private var context

    var body: some View {
        Button("Import") {
            Task {
                let importer = DataImporter(container: context.container)
                try await importer.importBookmarks(from: sampleJSON)
            }
        }
    }
}
```

---

## Recipe 7: Migration

Versioned schema migration when your model changes.

```swift
// Version 1: Original model
enum BookmarkSchemaV1: VersionedSchema {
    static var versionIdentifier = Schema.Version(1, 0, 0)
    static var models: [any PersistentModel.Type] { [Bookmark.self] }

    @Model
    class Bookmark {
        var title: String
        var urlString: String  // Stored as String in V1
        var createdAt: Date

        init(title: String, urlString: String) {
            self.title = title
            self.urlString = urlString
            self.createdAt = .now
        }
    }
}

// Version 2: Changed urlString to url (URL type), added isFavorite
enum BookmarkSchemaV2: VersionedSchema {
    static var versionIdentifier = Schema.Version(2, 0, 0)
    static var models: [any PersistentModel.Type] { [Bookmark.self] }

    @Model
    class Bookmark {
        var title: String
        var url: URL              // Changed from String to URL
        var isFavorite: Bool      // New field
        var createdAt: Date

        init(title: String, url: URL, isFavorite: Bool = false) {
            self.title = title
            self.url = url
            self.isFavorite = isFavorite
            self.createdAt = .now
        }
    }
}

// Migration plan
enum BookmarkMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] {
        [BookmarkSchemaV1.self, BookmarkSchemaV2.self]
    }

    static var stages: [MigrationStage] {
        [migrateV1toV2]
    }

    static let migrateV1toV2 = MigrationStage.custom(
        fromVersion: BookmarkSchemaV1.self,
        toVersion: BookmarkSchemaV2.self
    ) { context in
        let oldBookmarks = try context.fetch(FetchDescriptor<BookmarkSchemaV1.Bookmark>())
        for old in oldBookmarks {
            // Data transformation would happen here
            // SwiftData handles the actual schema update
        }
        try context.save()
    }
}

// Apply migration plan
.modelContainer(
    for: Bookmark.self,
    migrationPlan: BookmarkMigrationPlan.self
)
```

---

## Recipe 8: CloudKit Sync

Syncing SwiftData models across devices via iCloud.

### Prerequisites

1. Add **iCloud** capability (Signing & Capabilities tab)
2. Check **CloudKit** and create/select a container (e.g., `iCloud.com.yourcompany.yourapp`)
3. Add **Background Modes** capability and check **Remote notifications**

### CloudKit-Compatible Model

```swift
// All properties must have default values or be optional
@Model
class Bookmark {
    var title: String = ""
    var urlString: String = ""
    var note: String? = nil
    var isFavorite: Bool = false
    var createdAt: Date = Date.now

    // Computed property for URL (not persisted)
    @Transient
    var url: URL? { URL(string: urlString) }

    init(title: String, url: URL, note: String? = nil) {
        self.title = title
        self.urlString = url.absoluteString
        self.note = note
    }
}
```

### Container Configuration

```swift
@main
struct BookmarkApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: Bookmark.self)
        // CloudKit sync is enabled automatically when:
        // 1. iCloud capability is configured
        // 2. Model properties have defaults
        // 3. No unique constraints are used
    }
}
```

### Handling Sync State

```swift
struct SyncStatusView: View {
    @Query var bookmarks: [Bookmark]

    var body: some View {
        VStack {
            Text("\(bookmarks.count) bookmarks")
            // CloudKit sync happens automatically
            // Changes from other devices appear via @Query updates
        }
    }
}
```

### CloudKit Limitations

| Limitation | Workaround |
|---|---|
| No `@Attribute(.unique)` | Check for duplicates manually before insert |
| All properties need defaults | Use empty strings, false, Date.now as defaults |
| Sync is eventual (not instant) | Show a sync indicator; don't promise real-time |
| Conflicts use last-writer-wins | Accept this or implement custom merge logic |
| Large data syncs slowly | Use `@Attribute(.externalStorage)` for images/files |
| Requires network | Handle offline gracefully; local changes persist and sync later |
