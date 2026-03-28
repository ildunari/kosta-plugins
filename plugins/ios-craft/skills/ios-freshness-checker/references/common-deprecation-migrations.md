# Common Deprecation Migrations

30 common iOS API deprecations with before/after migration code.

---

## UIKit Deprecations

### 1. keyWindow (Deprecated iOS 13)

```swift
// BEFORE
let window = UIApplication.shared.keyWindow

// AFTER
let window = UIApplication.shared.connectedScenes
    .compactMap { $0 as? UIWindowScene }
    .flatMap(\.windows)
    .first(where: \.isKeyWindow)
```

### 2. statusBarStyle (Deprecated iOS 9)

```swift
// BEFORE
UIApplication.shared.statusBarStyle = .lightContent

// AFTER — set per view controller
override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
```

### 3. UITableViewCell.textLabel / detailTextLabel (Deprecated iOS 14)

```swift
// BEFORE
cell.textLabel?.text = "Title"
cell.detailTextLabel?.text = "Subtitle"

// AFTER — content configuration
var content = cell.defaultContentConfiguration()
content.text = "Title"
content.secondaryText = "Subtitle"
cell.contentConfiguration = content
```

### 4. UITableViewCell.imageView (Deprecated iOS 14)

```swift
// BEFORE
cell.imageView?.image = UIImage(systemName: "star")

// AFTER
var content = cell.defaultContentConfiguration()
content.image = UIImage(systemName: "star")
cell.contentConfiguration = content
```

### 5. UIAlertView (Deprecated iOS 9)

```swift
// BEFORE
let alert = UIAlertView(title: "Error", message: "Oops", delegate: self, cancelButtonTitle: "OK")
alert.show()

// AFTER
let alert = UIAlertController(title: "Error", message: "Oops", preferredStyle: .alert)
alert.addAction(UIAlertAction(title: "OK", style: .default))
present(alert, animated: true)
```

### 6. UIActionSheet (Deprecated iOS 8)

```swift
// BEFORE
let sheet = UIActionSheet(title: "Options", delegate: self, cancelButtonTitle: "Cancel", destructiveButtonTitle: "Delete")

// AFTER
let sheet = UIAlertController(title: "Options", message: nil, preferredStyle: .actionSheet)
sheet.addAction(UIAlertAction(title: "Delete", style: .destructive) { _ in self.delete() })
sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))
present(sheet, animated: true)
```

### 7. UIColor.groupTableViewBackground (Deprecated iOS 13)

```swift
// BEFORE
view.backgroundColor = .groupTableViewBackground

// AFTER
view.backgroundColor = .systemGroupedBackground
```

### 8. UIApplication.shared.open(_:) without completion (Deprecated iOS 10)

```swift
// BEFORE
UIApplication.shared.openURL(url)

// AFTER
UIApplication.shared.open(url, options: [:]) { success in
    // Handle result
}

// Or with async/await
await UIApplication.shared.open(url)
```

### 9. UITableView.dequeueReusableCell (style initializer, Deprecated iOS 14)

```swift
// BEFORE
override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
    super.init(style: .subtitle, reuseIdentifier: reuseIdentifier)
}

// AFTER — use content configurations in cellForRowAt
func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "cell", for: indexPath)
    var content = cell.defaultContentConfiguration()
    content.text = items[indexPath.row].title
    content.secondaryText = items[indexPath.row].subtitle
    cell.contentConfiguration = content
    return cell
}
```

### 10. UINavigationBar.appearance().titleTextAttributes (Still works but prefer per-instance)

```swift
// BEFORE — global appearance
UINavigationBar.appearance().titleTextAttributes = [.foregroundColor: UIColor.white]

// AFTER — per-instance with UINavigationBarAppearance
let appearance = UINavigationBarAppearance()
appearance.configureWithOpaqueBackground()
appearance.titleTextAttributes = [.foregroundColor: UIColor.white]
navigationController?.navigationBar.standardAppearance = appearance
navigationController?.navigationBar.scrollEdgeAppearance = appearance
```

---

## SwiftUI Deprecations

### 11. NavigationView (Deprecated iOS 16)

```swift
// BEFORE
NavigationView {
    List(items) { item in
        NavigationLink(item.name) {
            DetailView(item: item)
        }
    }
}

// AFTER — stack-based
NavigationStack {
    List(items) { item in
        NavigationLink(item.name, value: item)
    }
    .navigationDestination(for: Item.self) { item in
        DetailView(item: item)
    }
}

// AFTER — split view (iPad)
NavigationSplitView {
    List(items, selection: $selected) { item in
        Text(item.name)
    }
} detail: {
    if let selected {
        DetailView(item: selected)
    }
}
```

### 12. onChange single parameter (Deprecated iOS 17)

```swift
// BEFORE
.onChange(of: value) { newValue in
    handleChange(newValue)
}

// AFTER
.onChange(of: value) { oldValue, newValue in
    handleChange(newValue)
}

// Or if you don't need the old value
.onChange(of: value) {
    handleChange(value)
}
```

### 13. ObservableObject / @Published (Superseded iOS 17)

```swift
// BEFORE
class ViewModel: ObservableObject {
    @Published var name = ""
    @Published var count = 0
}

struct ContentView: View {
    @StateObject var vm = ViewModel()
    // or @ObservedObject var vm: ViewModel
}

// AFTER — @Observable macro
@Observable
class ViewModel {
    var name = ""
    var count = 0
}

struct ContentView: View {
    @State var vm = ViewModel()
    // Views only re-render when properties they READ change
}
```

### 14. .foregroundColor() (Deprecated iOS 17)

```swift
// BEFORE
Text("Hello").foregroundColor(.blue)

// AFTER
Text("Hello").foregroundStyle(.blue)
// foregroundStyle is more powerful — supports gradients and shape styles
Text("Hello").foregroundStyle(.linearGradient(colors: [.blue, .purple], startPoint: .leading, endPoint: .trailing))
```

### 15. .background(_:) shape (Deprecated iOS 17)

```swift
// BEFORE
Text("Hello")
    .background(Color.blue)

// AFTER
Text("Hello")
    .background(.blue)
// Or with shape
Text("Hello")
    .background(.blue, in: .rect(cornerRadius: 8))
```

### 16. .overlay(_:) shape (Deprecated iOS 17)

```swift
// BEFORE
Circle()
    .overlay(Text("1"))

// AFTER
Circle()
    .overlay { Text("1") }
```

### 17. .cornerRadius() (Deprecated iOS 17)

```swift
// BEFORE
Image("photo")
    .cornerRadius(12)

// AFTER
Image("photo")
    .clipShape(.rect(cornerRadius: 12))
```

### 18. .toolbar content with ToolbarItem init(id:placement:) (Deprecated iOS 17)

```swift
// BEFORE
.toolbar {
    ToolbarItem(id: "add", placement: .primaryAction) {
        Button("Add") { }
    }
}

// AFTER — use ToolbarItem with CustomizableToolbarContent
.toolbar(id: "main") {
    ToolbarItem(id: "add", placement: .primaryAction) {
        Button("Add") { }
    }
}
```

---

## Foundation / System Deprecations

### 19. URLSession completion handler (Not deprecated but superseded)

```swift
// BEFORE
URLSession.shared.dataTask(with: url) { data, response, error in
    DispatchQueue.main.async {
        if let data = data {
            self.result = data
        }
    }
}.resume()

// AFTER — async/await
let (data, response) = try await URLSession.shared.data(from: url)
self.result = data
```

### 20. DispatchQueue.main.async (Not deprecated but prefer @MainActor)

```swift
// BEFORE
DispatchQueue.main.async {
    self.updateUI()
}

// AFTER
await MainActor.run {
    self.updateUI()
}

// Or mark the function
@MainActor
func updateUI() {
    // Automatically runs on main thread
}
```

### 21. NSCoding / NSKeyedArchiver unarchiveObject (Deprecated iOS 12)

```swift
// BEFORE
let data = NSKeyedArchiver.archivedData(withRootObject: object)
let decoded = NSKeyedUnarchiver.unarchiveObject(with: data)

// AFTER
let data = try NSKeyedArchiver.archivedData(withRootObject: object, requiringSecureCoding: true)
let decoded = try NSKeyedUnarchiver.unarchivedObject(ofClass: MyClass.self, from: data)
```

### 22. UserDefaults.standard.set(value, forKey:) for dates (Still works but prefer Codable)

```swift
// BEFORE
UserDefaults.standard.set(Date(), forKey: "lastSync")
let date = UserDefaults.standard.object(forKey: "lastSync") as? Date

// AFTER — @AppStorage with Codable
@AppStorage("lastSync") var lastSync: Date = .distantPast
```

### 23. Notification.Name string literals

```swift
// BEFORE
NotificationCenter.default.post(name: Notification.Name("UserLoggedIn"), object: nil)

// AFTER — type-safe extension
extension Notification.Name {
    static let userLoggedIn = Notification.Name("UserLoggedIn")
}
NotificationCenter.default.post(name: .userLoggedIn, object: nil)
```

---

## Core Data Deprecations

### 24. NSPersistentContainer viewContext fetch (Thread safety)

```swift
// BEFORE — fetching on background, modifying on main
let results = try context.fetch(request)  // Which thread?

// AFTER — explicit context
container.viewContext.perform {
    let results = try? container.viewContext.fetch(request)
    // Safe on main thread
}

// Background work
container.performBackgroundTask { context in
    let results = try? context.fetch(request)
    // Safe on background thread
}
```

### 25. NSManagedObject setValue:forKey: (Prefer generated accessors)

```swift
// BEFORE
entity.setValue("John", forKey: "name")

// AFTER — use generated NSManagedObject subclass
entity.name = "John"
```

---

## Media / Camera Deprecations

### 26. UIImagePickerController (Superseded iOS 14)

```swift
// BEFORE
let picker = UIImagePickerController()
picker.sourceType = .photoLibrary
present(picker, animated: true)

// AFTER — PHPickerViewController (UIKit)
var config = PHPickerConfiguration()
config.selectionLimit = 1
config.filter = .images
let picker = PHPickerViewController(configuration: config)
present(picker, animated: true)

// AFTER — PhotosPicker (SwiftUI, iOS 16+)
PhotosPicker(selection: $selectedPhoto, matching: .images) {
    Label("Select Photo", systemImage: "photo")
}
```

### 27. UIImageJPEGRepresentation / UIImagePNGRepresentation (Deprecated iOS 12 naming)

```swift
// BEFORE
let data = UIImageJPEGRepresentation(image, 0.8)

// AFTER
let data = image.jpegData(compressionQuality: 0.8)
let pngData = image.pngData()
```

---

## StoreKit Deprecations

### 28. SKProductsRequest / SKPaymentQueue (Superseded iOS 15)

```swift
// BEFORE — StoreKit 1
let request = SKProductsRequest(productIdentifiers: ["com.app.premium"])
request.delegate = self
request.start()

// AFTER — StoreKit 2
let products = try await Product.products(for: ["com.app.premium"])
if let product = products.first {
    let result = try await product.purchase()
}
```

### 29. SKStoreReviewController.requestReview() (Updated iOS 16)

```swift
// BEFORE
SKStoreReviewController.requestReview()

// AFTER — SwiftUI
@Environment(\.requestReview) var requestReview
// Then call:
requestReview()

// AFTER — UIKit (scene-based)
if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
    SKStoreReviewController.requestReview(in: scene)
}
```

---

## Testing Deprecations

### 30. XCTest → Swift Testing (iOS 18+)

```swift
// BEFORE — XCTest
class MyTests: XCTestCase {
    func testAddition() {
        XCTAssertEqual(2 + 2, 4)
    }

    func testThrows() {
        XCTAssertThrowsError(try riskyFunction())
    }
}

// AFTER — Swift Testing
@Test func addition() {
    #expect(2 + 2 == 4)
}

@Test func throwsError() {
    #expect(throws: MyError.self) {
        try riskyFunction()
    }
}

// Parameterized tests
@Test(arguments: [1, 2, 3, 4, 5])
func isPositive(value: Int) {
    #expect(value > 0)
}
```

---

## Migration Priority

| Priority | Migrations | Why |
|----------|-----------|-----|
| **Fix now** | 1, 5, 6, 8, 21 | Actually broken or will break soon |
| **Fix before next release** | 3, 4, 9, 11, 13 | Using deprecated APIs that show warnings |
| **Adopt when raising minimum** | 12, 14, 15, 16, 17, 19, 20, 26, 28, 30 | Modern replacements available |
| **Nice to have** | 7, 10, 22, 23, 24, 25, 27, 29 | Cleaner code but no urgency |
