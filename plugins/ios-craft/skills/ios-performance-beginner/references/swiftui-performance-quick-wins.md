# SwiftUI Performance Quick Wins

10 highest-impact fixes with before/after code. Each one addresses a common pattern that causes real, noticeable slowdowns.

---

## 1. Use LazyVStack for Scrollable Lists

**Impact:** Reduces initial render from O(n) to O(visible items). For 1,000+ items, this is the difference between a frozen screen and instant scroll.

```swift
// BEFORE — all items created at once
ScrollView {
    VStack {
        ForEach(items) { item in
            ItemRow(item: item)
        }
    }
}

// AFTER — items created on demand
ScrollView {
    LazyVStack {
        ForEach(items) { item in
            ItemRow(item: item)
        }
    }
}
```

---

## 2. Extract Subviews to Limit Re-render Scope

**Impact:** Prevents expensive views from re-rendering when unrelated state changes.

```swift
// BEFORE — chart re-renders when timer ticks
struct DashboardView: View {
    @State private var currentTime = Date()
    let chartData: [DataPoint]

    var body: some View {
        VStack {
            Text(currentTime, style: .time)  // Changes every second
            ExpensiveChart(data: chartData)   // Re-renders every second (unnecessary!)
        }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) {
            currentTime = $0
        }
    }
}

// AFTER — chart is isolated, only re-renders when data changes
struct DashboardView: View {
    let chartData: [DataPoint]

    var body: some View {
        VStack {
            ClockView()
            ExpensiveChart(data: chartData)  // Only re-renders if chartData changes
        }
    }
}

struct ClockView: View {
    @State private var currentTime = Date()
    var body: some View {
        Text(currentTime, style: .time)
            .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) {
                currentTime = $0
            }
    }
}
```

---

## 3. Use Stable Identity in ForEach

**Impact:** Prevents SwiftUI from rebuilding every row when one item changes.

```swift
// BEFORE — index-based identity, insertion causes full rebuild
ForEach(Array(items.enumerated()), id: \.offset) { index, item in
    ItemRow(item: item)
}

// AFTER — stable identity, only affected rows update
ForEach(items, id: \.id) { item in
    ItemRow(item: item)
}
```

---

## 4. Downscale Images to Display Size

**Impact:** Reduces memory from hundreds of MB to a few MB for image-heavy views. Eliminates jank in image lists.

```swift
// BEFORE — full 4000x3000 image decoded for a 100x100 thumbnail
Image(uiImage: UIImage(contentsOfFile: path)!)
    .resizable()
    .frame(width: 100, height: 100)

// AFTER — decode at target size
Image(uiImage: downsampledImage(at: url, to: CGSize(width: 100, height: 100), scale: UIScreen.main.scale)!)
    .resizable()
    .frame(width: 100, height: 100)

func downsampledImage(at url: URL, to size: CGSize, scale: CGFloat) -> UIImage? {
    let options = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let source = CGImageSourceCreateWithURL(url as CFURL, options) else { return nil }

    let maxDimension = max(size.width, size.height) * scale
    let thumbOptions: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maxDimension
    ]

    guard let thumb = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbOptions as CFDictionary) else { return nil }
    return UIImage(cgImage: thumb)
}
```

---

## 5. Move Filtering and Sorting Out of Body

**Impact:** Prevents re-computing derived data on every render. For large datasets, saves tens of milliseconds per frame.

```swift
// BEFORE — recalculated every time body runs
var body: some View {
    let visible = items
        .filter { $0.isActive }
        .sorted { $0.name < $1.name }

    List(visible) { item in
        Text(item.name)
    }
}

// AFTER — computed once when source data changes
@State private var visibleItems: [Item] = []

var body: some View {
    List(visibleItems) { item in
        Text(item.name)
    }
    .onChange(of: items) { _, new in
        visibleItems = new.filter(\.isActive).sorted { $0.name < $1.name }
    }
    .onAppear {
        visibleItems = items.filter(\.isActive).sorted { $0.name < $1.name }
    }
}
```

---

## 6. Use @Observable Instead of ObservableObject (iOS 17+)

**Impact:** Only views that read changed properties re-render, instead of all views that reference the object.

```swift
// BEFORE — any @Published change re-renders ALL subscribers
class UserViewModel: ObservableObject {
    @Published var name: String = ""
    @Published var avatar: UIImage?       // Changing avatar re-renders name views too
    @Published var settings: Settings = .default
}

struct NameView: View {
    @ObservedObject var viewModel: UserViewModel
    var body: some View {
        Text(viewModel.name)  // Re-renders when avatar or settings change (unnecessary)
    }
}

// AFTER — only views reading the changed property re-render
@Observable
class UserViewModel {
    var name: String = ""
    var avatar: UIImage?
    var settings: Settings = .default
}

struct NameView: View {
    var viewModel: UserViewModel
    var body: some View {
        Text(viewModel.name)  // Only re-renders when name changes
    }
}
```

---

## 7. Use .task Instead of .onAppear for Async Work

**Impact:** Automatically cancels when the view disappears (prevents wasted work and potential crashes from updating deallocated views).

```swift
// BEFORE — manual lifecycle management, no cancellation
.onAppear {
    Task {
        data = await fetchData()  // Keeps running even if view disappears
    }
}

// AFTER — automatic cancellation
.task {
    data = await fetchData()  // Cancelled when view disappears
}

// Bonus: .task with id re-runs when the id changes
.task(id: selectedCategory) {
    data = await fetchData(for: selectedCategory)
}
```

---

## 8. Use EquatableView or Equatable Conformance

**Impact:** Prevents re-renders when view inputs haven't meaningfully changed.

```swift
// BEFORE — re-renders even if the visual result would be identical
struct ExpensiveRow: View {
    let item: Item
    var body: some View {
        // Complex layout...
    }
}

// AFTER — SwiftUI skips re-render if item hasn't changed
struct ExpensiveRow: View, Equatable {
    let item: Item

    static func == (lhs: ExpensiveRow, rhs: ExpensiveRow) -> Bool {
        lhs.item.id == rhs.item.id && lhs.item.name == rhs.item.name
    }

    var body: some View {
        // Complex layout...
    }
}

// Use in parent:
ForEach(items) { item in
    EquatableView(content: ExpensiveRow(item: item))
}
```

---

## 9. Avoid GeometryReader in Scroll Views

**Impact:** GeometryReader inside a ScrollView forces eager evaluation and can cause layout thrashing.

```swift
// BEFORE — GeometryReader defeats lazy loading
ScrollView {
    LazyVStack {
        ForEach(items) { item in
            GeometryReader { geo in  // Makes LazyVStack act like VStack
                ItemRow(item: item, width: geo.size.width)
            }
            .frame(height: 100)
        }
    }
}

// AFTER — use containerRelativeFrame or a fixed approach
ScrollView {
    LazyVStack {
        ForEach(items) { item in
            ItemRow(item: item)
                .containerRelativeFrame(.horizontal)  // iOS 17+
        }
    }
}

// Or measure once at the container level
ScrollView {
    LazyVStack {
        ForEach(items) { item in
            ItemRow(item: item)
        }
    }
    .frame(maxWidth: .infinity)  // Fill available width
}
```

---

## 10. Debounce Rapid State Changes

**Impact:** Prevents dozens of re-renders per second from search typing, slider dragging, or sensor updates.

```swift
// BEFORE — re-renders on every keystroke
struct SearchView: View {
    @State private var query = ""

    var body: some View {
        TextField("Search", text: $query)
            .onChange(of: query) { _, newQuery in
                performSearch(newQuery)  // Fires on every character
            }
    }
}

// AFTER — debounced search
struct SearchView: View {
    @State private var query = ""
    @State private var debouncedQuery = ""
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        TextField("Search", text: $query)
            .onChange(of: query) { _, newQuery in
                searchTask?.cancel()
                searchTask = Task {
                    try? await Task.sleep(for: .milliseconds(300))
                    guard !Task.isCancelled else { return }
                    debouncedQuery = newQuery
                }
            }
            .onChange(of: debouncedQuery) { _, query in
                performSearch(query)
            }
    }
}
```

---

## Impact Summary

| Fix | Typical Improvement | Effort |
|-----|-------------------|--------|
| LazyVStack | 10-100x faster list init | 1 line change |
| Extract subviews | 2-10x fewer re-renders | 5 min refactor |
| Stable identity | Eliminates full-list rebuilds | 1 line change |
| Image downscaling | 10-50x less memory | Helper function |
| Compute out of body | Saves 10-50ms per render | Small refactor |
| @Observable | 2-5x fewer re-renders | Migration |
| .task | Prevents wasted work | 1 line change |
| Equatable views | Eliminates redundant renders | Add conformance |
| Avoid GeometryReader in scroll | Restores lazy behavior | Rethink layout |
| Debounce | Reduces renders 10-50x | Small wrapper |
