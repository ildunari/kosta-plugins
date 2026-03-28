# Navigation Cookbook

Every navigation pattern you need in SwiftUI, with complete code and common pitfalls.

---

## 1. NavigationStack with Path-Based Navigation

**When to use:** iPhone apps, any linear push/pop flow, or when you need programmatic navigation (deep links, "go back to root").

A `NavigationStack` with a `path` binding gives you full control over the navigation stack. You can push, pop, and replace screens programmatically.

```swift
import SwiftUI

struct Item: Identifiable, Hashable {
    let id = UUID()
    let name: String
    static let samples = [Item(name: "Alpha"), Item(name: "Beta"), Item(name: "Gamma")]
}

struct RootView: View {
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            List(Item.samples) { item in
                NavigationLink(value: item) {
                    Text(item.name)
                }
                .accessibilityLabel("Open \(item.name)")
            }
            .navigationTitle("Items")
            .navigationDestination(for: Item.self) { item in
                DetailView(item: item, path: $path)
            }
        }
    }
}

struct DetailView: View {
    let item: Item
    @Binding var path: NavigationPath

    var body: some View {
        VStack(spacing: 20) {
            Text(item.name).font(.largeTitle)

            Button("Back to Root") {
                path = NavigationPath() // clears the entire stack
            }
            .accessibilityLabel("Return to root screen")
        }
        .navigationTitle(item.name)
    }
}
```

**Common pitfalls:**
- Forgetting `.navigationDestination(for:)` -- the link will do nothing and print a console warning.
- Registering the same type in multiple `.navigationDestination` modifiers -- only one will fire, and the behavior is undefined.
- Placing `NavigationStack` inside a `NavigationStack` -- this creates nested navigation bars. Only one `NavigationStack` per navigation hierarchy.

---

## 2. NavigationSplitView for iPad

**When to use:** Multi-column layouts on iPad, Mac Catalyst, or any app that benefits from a sidebar. Falls back to a single column on iPhone automatically.

```swift
import SwiftUI

struct Category: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let items: [String]

    static let samples = [
        Category(name: "Fruits", items: ["Apple", "Banana", "Cherry"]),
        Category(name: "Vegetables", items: ["Carrot", "Broccoli", "Spinach"]),
    ]
}

struct SplitNavView: View {
    @State private var selectedCategory: Category?
    @State private var selectedItem: String?

    var body: some View {
        NavigationSplitView {
            // Sidebar
            List(Category.samples, selection: $selectedCategory) { category in
                NavigationLink(value: category) {
                    Label(category.name, systemImage: "folder")
                }
                .accessibilityLabel(category.name)
            }
            .navigationTitle("Categories")
        } content: {
            // Middle column (optional -- use two-column variant without this)
            if let category = selectedCategory {
                List(category.items, id: \.self, selection: $selectedItem) { item in
                    NavigationLink(value: item) {
                        Text(item)
                    }
                }
                .navigationTitle(category.name)
            } else {
                ContentUnavailableView("Select a Category", systemImage: "sidebar.left")
            }
        } detail: {
            // Detail column
            if let item = selectedItem {
                Text(item)
                    .font(.largeTitle)
                    .navigationTitle(item)
            } else {
                ContentUnavailableView("Select an Item", systemImage: "doc.text")
            }
        }
    }
}
```

**Common pitfalls:**
- Not handling the `nil` state for each column -- always show a placeholder when nothing is selected.
- Using `NavigationSplitView` for iPhone-only apps -- it adds unnecessary complexity. Use `NavigationStack` instead.
- Forgetting that `NavigationSplitView` collapses to single-column on compact-width devices -- test both layouts.

---

## 3. Sheet Presentation (Item-Based)

**When to use:** Modal screens for creating, editing, or viewing detail. Prefer item-based sheets over boolean-based sheets whenever you have data to pass.

```swift
import SwiftUI

struct Task: Identifiable {
    let id = UUID()
    let title: String
    static let samples = [Task(title: "Buy groceries"), Task(title: "Call dentist")]
}

struct TaskListView: View {
    let tasks = Task.samples
    @State private var selectedTask: Task?
    @State private var isShowingNewTask = false

    var body: some View {
        List(tasks) { task in
            Button(task.title) {
                selectedTask = task
            }
            .accessibilityLabel("View \(task.title)")
        }
        .navigationTitle("Tasks")
        .toolbar {
            Button(action: { isShowingNewTask = true }) {
                Image(systemName: "plus")
            }
            .accessibilityLabel("Add new task")
        }
        // Item-based: passes the selected task directly
        .sheet(item: $selectedTask) { task in
            NavigationStack {
                Text("Detail for: \(task.title)")
                    .navigationTitle(task.title)
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Done") { selectedTask = nil }
                        }
                    }
            }
        }
        // Boolean-based: only when there's no data to pass
        .sheet(isPresented: $isShowingNewTask) {
            NavigationStack {
                Text("New Task Form")
                    .navigationTitle("New Task")
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") { isShowingNewTask = false }
                        }
                    }
            }
        }
    }
}
```

**Why item-based is better:**
- No risk of presenting a sheet before the data is ready.
- Dismissal automatically nils out the binding -- one source of truth.
- You avoid the two-step pattern of "set data, then set isPresented."

**Common pitfalls:**
- Attaching multiple `.sheet` modifiers to the same view -- only one can present at a time. Attach each sheet to a different view in the hierarchy, or use a single sheet with an enum to decide what to show.
- Not wrapping sheet content in `NavigationStack` -- without it, you cannot show a title bar or toolbar buttons.

---

## 4. Full-Screen Cover

**When to use:** Immersive experiences that should replace the entire screen -- onboarding, login, media viewers, or anything the user should focus on without seeing the parent.

```swift
struct ContentView: View {
    @State private var isShowingOnboarding = true

    var body: some View {
        Text("Main App Content")
            .fullScreenCover(isPresented: $isShowingOnboarding) {
                OnboardingCover(onComplete: {
                    isShowingOnboarding = false
                })
            }
    }
}

struct OnboardingCover: View {
    var onComplete: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "sparkles")
                .font(.system(size: 80))
                .foregroundStyle(.tint)
                .accessibilityHidden(true)
            Text("Welcome!").font(.largeTitle.bold())
            Text("Let's get you set up.").foregroundStyle(.secondary)
            Spacer()
            Button("Get Started", action: onComplete)
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .accessibilityLabel("Begin setup")
            Spacer().frame(height: 40)
        }
    }
}
```

**Common pitfalls:**
- Full-screen covers cannot be swiped away by default (unlike sheets). You must provide an explicit dismiss mechanism (button, gesture).
- Using full-screen cover for simple detail views -- it is disorienting when a sheet would suffice.

---

## 5. Alert and Confirmation Dialogs

**When to use:** Alerts for simple messages (1-2 actions). Confirmation dialogs for destructive actions with more context.

### Simple Alert

```swift
struct AlertExample: View {
    @State private var isShowingAlert = false

    var body: some View {
        Button("Delete Account") {
            isShowingAlert = true
        }
        .alert("Delete Account?", isPresented: $isShowingAlert) {
            Button("Delete", role: .destructive) {
                // perform deletion
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This action cannot be undone. All your data will be permanently removed.")
        }
    }
}
```

### Confirmation Dialog (Action Sheet)

```swift
struct ConfirmationExample: View {
    @State private var isShowingDialog = false

    var body: some View {
        Button("Share") { isShowingDialog = true }
            .confirmationDialog("Share this item", isPresented: $isShowingDialog, titleVisibility: .visible) {
                Button("Copy Link") { /* copy */ }
                Button("Share via Messages") { /* share */ }
                Button("Share via Email") { /* email */ }
                Button("Cancel", role: .cancel) { }
            }
    }
}
```

**Common pitfalls:**
- Putting logic inside the `role: .cancel` button -- it fires when the user taps outside the alert too, which can cause unexpected behavior. Keep cancel handlers empty or minimal.
- Using an alert when a confirmation dialog is more appropriate -- if you have more than two actions, use `.confirmationDialog`.

---

## 6. Deep Linking with URL Handling

**When to use:** Your app needs to open specific screens from a URL (push notifications, universal links, widgets).

```swift
import SwiftUI

// Define your navigation destinations
enum AppDestination: Hashable {
    case itemDetail(id: String)
    case settings
    case profile(username: String)
}

struct DeepLinkApp: View {
    @State private var path = NavigationPath()
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab("Home", systemImage: "house", value: 0) {
                NavigationStack(path: $path) {
                    Text("Home")
                        .navigationDestination(for: AppDestination.self) { destination in
                            switch destination {
                            case .itemDetail(let id):
                                Text("Item Detail: \(id)")
                            case .settings:
                                Text("Settings")
                            case .profile(let username):
                                Text("Profile: \(username)")
                            }
                        }
                }
            }

            Tab("Settings", systemImage: "gear", value: 1) {
                Text("Settings Tab")
            }
        }
        .onOpenURL { url in
            handleDeepLink(url)
        }
    }

    private func handleDeepLink(_ url: URL) {
        // Example: myapp://item/abc123
        guard let host = url.host() else { return }

        switch host {
        case "item":
            let itemId = url.pathComponents.dropFirst().first ?? ""
            selectedTab = 0
            path = NavigationPath()
            path.append(AppDestination.itemDetail(id: itemId))

        case "settings":
            selectedTab = 1

        case "profile":
            let username = url.pathComponents.dropFirst().first ?? ""
            selectedTab = 0
            path = NavigationPath()
            path.append(AppDestination.profile(username: username))

        default:
            break
        }
    }
}
```

**Common pitfalls:**
- Not resetting the path before pushing a deep-link destination -- the user may end up deep in a stack with no clear way back.
- Handling deep links in `onAppear` instead of `onOpenURL` -- `onAppear` fires on every navigation event, not just URL opens.
- Forgetting to register URL schemes in `Info.plist`.

---

## 7. Tab-Based Navigation (TabView)

**When to use:** Top-level app navigation with 3-5 primary sections.

### iOS 18+ (Typed Tabs)

```swift
import SwiftUI

enum AppTab: String, CaseIterable {
    case home, search, profile

    var title: String {
        rawValue.capitalized
    }

    var systemImage: String {
        switch self {
        case .home: return "house"
        case .search: return "magnifyingglass"
        case .profile: return "person.circle"
        }
    }
}

struct MainTabView: View {
    @State private var selectedTab: AppTab = .home

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab(AppTab.home.title, systemImage: AppTab.home.systemImage, value: .home) {
                NavigationStack {
                    Text("Home Screen")
                        .navigationTitle("Home")
                }
            }

            Tab(AppTab.search.title, systemImage: AppTab.search.systemImage, value: .search) {
                NavigationStack {
                    Text("Search Screen")
                        .navigationTitle("Search")
                }
            }

            Tab(AppTab.profile.title, systemImage: AppTab.profile.systemImage, value: .profile) {
                NavigationStack {
                    Text("Profile Screen")
                        .navigationTitle("Profile")
                }
            }
        }
    }
}
```

### iOS 16-17 (Label-Based)

```swift
struct LegacyTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                Text("Home").navigationTitle("Home")
            }
            .tabItem {
                Label("Home", systemImage: "house")
            }
            .tag(0)

            NavigationStack {
                Text("Search").navigationTitle("Search")
            }
            .tabItem {
                Label("Search", systemImage: "magnifyingglass")
            }
            .tag(1)
        }
    }
}
```

**Common pitfalls:**
- Wrapping `TabView` inside `NavigationStack` instead of putting `NavigationStack` inside each tab -- this creates one shared navigation bar that breaks tab switching.
- Having more than 5 tabs without using "More" -- iOS automatically collapses extra tabs, but the UX can be confusing. Aim for 3-5 tabs.
- Not using `.tag()` with a `selection` binding -- the tab selection will not be programmatically controllable.

---

## 8. Custom Navigation Transitions (iOS 18+)

**When to use:** When you want branded or distinctive transitions between screens. Available from iOS 18+.

```swift
import SwiftUI

struct TransitionExample: View {
    @Namespace private var heroAnimation
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(0..<6, id: \.self) { index in
                        Button {
                            path.append(index)
                        } label: {
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.blue.gradient)
                                .frame(height: 150)
                                .overlay {
                                    Text("Card \(index + 1)")
                                        .font(.headline)
                                        .foregroundStyle(.white)
                                }
                                .matchedTransitionSource(id: index, in: heroAnimation)
                        }
                        .accessibilityLabel("Open card \(index + 1)")
                    }
                }
                .padding()
            }
            .navigationTitle("Gallery")
            .navigationDestination(for: Int.self) { index in
                VStack {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.blue.gradient)
                        .frame(height: 300)
                        .overlay {
                            Text("Card \(index + 1)")
                                .font(.largeTitle.bold())
                                .foregroundStyle(.white)
                        }
                        .navigationTransition(.zoom(sourceID: index, in: heroAnimation))
                        .padding()
                    Spacer()
                }
                .navigationTitle("Card \(index + 1)")
            }
        }
    }
}
```

**Available transitions:**
- `.zoom(sourceID:in:)` -- zoom from source element to full screen (great for grids and cards)
- Default push/pop -- the standard slide transition, no code needed

**Common pitfalls:**
- Using `matchedTransitionSource` without `navigationTransition` on the destination (or vice versa) -- both are required for the transition to work.
- Mismatched IDs between source and destination -- the id and namespace must be identical.
- Testing only on simulator -- custom transitions can behave differently on physical devices. Always test on hardware.
