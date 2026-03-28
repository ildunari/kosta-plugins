---
name: swiftui-guided-builder
description: >
  Build complete SwiftUI screens from descriptions. Use when the user wants to create
  a new screen, view, or component. Asks what they need, then produces a complete
  implementation with proper state management, navigation, accessibility labels, and
  previews. Covers list-detail, forms, settings, onboarding, dashboards, and custom layouts.
---

# SwiftUI Guided Builder

You are a SwiftUI screen builder that helps developers create complete, production-ready views from plain descriptions. Your job is to ask the right questions, choose the right patterns, and produce code that compiles, looks good, and follows Apple's conventions.

---

## Step 1: Understand What They Want

Before writing any code, ask the user:

1. **Screen type** -- Which of these best describes what you're building?
   - **List** -- a scrollable list of items (contacts, messages, tasks)
   - **Detail** -- a single-item view showing full information
   - **Form** -- input fields for creating or editing data (login, signup, settings)
   - **Settings** -- toggles, pickers, and navigation links for app preferences
   - **Onboarding** -- a multi-step introduction flow (carousel, walkthrough)
   - **Dashboard** -- cards, metrics, and summaries on one screen
   - **Custom** -- none of the above; describe it freely

2. **Data shape** -- What data does this screen show? Ask for field names and types. If the user is unsure, suggest sensible defaults for their screen type.

3. **Navigation context** -- Where does this screen live?
   - Is it a root tab? A pushed detail? A presented sheet?
   - Does it push to other screens?

4. **Platform targets** -- iPhone only? iPad too? iOS 17+ or need iOS 16 support?

If the user gives a one-line description like "make me a settings screen," infer reasonable defaults and confirm before generating code.

---

## Step 2: Choose State Management

Use this decision tree to pick the right property wrappers. Reference `references/state-decision-tree.md` for the full breakdown.

```
Is the data UI-only (toggles, text field contents, sheet visibility)?
  YES → @State (private, owned by this view)

Does a child view need to read AND write this data?
  YES → Pass as @Binding

Is the data shared across many views (user session, app settings, cart)?
  YES → @Observable class + inject via .environment()

Is it provided by the system (color scheme, locale, dismiss action)?
  YES → @Environment(\.keyPath)

Is it passed from a parent but the child only reads it?
  YES → Pass as a regular property (let)

Targeting iOS 16 or earlier?
  YES → Use @StateObject for owned objects, @ObservedObject for passed objects
```

### Quick Reference Table

| Scenario | iOS 17+ | iOS 16 and earlier |
|---|---|---|
| Local UI state | `@State private var` | `@State private var` |
| Child writes parent state | `@Binding var` | `@Binding var` |
| Shared model object | `@Observable` + `.environment()` | `@StateObject` / `@ObservedObject` |
| System value | `@Environment(\.colorScheme)` | `@Environment(\.colorScheme)` |
| Read-only from parent | `let value: Type` | `let value: Type` |

---

## Step 3: Generate the View

Every generated view file follows this structure, top to bottom:

```swift
import SwiftUI

struct ScreenNameView: View {
    // 1. Environment values
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme

    // 2. Injected properties (from parent or navigation)
    let item: ItemModel

    // 3. Local state
    @State private var searchText = ""
    @State private var isShowingSheet = false

    // 4. Body
    var body: some View {
        // Main content here
    }

    // 5. Extracted subviews (private computed properties or methods)
    private var headerSection: some View {
        // ...
    }
}

// 6. Preview
#Preview {
    ScreenNameView(item: .sample)
}
```

### Rules for Every Generated View

**Accessibility** -- Every interactive element gets an `.accessibilityLabel()`. Every image gets `.accessibilityLabel()` or `.accessibilityHidden(true)` for decorative images. Group related elements with `.accessibilityElement(children: .combine)` when it makes sense.

```swift
Button(action: deleteItem) {
    Image(systemName: "trash")
}
.accessibilityLabel("Delete item")

Image("hero-banner")
    .accessibilityHidden(true) // decorative
```

**Dark mode** -- Never hardcode colors. Use semantic colors or design tokens:

```swift
// Good: adapts to dark mode automatically
.foregroundStyle(.primary)
.background(Color(.systemBackground))
.background(Color(.secondarySystemGroupedBackground))

// Also good: custom design tokens
.foregroundStyle(DesignTokens.textPrimary)
.background(DesignTokens.surfaceSecondary)
```

**Navigation** -- Use the right container for the context:

```swift
// Root of a navigation stack
NavigationStack {
    ContentView()
        .navigationTitle("Items")
}

// Sheet presentation (item-based, not boolean)
.sheet(item: $selectedItem) { item in
    DetailView(item: item)
}

// Alert
.alert("Delete Item?", isPresented: $isShowingDeleteAlert) {
    Button("Delete", role: .destructive) { deleteItem() }
    Button("Cancel", role: .cancel) { }
}
```

**Previews** -- Always include a preview with sample data. Use the `#Preview` macro (iOS 17+) or `PreviewProvider` for older targets:

```swift
// iOS 17+
#Preview {
    NavigationStack {
        ItemListView()
    }
}

#Preview("Empty State") {
    ItemListView(items: [])
}

// iOS 16 and earlier
struct ItemListView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            ItemListView()
        }
    }
}
```

---

## Step 4: Screen Type Templates

Use these as starting points. Adapt based on the user's answers from Step 1.

### List Screen

```swift
struct ItemListView: View {
    @State private var items: [Item] = Item.samples
    @State private var searchText = ""

    var filteredItems: [Item] {
        if searchText.isEmpty { return items }
        return items.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        List {
            ForEach(filteredItems) { item in
                NavigationLink(value: item) {
                    ItemRow(item: item)
                }
                .accessibilityLabel("\(item.name), \(item.subtitle)")
            }
            .onDelete(perform: deleteItems)
        }
        .searchable(text: $searchText, prompt: "Search items")
        .navigationTitle("Items")
        .toolbar {
            EditButton()
        }
        .overlay {
            if filteredItems.isEmpty {
                ContentUnavailableView.search(text: searchText)
            }
        }
    }

    private func deleteItems(at offsets: IndexSet) {
        items.remove(atOffsets: offsets)
    }
}
```

### Detail Screen

```swift
struct ItemDetailView: View {
    let item: Item
    @State private var isShowingEditSheet = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                headerImage
                titleSection
                descriptionSection
            }
            .padding()
        }
        .navigationTitle(item.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            Button("Edit") { isShowingEditSheet = true }
                .accessibilityLabel("Edit \(item.name)")
        }
        .sheet(isPresented: $isShowingEditSheet) {
            EditItemView(item: item)
        }
    }

    private var headerImage: some View {
        Image(item.imageName)
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(height: 200)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .accessibilityHidden(true)
    }

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(item.name)
                .font(.title.bold())
            Text(item.category)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var descriptionSection: some View {
        Text(item.description)
            .font(.body)
            .foregroundStyle(.primary)
    }
}
```

### Form Screen

```swift
struct CreateItemView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var description = ""
    @State private var category: Category = .general
    @State private var isImportant = false

    private var isFormValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Details") {
                    TextField("Name", text: $name)
                        .accessibilityLabel("Item name")
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                        .accessibilityLabel("Item description")
                }

                Section("Options") {
                    Picker("Category", selection: $category) {
                        ForEach(Category.allCases, id: \.self) { cat in
                            Text(cat.displayName).tag(cat)
                        }
                    }
                    Toggle("Mark as important", isOn: $isImportant)
                        .accessibilityLabel("Mark this item as important")
                }
            }
            .navigationTitle("New Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { saveItem() }
                        .disabled(!isFormValid)
                        .accessibilityLabel("Save new item")
                }
            }
        }
    }

    private func saveItem() {
        // Save logic here
        dismiss()
    }
}
```

### Settings Screen

```swift
struct SettingsView: View {
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("selectedTheme") private var selectedTheme: String = "system"
    @State private var isShowingAbout = false

    var body: some View {
        Form {
            Section("Preferences") {
                Toggle("Notifications", isOn: $notificationsEnabled)
                    .accessibilityLabel("Enable notifications")

                Picker("Theme", selection: $selectedTheme) {
                    Text("System").tag("system")
                    Text("Light").tag("light")
                    Text("Dark").tag("dark")
                }
                .accessibilityLabel("App theme")
            }

            Section("About") {
                NavigationLink("Privacy Policy") {
                    WebContentView(url: URL(string: "https://example.com/privacy")!)
                }
                NavigationLink("Terms of Service") {
                    WebContentView(url: URL(string: "https://example.com/terms")!)
                }
                Button("About This App") { isShowingAbout = true }
                    .accessibilityLabel("About this app")
            }

            Section {
                HStack {
                    Spacer()
                    Text("Version 1.0.0")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
            }
        }
        .navigationTitle("Settings")
        .sheet(isPresented: $isShowingAbout) {
            AboutView()
        }
    }
}
```

---

## Step 5: Polish and Deliver

After generating the view, check:

1. **Does every `Button`, `Toggle`, `Slider`, `TextField`, and `Picker` have an `.accessibilityLabel()`?** Add any missing ones.
2. **Are colors semantic or token-based?** No hardcoded hex values.
3. **Is there a preview?** Include at least one default preview and one edge-case preview (empty data, long text, error state).
4. **Is the file structure clean?** Environment at top, state grouped together, body in the middle, extracted subviews at the bottom.
5. **Does it compile?** Check for missing types, unclosed braces, and correct property wrapper usage.

---

## Cross-References

- For deeper SwiftUI patterns (custom layouts, geometry reader, animations, performance): invoke `apple-swiftui-mastery`
- For iOS 26 Liquid Glass effects and material treatments: invoke `apple-ios-liquid-glass-ux`
- For navigation pattern details and code: see `references/navigation-cookbook.md`
- For state management decision tree with examples: see `references/state-decision-tree.md`
- For complete screen recipes with full code: see `references/screen-recipes.md`

---

## Common Mistakes to Catch

| Mistake | Fix |
|---|---|
| Using `@StateObject` on iOS 17+ | Use `@State` with `@Observable` classes instead |
| Boolean-based `.sheet(isPresented:)` when you have data | Use `.sheet(item:)` to pass data directly |
| Forgetting `NavigationStack` wrapper | Lists and forms need a navigation container to show titles and toolbars |
| Hardcoding colors like `Color.white` | Use `Color(.systemBackground)` or design tokens |
| Missing accessibility labels on icon-only buttons | Every icon button needs `.accessibilityLabel("description")` |
| Putting too much logic in `body` | Extract subviews into computed properties or separate structs |
| Using `@ObservedObject` to create an object | `@ObservedObject` does not own the object; use `@StateObject` (iOS 16) or `@State` (iOS 17+) |
| Not handling empty states | Use `ContentUnavailableView` or a custom empty state view |
