# Persistence Decision Tree

Visual decision tree for choosing the right iOS data persistence technology, with code examples for each branch.

---

## The Tree

```
What are you saving?
│
├─── SECRETS (passwords, tokens, API keys, certificates)
│    │
│    └─→ Keychain
│         • Encrypted at rest by the OS
│         • Survives app deletion
│         • Small values only (a few KB)
│
├─── PREFERENCES (theme, language, toggle states, small settings)
│    │
│    ├─ Is it just a few simple values (string, bool, number)?
│    │  └─→ UserDefaults / @AppStorage
│    │       • Zero setup
│    │       • ~1 MB practical limit
│    │       • Great for SwiftUI with @AppStorage
│    │
│    └─ Do you need cross-device sync for preferences?
│       └─→ NSUbiquitousKeyValueStore
│            • iCloud key-value sync
│            • 1 MB limit, 1024 keys max
│            • Same API as UserDefaults
│
├─── STRUCTURED DATA (users, tasks, orders, messages -- things you query/filter/sort)
│    │
│    ├─ Is this a new project targeting iOS 17+?
│    │  └─→ SwiftData
│    │       • Modern, Swift-native API
│    │       • @Model classes, @Query in views
│    │       • CloudKit sync built in
│    │       • Lightweight migrations for simple changes
│    │
│    ├─ Do you need iOS 16 support?
│    │  └─→ Core Data
│    │       • Mature, powerful, more boilerplate
│    │       • NSPersistentCloudKitContainer for sync
│    │       • Visual model editor in Xcode
│    │
│    └─ Is it a small amount of structured data (<100 records, no queries)?
│       └─→ JSON file via Codable
│            • Simplest option for small datasets
│            • Load entire file into memory, modify, save back
│            • No query engine; filter in memory
│
├─── LARGE FILES (images, PDFs, videos, audio, downloads)
│    │
│    ├─ Is it user-created content that should be preserved?
│    │  └─→ FileManager → Documents directory
│    │       • Backed up to iCloud
│    │       • Survives app updates
│    │       • User can see it via Files app (if configured)
│    │
│    ├─ Is it re-downloadable content?
│    │  └─→ FileManager → Caches directory
│    │       • NOT backed up
│    │       • System may purge when disk is low
│    │       • Good for downloaded images, API responses
│    │
│    └─ Does it need cross-device sync?
│       └─→ FileManager → iCloud Drive container
│            • Enable iCloud Documents capability
│            • Use FileManager.default.url(forUbiquityContainerIdentifier:)
│
└─── TEMPORARY / CACHE
     │
     ├─ HTTP response caching?
     │  └─→ URLCache
     │       • Automatic with URLSession
     │       • Respects HTTP cache headers
     │       • Configure size: URLCache(memoryCapacity:diskCapacity:)
     │
     ├─ In-memory object cache (evicts under memory pressure)?
     │  └─→ NSCache
     │       • Thread-safe
     │       • Auto-evicts when memory is low
     │       • Good for computed results, decoded images
     │
     └─ Temporary files (processing, exports)?
        └─→ FileManager → tmp directory
             • Cleaned periodically by the system
             • Use FileManager.default.temporaryDirectory
```

---

## Code Examples for Each Branch

### UserDefaults / @AppStorage

```swift
// Direct UserDefaults
UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
let completed = UserDefaults.standard.bool(forKey: "hasCompletedOnboarding")

// SwiftUI @AppStorage (automatic UI updates)
@AppStorage("theme") private var theme = "system"
@AppStorage("fontSize") private var fontSize = 16.0
```

### Keychain

```swift
// Save a token
let tokenData = Data("eyJhbGci...".utf8)
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "authToken",
    kSecValueData as String: tokenData
]
SecItemAdd(query as CFDictionary, nil)
```

### SwiftData

```swift
@Model
class Note {
    var title: String
    var body: String
    var createdAt: Date

    init(title: String, body: String) {
        self.title = title
        self.body = body
        self.createdAt = .now
    }
}

// In your view
@Query(sort: \Note.createdAt, order: .reverse) var notes: [Note]
@Environment(\.modelContext) private var context

func addNote() {
    context.insert(Note(title: "New Note", body: ""))
}
```

### JSON File via Codable

```swift
struct Settings: Codable {
    var username: String
    var favoriteColors: [String]
    var lastLoginDate: Date?
}

// Save
func save(_ settings: Settings) throws {
    let url = FileManager.default
        .urls(for: .documentDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("settings.json")
    let data = try JSONEncoder().encode(settings)
    try data.write(to: url)
}

// Load
func load() throws -> Settings {
    let url = FileManager.default
        .urls(for: .documentDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("settings.json")
    let data = try Data(contentsOf: url)
    return try JSONDecoder().decode(Settings.self, from: data)
}
```

### FileManager (Documents)

```swift
let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]

// Save image
func saveImage(_ image: UIImage, name: String) throws -> URL {
    let url = documents.appendingPathComponent("\(name).jpg")
    guard let data = image.jpegData(compressionQuality: 0.8) else {
        throw NSError(domain: "ImageError", code: 1)
    }
    try data.write(to: url)
    return url
}

// List all saved images
func listImages() throws -> [URL] {
    try FileManager.default.contentsOfDirectory(
        at: documents,
        includingPropertiesForKeys: nil
    ).filter { $0.pathExtension == "jpg" }
}
```

### NSCache

```swift
class ImageCache {
    static let shared = ImageCache()
    private let cache = NSCache<NSString, UIImage>()

    init() {
        cache.countLimit = 100           // Max 100 images
        cache.totalCostLimit = 50_000_000 // ~50 MB
    }

    func image(for key: String) -> UIImage? {
        cache.object(forKey: key as NSString)
    }

    func store(_ image: UIImage, for key: String) {
        let cost = image.jpegData(compressionQuality: 1)?.count ?? 0
        cache.setObject(image, forKey: key as NSString, cost: cost)
    }
}
```

---

## Quick Reference

| I need to save... | Use | Setup effort |
|---|---|---|
| A theme preference | `@AppStorage` | None |
| An auth token | Keychain | Low |
| A list of user tasks | SwiftData | Low |
| Downloaded profile photos | FileManager (Caches) | Low |
| User-taken photos | FileManager (Documents) | Low |
| App configuration (< 50 fields) | JSON file via Codable | Low |
| Thousands of searchable records | SwiftData or Core Data | Medium |
| HTTP API response cache | URLCache | None (automatic) |
| Expensive computed results | NSCache | Low |
