# Memory Debugging Walkthrough

Step-by-step guide to finding memory leaks using Xcode's Memory Graph Debugger and Instruments Leaks tool.

---

## Part 1: Understanding the Problem

A **memory leak** means your app allocated memory that it never releases. The memory grows over time until iOS kills the app (you see a "Terminated due to memory issue" crash log).

The most common cause in Swift is a **retain cycle**: two objects hold strong references to each other, so neither can be deallocated.

### Sample Retain Cycle

```swift
class PostListViewModel {
    var posts: [Post] = []
    var onPostSelected: ((Post) -> Void)?

    func setup() {
        onPostSelected = { post in
            self.showDetail(for: post)  // 'self' is captured strongly
        }
        // Now: self → onPostSelected (closure) → self
        // Neither can be freed.
    }

    func showDetail(for post: Post) { /* ... */ }
}
```

The fix:
```swift
func setup() {
    onPostSelected = { [weak self] post in
        self?.showDetail(for: post)  // Weak capture breaks the cycle
    }
}
```

---

## Part 2: Memory Graph Debugger

The Memory Graph Debugger takes a snapshot of every object in memory and shows you the reference relationships between them. It highlights objects that are leaked.

### Step-by-Step

**1. Run your app in the Simulator or on a device.**

Use the app normally. Navigate to the screen you suspect has a leak. Go back. Repeat a few times (each cycle should free the previous screen's objects).

**2. Pause and capture the memory graph.**

In Xcode's debug toolbar (bottom of the editor), click the **Memory Graph** button -- it looks like three connected circles. It's between the view debugger and the CPU gauge.

Xcode pauses the app and captures the graph.

**3. Look at the left sidebar.**

The sidebar shows all live objects, grouped by type. Look for:
- **Objects that shouldn't exist anymore** -- If you dismissed a screen, its view controller and view model should be gone. If they're still here, they're leaked.
- **Purple exclamation marks** -- Xcode highlights objects it suspects are leaked.

**4. Click a suspected leaked object.**

The center panel shows a **reference graph** -- arrows pointing to this object from other objects. Each arrow is a strong reference keeping it alive.

**5. Find the cycle.**

Follow the arrows. If you see a loop (A → B → A), that's your retain cycle. The arrow labels show the property name holding the reference.

**6. Break the cycle.**

Make one of the references `weak` or `unowned`. Usually the "back reference" (child pointing to parent, closure capturing self) should be weak.

### What to Look For

| In the Graph | What It Means |
|---|---|
| Purple ! icon | Xcode detected a potential leak |
| Object count growing | Same type appearing more times after repeated navigation |
| Closure → self arrows | A closure is capturing `self` strongly |
| Delegate → owner arrows | A delegate pattern is using a strong reference |

### Tips

- **Filter by your module.** Type your app name in the filter bar to hide system objects.
- **Look for view controllers and view models first.** These are the most common leak sources.
- **Check object counts.** If `ProfileViewModel` has 5 instances but you only navigated to the profile once, 4 are leaked.

---

## Part 3: Instruments Leaks

The Memory Graph Debugger shows a snapshot. Instruments shows leaks **over time**, which is better for catching leaks during specific user flows.

### Step-by-Step

**1. Open Instruments.**

Product > Profile (Cmd+I). Choose the **Leaks** template.

**2. Press Record.**

The app launches. Use it normally. Focus on the flows you want to test -- navigate forward and back, open and close sheets, etc.

**3. Watch the Leaks track.**

The **Leaks** instrument checks for leaks periodically (every ~10 seconds). When it finds one, a red X appears on the timeline.

**4. Click a leak.**

The bottom panel shows the leaked object type and its allocation backtrace -- the call stack showing where it was created.

**5. Read the backtrace.**

Look for your code in the backtrace. The allocation site tells you where the object was created. The leak means it was never freed.

**6. Check the Allocations track.**

The **Allocations** instrument (included in the Leaks template) shows all memory allocations. Use it to:
- See total memory usage over time (the "All Heap Allocations" graph should stabilize, not keep growing)
- Filter by your class names to see their instance counts
- Mark generations: after completing a user flow, click "Mark Generation" to see what new allocations persist

### The Generation Analysis Technique

This is the most powerful technique for finding leaks:

1. Get the app to a stable state (e.g., home screen)
2. Click **Mark Generation** in the Allocations instrument
3. Navigate to a screen and back to home
4. Click **Mark Generation** again
5. Repeat steps 3-4 several times

Each generation shows objects allocated since the last mark. After returning to the home screen, most objects from the visited screen should be freed. If objects persist across generations, they're leaked.

---

## Part 4: Common Retain Cycle Patterns

### Pattern A: Closure Capturing Self

```swift
// LEAK
class ViewModel {
    var timer: Timer?

    func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            self.tick()  // Strong capture
        }
    }
}

// FIX
func startTimer() {
    timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
        self?.tick()
    }
}
```

### Pattern B: Delegate Without Weak

```swift
// LEAK
protocol DataManagerDelegate: AnyObject {
    func didUpdateData()
}

class DataManager {
    var delegate: DataManagerDelegate?  // Strong reference to delegate
}

// FIX
class DataManager {
    weak var delegate: DataManagerDelegate?  // Weak breaks the cycle
}
```

### Pattern C: NotificationCenter Observer (Pre-iOS 9 Pattern)

```swift
// LEAK (only if manually adding observers without removal)
class ViewController {
    func viewDidLoad() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleNotification),
            name: .dataDidChange,
            object: nil
        )
    }
    // Missing: removeObserver in deinit
}

// FIX: Use the closure-based API with weak self
class ViewController {
    private var observer: NSObjectProtocol?

    func viewDidLoad() {
        observer = NotificationCenter.default.addObserver(
            forName: .dataDidChange,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            self?.handleNotification(notification)
        }
    }

    deinit {
        if let observer { NotificationCenter.default.removeObserver(observer) }
    }
}
```

### Pattern D: Combine Subscription Without cancel()

```swift
// LEAK
class ViewModel {
    var cancellable: AnyCancellable?

    func subscribe() {
        cancellable = publisher
            .sink { self.handle($0) }  // Strong capture
    }
}

// FIX
func subscribe() {
    cancellable = publisher
        .sink { [weak self] value in
            self?.handle(value)
        }
}
```

---

## Part 5: Verifying the Fix

After fixing a suspected leak:

1. Run the Memory Graph Debugger again after the same user flow
2. Check that the leaked object count is now 0
3. Run Instruments Leaks and confirm no red X marks appear
4. Use generation analysis to confirm objects are freed between navigation cycles

### Adding a deinit Check

During development, add `deinit` prints to confirm objects are being freed:

```swift
class ProfileViewModel {
    deinit {
        print("ProfileViewModel deallocated")  // Should print when navigating away
    }
}
```

If you navigate away from the profile screen and don't see this print, the object is being retained somewhere.

> Remove `deinit` prints before shipping. They're a development tool only.
