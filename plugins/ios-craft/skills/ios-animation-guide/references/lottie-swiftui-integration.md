# Lottie SwiftUI Integration

Step-by-step guide for adding Lottie animations to a SwiftUI project using the lottie-ios package.

---

## Step 1: Add lottie-ios via SPM

1. In Xcode: File > Add Package Dependencies
2. Enter URL: `https://github.com/airbnb/lottie-ios`
3. Set version rule to "Up to Next Major Version" from `4.0.0`
4. Add to your app target

---

## Step 2: Add Animation Files

- Export `.json` animation files from After Effects (via Bodymovin plugin) or download from LottieFiles.com
- Drag the `.json` file into your Xcode project (ensure "Copy items if needed" is checked)
- Add to your app target

---

## Step 3: Create LottieView Wrapper

```swift
import SwiftUI
import Lottie

struct LottieView: UIViewRepresentable {
    let name: String
    var loopMode: LottieLoopMode = .playOnce
    var animationSpeed: CGFloat = 1.0
    var contentMode: UIView.ContentMode = .scaleAspectFit
    @Binding var isPlaying: Bool

    func makeUIView(context: Context) -> LottieAnimationView {
        let animationView = LottieAnimationView(name: name)
        animationView.loopMode = loopMode
        animationView.animationSpeed = animationSpeed
        animationView.contentMode = contentMode
        animationView.translatesAutoresizingMaskIntoConstraints = false
        return animationView
    }

    func updateUIView(_ uiView: LottieAnimationView, context: Context) {
        if isPlaying {
            uiView.play { finished in
                if finished && loopMode == .playOnce {
                    DispatchQueue.main.async { isPlaying = false }
                }
            }
        } else {
            uiView.pause()
        }
    }
}
```

---

## Step 4: Basic Usage

```swift
struct AnimatedCheckmark: View {
    @State private var isPlaying = false

    var body: some View {
        VStack {
            LottieView(name: "checkmark-success", loopMode: .playOnce, isPlaying: $isPlaying)
                .frame(width: 120, height: 120)

            Button("Play") { isPlaying = true }
        }
    }
}
```

---

## Step 5: Looping Animations

```swift
struct LoadingAnimation: View {
    @State private var isPlaying = true

    var body: some View {
        LottieView(name: "loading-spinner", loopMode: .loop, isPlaying: $isPlaying)
            .frame(width: 60, height: 60)
    }
}
```

---

## Step 6: Progress-Controlled Animation

For animations that should track a progress value (e.g., a download bar):

```swift
struct LottieProgressView: UIViewRepresentable {
    let name: String
    let progress: CGFloat // 0.0 to 1.0

    func makeUIView(context: Context) -> LottieAnimationView {
        let view = LottieAnimationView(name: name)
        view.contentMode = .scaleAspectFit
        return view
    }

    func updateUIView(_ uiView: LottieAnimationView, context: Context) {
        uiView.currentProgress = AnimationProgressTime(progress)
    }
}

// Usage:
// LottieProgressView(name: "download-progress", progress: downloadProgress)
//     .frame(height: 100)
```

---

## Step 7: Color Customization at Runtime

```swift
func makeUIView(context: Context) -> LottieAnimationView {
    let view = LottieAnimationView(name: name)

    // Override specific color layers
    let colorProvider = ColorValueProvider(LottieColor(r: 0, g: 0.5, b: 1, a: 1))
    view.setValueProvider(
        colorProvider,
        keypath: AnimationKeypath(keypath: "**.Fill 1.Color")
    )

    return view
}
```

---

## Common Gotchas

### Animation file not found
- Ensure the `.json` file is added to the correct target (check Target Membership in File Inspector)
- The `name` parameter must match the filename without `.json` extension
- If using asset catalogs, use `LottieAnimation.asset("name")` instead

### Animation not visible
- LottieAnimationView needs explicit frame constraints in SwiftUI
- Always set `.frame(width:height:)` on the wrapper view
- Check `contentMode` — `.scaleAspectFit` is safest

### Animation plays only once
- Default `loopMode` is `.playOnce`
- Set `loopMode: .loop` for continuous animations
- For auto-reverse: `loopMode: .autoReverse`

### Performance issues
- Large Lottie files can be expensive — keep animations under 100KB JSON
- Avoid placing multiple simultaneous Lottie views (3+ can cause frame drops)
- Use `.backgroundBehavior(.pauseAndRestore)` for off-screen animations
- Consider using DotLottie format (`.lottie`) for smaller file sizes

### Dark mode support
- Lottie doesn't auto-adapt to dark mode
- Use `ColorValueProvider` to swap colors based on `colorScheme`
- Or provide separate animation files for light/dark

### Coordinator pattern (alternative)

For complex control (play specific segments, listen to frame changes):

```swift
func makeCoordinator() -> Coordinator { Coordinator() }

class Coordinator {
    var animationView: LottieAnimationView?

    func playSegment(from: AnimationFrameTime, to: AnimationFrameTime) {
        animationView?.play(fromFrame: from, toFrame: to)
    }
}

func makeUIView(context: Context) -> LottieAnimationView {
    let view = LottieAnimationView(name: name)
    context.coordinator.animationView = view
    return view
}
```
