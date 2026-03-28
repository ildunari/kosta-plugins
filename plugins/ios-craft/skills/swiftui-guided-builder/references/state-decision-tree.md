# State Management Decision Tree

Choosing the right property wrapper is one of the most confusing parts of SwiftUI. This guide gives you a single decision tree that works for every situation.

---

## The Decision Tree

Start at the top. Follow the first "yes" branch.

```
Is the data UI-only?
(toggle state, text field content, sheet visibility, animation flags)
│
├── YES → Use @State
│         private, owned by this view, dies when the view is removed
│
└── NO ↓

Does a child view need to WRITE this data?
│
├── YES → Pass as @Binding
│         child reads and writes, parent owns the truth
│
└── NO ↓

Is the data shared across many views?
(user session, shopping cart, app settings model)
│
├── YES → @Observable class + .environment()
│         one object, many readers, automatic updates
│
└── NO ↓

Is it provided by the system?
(color scheme, locale, dismiss action, calendar)
│
├── YES → @Environment(\.keyPath)
│         SwiftUI injects it, you just read
│
└── NO ↓

Is it passed from a parent, read-only?
│
├── YES → Regular property: let value: Type
│         simple, no wrapper needed
│
└── NO ↓

Targeting iOS 16 or earlier?
│
├── YES, and this view CREATES the object → @StateObject
├── YES, and this view RECEIVES the object → @ObservedObject
│
└── NO → Use @State with @Observable (iOS 17+)
```

---

## @State -- Local UI State

Use for values that only this view cares about. The view owns the data. When the view is removed from the hierarchy, the state is destroyed.

```swift
struct CounterView: View {
    @State private var count = 0          // owned here
    @State private var isExpanded = false  // UI-only toggle

    var body: some View {
        VStack {
            Text("Count: \(count)")
            Button("Increment") { count += 1 }

            if isExpanded {
                Text("Extra details here")
            }
            Button(isExpanded ? "Show Less" : "Show More") {
                withAnimation { isExpanded.toggle() }
            }
        }
    }
}
```

**Common mistakes:**
- Making `@State` properties non-private. Always use `private` -- if other views need this data, it should not be `@State`.
- Using `@State` for shared data. If two sibling views need the same value, lift it to their parent or use `@Observable`.

---

## @Binding -- Child Writes Parent's State

Use when a child view needs to both read and modify a value that a parent owns. The child does not own the data -- it borrows a reference.

```swift
struct ParentView: View {
    @State private var username = ""  // parent owns it

    var body: some View {
        VStack {
            Text("Hello, \(username)")
            NameEditor(name: $username)  // pass a binding
        }
    }
}

struct NameEditor: View {
    @Binding var name: String  // child borrows it

    var body: some View {
        TextField("Enter name", text: $name)
            .textFieldStyle(.roundedBorder)
            .accessibilityLabel("Your name")
    }
}
```

**Common mistakes:**
- Creating `@State` in the child instead of accepting `@Binding` -- this creates a disconnected copy, and changes will not propagate back.
- Using `@Binding` when the child only reads the value -- just pass it as `let name: String` instead.

---

## @Observable + .environment() -- Shared Across Many Views

Use when multiple views across different parts of the hierarchy need the same data. This replaces the old `ObservableObject` + `@EnvironmentObject` pattern on iOS 17+.

```swift
// 1. Define the model with @Observable
@Observable
class UserSession {
    var username = "Jane"
    var isLoggedIn = true
    var preferences = Preferences()
}

class Preferences {
    var darkMode = false
    var fontSize: Double = 16
}

// 2. Inject at a high level
@main
struct MyApp: App {
    @State private var session = UserSession()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(session)  // inject into environment
        }
    }
}

// 3. Read in any descendant view
struct ProfileView: View {
    @Environment(UserSession.self) private var session

    var body: some View {
        VStack {
            Text("Hello, \(session.username)")

            // For two-way binding with @Observable, use @Bindable
            @Bindable var session = session
            Toggle("Dark Mode", isOn: $session.preferences.darkMode)
        }
    }
}
```

**Common mistakes:**
- Forgetting `.environment(session)` at the injection point -- you will get a runtime crash: "No observable object of type UserSession found."
- Using `@ObservedObject` with an `@Observable` class -- these are different systems. `@Observable` does not conform to `ObservableObject`.
- Not using `@Bindable` when you need a binding to an `@Observable` property.

---

## @Environment(\.keyPath) -- System-Provided Values

Use for values SwiftUI provides automatically: color scheme, locale, dismiss action, calendar, accessibility settings, and more.

```swift
struct AdaptiveView: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.dismiss) private var dismiss
    @Environment(\.locale) private var locale

    var body: some View {
        VStack {
            Text("Current scheme: \(colorScheme == .dark ? "Dark" : "Light")")
            Text("Type size: \(String(describing: typeSize))")
            Text("Locale: \(locale.identifier)")

            Button("Go Back") { dismiss() }
        }
    }
}
```

**Commonly used environment keys:**

| Key Path | Type | What it provides |
|---|---|---|
| `\.colorScheme` | `ColorScheme` | `.light` or `.dark` |
| `\.dismiss` | `DismissAction` | Dismisses the current view (sheet, navigation push) |
| `\.locale` | `Locale` | The user's locale |
| `\.dynamicTypeSize` | `DynamicTypeSize` | Current text size setting |
| `\.isSearching` | `Bool` | Whether the search bar is active |
| `\.editMode` | `Binding<EditMode>?` | List edit mode |
| `\.openURL` | `OpenURLAction` | Opens a URL |
| `\.calendar` | `Calendar` | The user's calendar |

**Common mistakes:**
- Trying to write to read-only environment values -- most are read-only. Check the docs for each.
- Using `@Environment(UserSession.self)` syntax for system keys -- system keys use the key-path syntax `@Environment(\.colorScheme)`, while custom `@Observable` objects use the type syntax `@Environment(UserSession.self)`.

---

## Regular Properties -- Read-Only from Parent

If a child view only needs to display data without modifying it, skip the property wrappers entirely. Pass it as a plain `let`.

```swift
struct ItemRow: View {
    let title: String       // read-only, no wrapper
    let subtitle: String
    let iconName: String

    var body: some View {
        HStack {
            Image(systemName: iconName)
                .accessibilityHidden(true)
            VStack(alignment: .leading) {
                Text(title).font(.headline)
                Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title), \(subtitle)")
    }
}

// Usage
ItemRow(title: "Meeting", subtitle: "2:00 PM", iconName: "calendar")
```

**Common mistakes:**
- Using `@Binding` when the child never writes back. If it is read-only, use `let`.
- Using `@State` to "store" a value passed from a parent. `@State` creates an independent copy -- changes from the parent will not propagate.

---

## Legacy: @StateObject and @ObservedObject (iOS 16 and Earlier)

If you must support iOS 16 or earlier, `@Observable` is not available. Use the older `ObservableObject` protocol.

```swift
// The model conforms to ObservableObject
class LegacyViewModel: ObservableObject {
    @Published var items: [String] = []
    @Published var isLoading = false

    func load() {
        isLoading = true
        // fetch data...
    }
}

// The view that CREATES the object uses @StateObject
struct LegacyParentView: View {
    @StateObject private var viewModel = LegacyViewModel()  // owns it

    var body: some View {
        LegacyChildView(viewModel: viewModel)
            .task { viewModel.load() }
    }
}

// A view that RECEIVES the object uses @ObservedObject
struct LegacyChildView: View {
    @ObservedObject var viewModel: LegacyViewModel  // borrows it

    var body: some View {
        List(viewModel.items, id: \.self) { item in
            Text(item)
        }
        .overlay {
            if viewModel.isLoading { ProgressView() }
        }
    }
}
```

**The critical rule:**
- `@StateObject` = this view creates and owns the object. Use at the point of creation.
- `@ObservedObject` = this view receives the object from outside. Use everywhere else.

If you use `@ObservedObject` to create an object, SwiftUI may destroy and recreate it on every view update -- causing data loss, flickering, and bugs.

---

## Summary Table

| Wrapper | Owns data? | iOS version | Use case |
|---|---|---|---|
| `@State` | Yes | All | Local UI values (booleans, strings, numbers) |
| `@Binding` | No (borrows) | All | Child needs to write parent's state |
| `@Observable` + `.environment()` | Varies | 17+ | Shared model across many views |
| `@Environment(\.key)` | No (reads) | All | System-provided values |
| `let` property | No (reads) | All | Read-only data from parent |
| `@StateObject` | Yes | 14-16 | Creates an ObservableObject |
| `@ObservedObject` | No (borrows) | 14-16 | Receives an ObservableObject |
| `@EnvironmentObject` | No (reads) | 14-16 | Shared ObservableObject via environment |
