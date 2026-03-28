---
name: ios-performance-beginner
description: >
  Practical performance guide for SwiftUI apps. Use when the app feels slow, scrolling
  janks, or launch takes too long. Focuses on the 20% of knowledge that fixes 80%
  of performance issues. Measure first, then optimize.
---

# iOS Performance for Beginners

Guide the user through diagnosing and fixing common performance issues in SwiftUI apps. The core principle: measure first, then optimize. Never guess at performance problems.

## Workflow

### 1. Is It Actually Slow? (Measure First)

Before optimizing anything, confirm the problem exists and locate it.

**Quick measurement:**

```swift
// Add to any view body to see how often it re-evaluates
let _ = Self._printChanges()  // Prints which properties triggered a re-render
```

**Xcode performance gauges** (visible during debugging):
- CPU gauge: sustained > 50% is a concern
- Memory gauge: steadily climbing = probable leak
- Energy gauge: high impact for extended periods

**Rule of thumb:** If the user can't notice the slowness, don't optimize. Premature optimization makes code harder to maintain for no user benefit.

### 2. The Body Contract

The single most important SwiftUI performance concept: **the `body` property should be fast, pure, and free of side effects.**

```swift
// BAD — expensive work in body
var body: some View {
    let filtered = items.filter { $0.isActive }  // Re-runs every render
    let sorted = filtered.sorted { $0.date > $1.date }  // Re-runs every render

    List(sorted) { item in
        ItemRow(item: item)
    }
}

// GOOD — compute once, store in state
@State private var displayItems: [Item] = []

var body: some View {
    List(displayItems) { item in
        ItemRow(item: item)
    }
    .onChange(of: items) { _, newItems in
        displayItems = newItems.filter(\.isActive).sorted { $0.date > $1.date }
    }
}
```

**What NOT to do in `body`:**
- Network requests
- File I/O
- Heavy computation (sorting, filtering large arrays)
- Print/logging (except `_printChanges()` during debugging)
- Creating timers or observers

### 3. View Extraction

Breaking large views into smaller components helps SwiftUI's diffing engine. When a parent re-renders, only child views whose inputs changed will re-render.

```swift
// BAD — one massive body, everything re-renders together
var body: some View {
    VStack {
        Text(title)        // Re-renders when count changes
        Text("\(count)")   // Triggers re-render
        Image(image)       // Re-renders when count changes (unnecessary)
        LargeChart(data)   // Re-renders when count changes (expensive!)
    }
}

// GOOD — extracted views only re-render when their inputs change
var body: some View {
    VStack {
        TitleView(title: title)
        CounterView(count: count)
        ImageView(image: image)      // Only re-renders if image changes
        ChartView(data: data)        // Only re-renders if data changes
    }
}
```

**When to extract:**
- Any view with its own state
- Expensive renders (charts, maps, complex layouts)
- Views that change at different rates (a timer vs static content)

### 4. LazyVStack vs VStack

`VStack` creates ALL child views immediately. `LazyVStack` creates them on demand as they scroll into view.

```swift
// BAD — creates 10,000 views at once
ScrollView {
    VStack {
        ForEach(items) { item in  // All 10,000 rows rendered immediately
            ItemRow(item: item)
        }
    }
}

// GOOD — creates views only as needed
ScrollView {
    LazyVStack {
        ForEach(items) { item in  // Only visible rows + buffer rendered
            ItemRow(item: item)
        }
    }
}
```

**When to use which:**

| Container | Use when |
|-----------|----------|
| `VStack` | < 50 items, or items are cheap to create |
| `LazyVStack` | > 50 items, or items are expensive (images, complex layouts) |
| `List` | Need selection, swipe actions, or platform-native styling |

**LazyVStack gotcha:** Don't wrap it in a GeometryReader or use `.frame(height:)` on individual rows — this can defeat the laziness.

### 5. Image Optimization

Images are the most common performance bottleneck in iOS apps.

```swift
// BAD — loads full-resolution image for a thumbnail
AsyncImage(url: imageURL) { image in
    image.resizable().frame(width: 80, height: 80)
} placeholder: {
    ProgressView()
}
// Problem: downloads and decodes a 4000x3000 image, then scales it down

// GOOD — request thumbnail size from server (if API supports it)
AsyncImage(url: thumbnailURL) { image in
    image.resizable().frame(width: 80, height: 80)
} placeholder: {
    ProgressView()
}

// GOOD — downscale on decode for local images
func downsampledImage(at url: URL, to size: CGSize, scale: CGFloat) -> UIImage? {
    let imageSourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let source = CGImageSourceCreateWithURL(url as CFURL, imageSourceOptions) else { return nil }

    let maxDimension = max(size.width, size.height) * scale
    let options: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maxDimension
    ]

    guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { return nil }
    return UIImage(cgImage: thumbnail)
}
```

**Image performance rules:**
- Never display images larger than the view they're shown in
- Use `.resizable()` + `.frame()` to set display size
- For lists with images, use a caching library (Kingfisher, SDWebImage, Nuke) or implement your own cache
- Prefer HEIC format for photos (50% smaller than JPEG at same quality)
- Use SF Symbols instead of custom images when possible (vector, free, cached by system)

### 6. List Identity

SwiftUI uses identity to track which items changed. Wrong identity = unnecessary work.

```swift
// BAD — using array index as identity
ForEach(Array(items.enumerated()), id: \.offset) { index, item in
    ItemRow(item: item)
}
// Problem: inserting at top makes SwiftUI think EVERY row changed

// GOOD — use stable, unique identity
ForEach(items) { item in  // Uses item.id (Identifiable conformance)
    ItemRow(item: item)
}

// GOOD — explicit stable ID
ForEach(items, id: \.uniqueID) { item in
    ItemRow(item: item)
}
```

**Identity rules:**
- Conform model types to `Identifiable` with a stable UUID or database ID
- Never use array index as identity in dynamic lists
- Never use random values as identity
- If items don't have natural IDs, assign UUIDs at creation time

### 7. Expensive Computations

Move heavy work off the main thread:

```swift
// BAD — blocks the UI
func loadData() {
    let processed = heavyProcessing(rawData)  // Main thread blocked
    self.data = processed
}

// GOOD — background processing
func loadData() async {
    let raw = rawData
    let processed = await Task.detached(priority: .userInitiated) {
        heavyProcessing(raw)  // Runs on background thread
    }.value
    self.data = processed  // Back on main thread (in @MainActor context)
}
```

**What counts as "expensive":**
- Sorting or filtering arrays > 1,000 items
- Image processing (resize, filter, crop)
- JSON parsing of large payloads
- String searching or regex matching on large text
- Any computation that takes > 16ms (one frame at 60fps)

### 8. App Launch Time

Target: < 400ms to first meaningful content.

**Quick wins:**
- Defer non-essential initialization (analytics, logging, pre-fetching)
- Don't load all data at launch — load what's visible, then paginate
- Use `@AppStorage` for simple preferences instead of loading a config file
- Minimize the dependency chain in your `App` struct

```swift
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .task {
                    // Defer non-critical work
                    await initializeAnalytics()
                    await prefetchSecondaryData()
                }
        }
    }
}
```

**Measure launch time:**
- Add `DYLD_PRINT_STATISTICS` to your scheme's environment variables
- Xcode → Product → Scheme → Edit Scheme → Run → Arguments → Environment Variables
- Look for "Total pre-main time" and "main() to first frame"

### 9. Instruments Basics

See `references/instruments-5-minute-guide.md` for a step-by-step walkthrough.

The two instruments that solve 90% of performance issues:
- **Time Profiler**: Shows which code is taking the most CPU time
- **Allocations**: Shows memory usage over time (spot leaks)

### 10. Quick Wins Checklist

See `references/swiftui-performance-quick-wins.md` for 10 high-impact fixes with before/after code.

Summary:
- [ ] Use `LazyVStack`/`LazyHStack` for long lists
- [ ] Use `_printChanges()` to find unnecessary re-renders
- [ ] Extract expensive child views into separate structs
- [ ] Downscale images to display size
- [ ] Use stable identifiers in `ForEach`
- [ ] Move heavy computation to background threads
- [ ] Use `@Observable` (iOS 17+) instead of `@ObservedObject` for finer-grained updates
- [ ] Cache expensive computed values with `.task` or `onChange`
- [ ] Profile with Instruments before optimizing
- [ ] Test on the slowest device you support, not your development machine
