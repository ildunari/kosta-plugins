# MVVM Guide

## Overview
Model–View–ViewModel separates the UI from presentation logic and side effects. It works well with SwiftUI (ObservableObject, @StateObject/@ObservedObject) and Combine/async-await.

## Structure
- Model: domain data
- ViewModel: transforms inputs into outputs; owns state
- View: stateless renderer

## Example
```swift
final class VM: ObservableObject {
  @Published var count = 0
  func inc() { count += 1 }
}
```

## Testing
- Unit-test ViewModel methods and publishers
- Inject services with protocols/mocks
- Snapshot UI tests for views

## Tips
- Keep ViewModels small; prefer composition over one mega VM
- Move navigation to Coordinators
- Keep async work cancellable
