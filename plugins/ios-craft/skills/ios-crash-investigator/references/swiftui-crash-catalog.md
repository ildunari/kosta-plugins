# SwiftUI Crash Catalog

20 most common SwiftUI crashes with symptoms, causes, fixes, and prevention.

---

## 1. Force Unwrap on nil Optional

**Symptom:** `Fatal error: Unexpectedly found nil while unwrapping an Optional value`

**Cause:** Using `!` on a value that is `nil`.

**Fix:**
```swift
// BEFORE (crashes)
let name = user.name!

// AFTER (safe)
guard let name = user.name else {
    return // or provide a default
}
```

**Prevention:** Search your codebase for `!` and replace with `if let`, `guard let`, or `??`.

---

## 2. Array Index Out of Range

**Symptom:** `Fatal error: Index out of range`

**Cause:** Accessing `array[index]` where `index` is negative or >= `array.count`.

**Fix:**
```swift
// BEFORE (crashes)
let item = items[selectedIndex]

// AFTER (safe)
guard items.indices.contains(selectedIndex) else { return }
let item = items[selectedIndex]
```

**Prevention:** Use `first`, `last`, `first(where:)`, or safe subscript extensions instead of raw indices.

---

## 3. ForEach with Non-Unique IDs

**Symptom:** Random crashes during list updates, items appearing in wrong positions, app freeze.

**Cause:** `ForEach(items, id: \.self)` where items can contain duplicates, or `id: \.name` where names repeat.

**Fix:**
```swift
// BEFORE (crashes with duplicates)
ForEach(tags, id: \.self) { tag in
    Text(tag)
}

// AFTER (stable unique IDs)
struct Tag: Identifiable {
    let id = UUID()
    let name: String
}
ForEach(tags) { tag in
    Text(tag.name)
}
```

**Prevention:** Always use `Identifiable` conformance with genuinely unique IDs.

---

## 4. @State Initialized from Property

**Symptom:** View shows stale data. Initial value never updates when the parent provides new data.

**Cause:** `@State var name = item.name` captures the value once at view creation time. Subsequent changes to `item.name` are ignored.

**Fix:**
```swift
// BEFORE (stale)
struct EditView: View {
    @State var name: String

    init(item: Item) {
        _name = State(initialValue: item.name)
    }
}

// AFTER (reactive)
struct EditView: View {
    @Binding var name: String  // If parent owns the data
}

// OR: use .onChange to sync
struct EditView: View {
    let item: Item
    @State private var name = ""

    var body: some View {
        TextField("Name", text: $name)
            .onAppear { name = item.name }
            .onChange(of: item.name) { _, newValue in name = newValue }
    }
}
```

**Prevention:** Understand that `@State` is for locally-owned data. For external data, use `@Binding` or `let`.

---

## 5. Missing NavigationStack

**Symptom:** Navigation title doesn't appear. Toolbar items don't show. `navigationDestination` never fires.

**Cause:** Using `.navigationTitle()`, `.toolbar()`, or `.navigationDestination()` without a `NavigationStack` ancestor.

**Fix:**
```swift
// BEFORE (broken)
var body: some View {
    List { ... }
        .navigationTitle("Items")  // No effect without NavigationStack
}

// AFTER (working)
var body: some View {
    NavigationStack {
        List { ... }
            .navigationTitle("Items")
    }
}
```

**Prevention:** If your view uses any `navigation*` modifier, ensure a `NavigationStack` exists in the view hierarchy (either in this view or a parent).

---

## 6. Infinite State Loop

**Symptom:** App freezes, CPU pegs at 100%, Xcode shows "body evaluated too many times".

**Cause:** Modifying `@State` directly inside `body`, which triggers another `body` evaluation, creating an infinite loop.

**Fix:**
```swift
// BEFORE (infinite loop)
var body: some View {
    let _ = loadData()  // If this modifies @State, infinite loop

    Text(data)
}

// AFTER (safe)
var body: some View {
    Text(data)
        .task { await loadData() }  // Runs once, not on every body eval
}
```

**Prevention:** Never call functions that modify state directly in `body`. Use `.task {}`, `.onAppear {}`, or `.onChange {}`.

---

## 7. Sheet Presented on Dismissed View

**Symptom:** Crash when presenting a sheet, or sheet appears blank, or "Attempt to present on a view not in the window hierarchy."

**Cause:** The view presenting the sheet was already dismissed or removed from the hierarchy.

**Fix:**
```swift
// BEFORE (risky)
.sheet(isPresented: $showSheet) {
    DetailView()
}

// AFTER (safer -- use item-based presentation)
.sheet(item: $selectedItem) { item in
    DetailView(item: item)
}
```

**Prevention:** Prefer `sheet(item:)` over `sheet(isPresented:)`. The item-based version automatically dismisses when the item becomes nil.

---

## 8. Main Thread Violation

**Symptom:** Purple warning: "Publishing changes from background threads is not allowed." Possible crash.

**Cause:** Updating `@Published` or `@State` properties from a background thread.

**Fix:**
```swift
// BEFORE (background thread violation)
func fetchData() {
    URLSession.shared.dataTask(with: url) { data, _, _ in
        self.items = parse(data!)  // Wrong thread
    }.resume()
}

// AFTER (main thread safe)
func fetchData() async {
    let (data, _) = try await URLSession.shared.data(from: url)
    await MainActor.run {
        self.items = parse(data)
    }
}

// OR: mark the whole class @MainActor
@MainActor
class ViewModel: ObservableObject {
    @Published var items: [Item] = []
}
```

**Prevention:** Use `async/await` with `@MainActor` instead of callback-based APIs.

---

## 9. Core Data Object Deleted

**Symptom:** `EXC_BAD_ACCESS` or "Could not fulfill a fault." Crash when accessing a property on a managed object.

**Cause:** The object was deleted from the context but a view still holds a reference to it.

**Fix:**
```swift
// BEFORE (crashes after deletion)
Text(task.title)

// AFTER (safe)
if !task.isDeleted {
    Text(task.title)
}

// OR: use @FetchRequest which automatically updates
@FetchRequest(sortDescriptors: [SortDescriptor(\.createdAt)])
var tasks: FetchedResults<TaskEntity>
```

**Prevention:** Use `@FetchRequest` in SwiftUI, which handles deletions automatically.

---

## 10. ObservableObject Without @Published

**Symptom:** View never updates when data changes. No crash, just stale UI.

**Cause:** Property is a regular `var`, not `@Published var`, in an `ObservableObject`.

**Fix:**
```swift
// BEFORE (view never updates)
class ViewModel: ObservableObject {
    var items: [Item] = []  // Missing @Published
}

// AFTER (view updates)
class ViewModel: ObservableObject {
    @Published var items: [Item] = []
}

// OR: use @Observable (iOS 17+)
@Observable
class ViewModel {
    var items: [Item] = []  // Automatically tracked
}
```

**Prevention:** On iOS 17+, prefer `@Observable` which tracks all properties automatically.

---

## 11. NavigationLink Value Without navigationDestination

**Symptom:** Tapping a NavigationLink does nothing. No crash, no navigation.

**Cause:** Using `NavigationLink(value:)` without a matching `.navigationDestination(for:)`.

**Fix:**
```swift
// BEFORE (nothing happens on tap)
NavigationStack {
    List(items) { item in
        NavigationLink(value: item) {
            Text(item.name)
        }
    }
    // Missing: .navigationDestination(for: Item.self)
}

// AFTER (navigation works)
NavigationStack {
    List(items) { item in
        NavigationLink(value: item) {
            Text(item.name)
        }
    }
    .navigationDestination(for: Item.self) { item in
        DetailView(item: item)
    }
}
```

**Prevention:** Every `NavigationLink(value:)` type needs a corresponding `.navigationDestination(for:)`.

---

## 12. GeometryReader Causing Layout Crash

**Symptom:** View renders at size zero, content disappears, or layout constraint warnings flood the console.

**Cause:** `GeometryReader` proposes all available space to its child. If used inside a `ScrollView` or `List`, it can collapse to zero or expand infinitely.

**Fix:**
```swift
// BEFORE (collapses in ScrollView)
ScrollView {
    GeometryReader { geo in
        Image("photo").resizable().frame(width: geo.size.width)
    }
}

// AFTER (explicit height)
ScrollView {
    GeometryReader { geo in
        Image("photo").resizable().frame(width: geo.size.width, height: 200)
    }
    .frame(height: 200)
}
```

**Prevention:** Always give `GeometryReader` an explicit frame when inside a `ScrollView`.

---

## 13. Environment Object Not Injected

**Symptom:** `Fatal error: No ObservableObject of type X found. A View.environmentObject(_:) for X may be missing.`

**Cause:** A view reads `@EnvironmentObject var settings: Settings` but no ancestor called `.environmentObject(settings)`.

**Fix:**
```swift
// BEFORE (crash)
ContentView()
// Missing: .environmentObject(Settings())

// AFTER (injected)
ContentView()
    .environmentObject(Settings())
```

**Prevention:** On iOS 17+, use `@Observable` + `.environment()` instead of `@EnvironmentObject`, which gives a compile-time error if the type is wrong.

---

## 14. Modifying State During View Update

**Symptom:** Purple warning: "Modifying state during view update, this will cause undefined behavior."

**Cause:** A computed property or function called from `body` modifies `@State` or `@Published`.

**Fix:**
```swift
// BEFORE (undefined behavior)
var body: some View {
    if items.isEmpty {
        showEmptyState = true  // Modifying state during body
    }
    return content
}

// AFTER (deferred)
var body: some View {
    content
        .onChange(of: items.isEmpty) { _, isEmpty in
            showEmptyState = isEmpty
        }
}
```

**Prevention:** `body` must be a pure function. Side effects go in `.task`, `.onAppear`, `.onChange`, or button actions.

---

## 15. Circular @Observable Reference

**Symptom:** Stack overflow or hang when accessing a property.

**Cause:** Two `@Observable` objects reference each other, and accessing a property on one triggers observation of the other, creating infinite recursion.

**Fix:**
```swift
// BEFORE (circular)
@Observable class A { var b: B? }
@Observable class B { var a: A? }

// AFTER (break the cycle)
@Observable class A { var b: B? }
@Observable class B { weak var a: A? }  // Weak breaks the cycle
```

**Prevention:** Use `weak` for back-references between observable objects.

---

## 16. Concurrent Access to @State from .task

**Symptom:** Data race warning or crash when `.task` closure captures and modifies a `@State` variable.

**Cause:** `.task` runs on a background thread but `@State` must be modified on the main thread.

**Fix:**
```swift
// BEFORE (data race)
.task {
    let data = await fetchData()
    items = data  // May not be on main thread
}

// AFTER (main actor safe)
.task {
    let data = await fetchData()
    await MainActor.run { items = data }
}

// OR: mark the view model @MainActor
```

**Prevention:** Mark your view models `@MainActor` or use `await MainActor.run {}` in tasks.

---

## 17. Picker Without Tag

**Symptom:** Picker selection doesn't work. Changing selection has no effect.

**Cause:** `Picker` items don't have `.tag()` matching the selection binding type.

**Fix:**
```swift
// BEFORE (broken selection)
Picker("Size", selection: $selectedSize) {
    Text("Small")
    Text("Medium")
    Text("Large")
}

// AFTER (tags match binding type)
Picker("Size", selection: $selectedSize) {
    Text("Small").tag("small")
    Text("Medium").tag("medium")
    Text("Large").tag("large")
}
```

**Prevention:** Every `Picker` item needs a `.tag()` whose type matches the `selection` binding.

---

## 18. List onDelete with Wrong Index

**Symptom:** Deleting an item removes the wrong item, or crashes with "index out of range."

**Cause:** Using filtered/sorted array for display but original array for deletion.

**Fix:**
```swift
// BEFORE (wrong item deleted)
List {
    ForEach(filteredItems) { item in
        Text(item.name)
    }
    .onDelete { indexSet in
        items.remove(atOffsets: indexSet)  // Wrong: indexSet is for filteredItems, not items
    }
}

// AFTER (correct deletion)
.onDelete { indexSet in
    let idsToDelete = indexSet.map { filteredItems[$0].id }
    items.removeAll { idsToDelete.contains($0.id) }
}
```

**Prevention:** When using filtered/sorted data, map indices back to the source array using IDs.

---

## 19. AsyncImage Overload

**Symptom:** App becomes sluggish, images flash or reload endlessly in a scrolling list.

**Cause:** `AsyncImage` inside a `List` or `ScrollView` reloads images every time a cell reappears. No caching by default.

**Fix:**
```swift
// BEFORE (no caching, reloads constantly)
AsyncImage(url: item.imageURL) { image in
    image.resizable()
} placeholder: {
    ProgressView()
}

// AFTER (cached image loader)
// Use a library like Kingfisher, Nuke, or SDWebImage
// Or implement a simple cache:
CachedAsyncImage(url: item.imageURL) { image in
    image.resizable()
} placeholder: {
    ProgressView()
}
```

**Prevention:** Use a caching image library for lists. `AsyncImage` is fine for single images, not for scrolling lists.

---

## 20. @AppStorage with Non-Codable Type

**Symptom:** Compile error or runtime crash when using `@AppStorage` with a custom type.

**Cause:** `@AppStorage` only supports `String`, `Int`, `Double`, `Bool`, `URL`, and `Data`. Custom types need `RawRepresentable` conformance.

**Fix:**
```swift
// BEFORE (doesn't compile)
@AppStorage("theme") var theme: Theme = .system

// AFTER (RawRepresentable conformance)
enum Theme: String, CaseIterable {
    case system, light, dark
}

@AppStorage("theme") var theme: Theme = .system
// Works because Theme: RawRepresentable where RawValue == String
```

**Prevention:** For `@AppStorage` with enums, always conform to `String` (or `Int`) raw value.
