# First Test Walkthrough

A from-scratch guide to creating a test target, writing your first tests, running them, and understanding the output.

---

## Step 1: Create a Test Target

If your Xcode project doesn't have a test target yet:

1. **File > New > Target**
2. Choose **Unit Testing Bundle** (under the Test section)
3. Name it `YourAppTests` (Xcode suggests this automatically)
4. Make sure **Target to be Tested** is set to your app target
5. Click **Finish**

Xcode creates a test file with boilerplate. Delete the contents -- we'll write our own.

> If you're using Swift Package Manager, tests go in a `Tests/YourPackageTests/` directory and are discovered automatically.

---

## Step 2: Write Three Tests of Increasing Complexity

### Test 1: The Simplest Possible Test

Create a new file `ShoppingListTests.swift` in your test target:

```swift
import Testing
@testable import YourApp

@Test("A new shopping list starts empty")
func newListIsEmpty() {
    let list = ShoppingList()
    #expect(list.items.isEmpty)
}
```

This tests one thing: a new `ShoppingList` has no items. If `ShoppingList()` doesn't exist yet, write it:

```swift
// In your app target
struct ShoppingList {
    var items: [String] = []
}
```

**Run it:** Press `Cmd+U` or click the diamond icon next to the test. A green checkmark means it passed.

### Test 2: Testing Behavior

```swift
@Test("Adding an item increases the count")
func addingItem() {
    var list = ShoppingList()

    list.add("Milk")

    #expect(list.items.count == 1)
    #expect(list.items.first == "Milk")
}
```

This requires an `add` method:

```swift
struct ShoppingList {
    private(set) var items: [String] = []

    mutating func add(_ item: String) {
        items.append(item)
    }
}
```

### Test 3: Testing Edge Cases

```swift
@Test("Adding a duplicate item does not create a second entry")
func duplicateItemIgnored() {
    var list = ShoppingList()
    list.add("Milk")
    list.add("Milk")

    #expect(list.items.count == 1)
}

@Test("Adding an empty string is rejected")
func emptyStringRejected() {
    var list = ShoppingList()
    list.add("")

    #expect(list.items.isEmpty)
}
```

Now your `add` method needs validation:

```swift
mutating func add(_ item: String) {
    let trimmed = item.trimmingCharacters(in: .whitespaces)
    guard !trimmed.isEmpty, !items.contains(trimmed) else { return }
    items.append(trimmed)
}
```

---

## Step 3: Run and Interpret Output

### Running

- **Cmd+U** -- runs all tests in the active scheme
- **Click the diamond** -- runs a single test or test file
- **Test Navigator** (Cmd+6) -- shows all tests, lets you run individually

### Reading Output

When a test passes, you see a green checkmark. When it fails, you see:

```
ShoppingListTests.swift:12: Expectation failed: (list.items.count == 1) is false
  list.items.count → 2
```

This tells you:
- **Where:** `ShoppingListTests.swift`, line 12
- **What failed:** The count was 2, not 1
- **What to fix:** The `add` method isn't deduplicating

### Common Output Messages

| Output | Meaning |
|---|---|
| Green checkmark | Test passed |
| Red X with message | Assertion failed; the message shows expected vs actual |
| "Test crashed" | Your code threw an unhandled error or hit a fatal error |
| "Build failed" | Your test file or app code has a compile error |
| Yellow warning on test | Test was skipped (disabled or conditional) |

---

## Step 4: What You Just Learned

After writing these three tests, you now know:

1. **How to create a test target** -- it's a separate build target that imports your app
2. **How to write a test** -- `@Test` + descriptive name + Arrange-Act-Assert
3. **How to check results** -- `#expect()` with a boolean condition
4. **How to run tests** -- `Cmd+U` or click the diamond
5. **How to read failures** -- the output shows exactly what went wrong and where

You're ready to move on to testing real app logic.
