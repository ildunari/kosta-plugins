# Animation Recipes

20 copy-paste SwiftUI animation recipes organized by use case.

---

## 1. Button Press Scale

```swift
struct ScaleButton: View {
    let title: String
    let action: () -> Void
    @State private var isPressed = false

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.headline)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(.blue)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .scaleEffect(isPressed ? 0.92 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }
}
```

---

## 2. Card Reveal

```swift
struct CardReveal: View {
    @State private var isRevealed = false

    var body: some View {
        VStack(spacing: 16) {
            RoundedRectangle(cornerRadius: 16)
                .fill(.blue.gradient)
                .frame(height: 200)
                .overlay {
                    Text("Card Content")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                }
                .scaleEffect(isRevealed ? 1 : 0.8)
                .opacity(isRevealed ? 1 : 0)
                .offset(y: isRevealed ? 0 : 40)
                .animation(.spring(response: 0.6, dampingFraction: 0.7), value: isRevealed)

            Button("Reveal") { isRevealed.toggle() }
        }
    }
}
```

---

## 3. Hero Transition

```swift
struct HeroTransitionDemo: View {
    @Namespace private var hero
    @State private var isExpanded = false

    var body: some View {
        VStack {
            if !isExpanded {
                RoundedRectangle(cornerRadius: 16)
                    .fill(.purple.gradient)
                    .matchedGeometryEffect(id: "card", in: hero)
                    .frame(width: 150, height: 150)
                    .onTapGesture {
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                            isExpanded = true
                        }
                    }
            } else {
                RoundedRectangle(cornerRadius: 24)
                    .fill(.purple.gradient)
                    .matchedGeometryEffect(id: "card", in: hero)
                    .frame(maxWidth: .infinity)
                    .frame(height: 400)
                    .onTapGesture {
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                            isExpanded = false
                        }
                    }
            }
        }
        .padding()
    }
}
```

---

## 4. Toast Notification

```swift
struct ToastModifier: ViewModifier {
    @Binding var isShowing: Bool
    let message: String

    func body(content: Content) -> some View {
        content.overlay(alignment: .top) {
            if isShowing {
                Text(message)
                    .font(.subheadline.weight(.medium))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(.thinMaterial, in: Capsule())
                    .shadow(radius: 4, y: 2)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                            withAnimation(.easeInOut(duration: 0.3)) { isShowing = false }
                        }
                    }
                    .padding(.top, 8)
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: isShowing)
    }
}
```

---

## 5. Pull-to-Refresh Indicator

```swift
struct PullToRefreshSpinner: View {
    @State private var rotation: Double = 0

    var body: some View {
        Image(systemName: "arrow.trianglehead.2.counterclockwise")
            .font(.title2)
            .rotationEffect(.degrees(rotation))
            .onAppear {
                withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
            }
    }
}
```

---

## 6. Skeleton Shimmer

```swift
struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay {
                LinearGradient(
                    colors: [.clear, .white.opacity(0.4), .clear],
                    startPoint: .init(x: phase - 0.5, y: 0.5),
                    endPoint: .init(x: phase + 0.5, y: 0.5)
                )
                .blendMode(.screen)
            }
            .clipped()
            .onAppear {
                withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                    phase = 1.5
                }
            }
    }
}

extension View {
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}
```

---

## 7. Shake for Error

```swift
struct ShakeEffect: GeometryEffect {
    var amount: CGFloat = 8
    var shakeCount: CGFloat = 3
    var animatableData: CGFloat

    func effectValue(size: CGSize) -> ProjectionTransform {
        let translation = amount * sin(animatableData * .pi * shakeCount)
        return ProjectionTransform(CGAffineTransform(translationX: translation, y: 0))
    }
}

// Usage:
// @State private var shakeAttempts: CGFloat = 0
// TextField("Email", text: $email)
//     .modifier(ShakeEffect(animatableData: shakeAttempts))
// Button("Submit") { withAnimation(.easeInOut(duration: 0.4)) { shakeAttempts += 1 } }
```

---

## 8. Confetti Burst

```swift
struct ConfettiPiece: View {
    @State private var position: CGSize = .zero
    @State private var opacity: Double = 1
    @State private var rotation: Double = 0
    let color: Color

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 8, height: 8)
            .rotationEffect(.degrees(rotation))
            .offset(position)
            .opacity(opacity)
            .onAppear {
                let angle = Double.random(in: 0...(2 * .pi))
                let distance = CGFloat.random(in: 80...200)
                withAnimation(.easeOut(duration: 1.2)) {
                    position = CGSize(
                        width: cos(angle) * distance,
                        height: sin(angle) * distance - 60
                    )
                    rotation = Double.random(in: 180...720)
                }
                withAnimation(.easeIn(duration: 1.2).delay(0.6)) {
                    opacity = 0
                }
            }
    }
}

struct ConfettiBurst: View {
    let colors: [Color] = [.red, .blue, .green, .yellow, .orange, .purple, .pink]

    var body: some View {
        ZStack {
            ForEach(0..<30, id: \.self) { _ in
                ConfettiPiece(color: colors.randomElement()!)
            }
        }
    }
}
```

---

## 9. Counting Number

```swift
struct CountingNumber: View {
    let value: Int
    @State private var displayedValue: Int = 0

    var body: some View {
        Text("\(displayedValue)")
            .font(.system(.largeTitle, design: .rounded, weight: .bold))
            .contentTransition(.numericText(value: displayedValue))
            .onChange(of: value) { _, newValue in
                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                    displayedValue = newValue
                }
            }
            .onAppear { displayedValue = value }
    }
}
```

---

## 10. Typing Indicator

```swift
struct TypingIndicator: View {
    @State private var phase = 0

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(.secondary)
                    .frame(width: 8, height: 8)
                    .offset(y: phase == index ? -6 : 0)
            }
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { _ in
                withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                    phase = (phase + 1) % 4
                }
            }
        }
    }
}
```

---

## 11. Tab Switch

```swift
struct AnimatedTabSwitch: View {
    @State private var selectedTab = 0
    @Namespace private var tabNS

    var body: some View {
        HStack(spacing: 0) {
            ForEach(["Home", "Search", "Profile"], id: \.self) { tab in
                let index = ["Home", "Search", "Profile"].firstIndex(of: tab)!
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                        selectedTab = index
                    }
                } label: {
                    Text(tab)
                        .font(.subheadline.weight(.medium))
                        .padding(.vertical, 8)
                        .padding(.horizontal, 16)
                        .background {
                            if selectedTab == index {
                                Capsule()
                                    .fill(.blue.opacity(0.15))
                                    .matchedGeometryEffect(id: "tab", in: tabNS)
                            }
                        }
                }
                .foregroundStyle(selectedTab == index ? .blue : .secondary)
            }
        }
    }
}
```

---

## 12. Page Curl

```swift
struct PageCurl: View {
    @State private var progress: CGFloat = 0

    var body: some View {
        Rectangle()
            .fill(.white)
            .frame(width: 250, height: 350)
            .shadow(radius: 4)
            .rotation3DEffect(
                .degrees(Double(progress) * -60),
                axis: (x: 0, y: 1, z: 0),
                anchor: .leading,
                perspective: 0.5
            )
            .gesture(
                DragGesture()
                    .onChanged { value in
                        progress = min(max(value.translation.width / -250, 0), 1)
                    }
                    .onEnded { _ in
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                            progress = progress > 0.5 ? 1 : 0
                        }
                    }
            )
    }
}
```

---

## 13. Flip Card

```swift
struct FlipCard: View {
    @State private var isFlipped = false
    @State private var rotation: Double = 0

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .fill(.blue.gradient)
                .overlay { Text("Front").foregroundStyle(.white).font(.title) }
                .opacity(rotation < 90 ? 1 : 0)

            RoundedRectangle(cornerRadius: 16)
                .fill(.green.gradient)
                .overlay { Text("Back").foregroundStyle(.white).font(.title) }
                .rotation3DEffect(.degrees(180), axis: (x: 0, y: 1, z: 0))
                .opacity(rotation >= 90 ? 1 : 0)
        }
        .frame(width: 200, height: 280)
        .rotation3DEffect(.degrees(rotation), axis: (x: 0, y: 1, z: 0))
        .onTapGesture {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
                rotation += 180
            }
        }
    }
}
```

---

## 14. Slide-In Menu

```swift
struct SlideMenu: View {
    @Binding var isOpen: Bool

    var body: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 24) {
                ForEach(["Home", "Settings", "Profile", "Help"], id: \.self) { item in
                    Text(item).font(.headline)
                }
                Spacer()
            }
            .padding(24)
            .frame(width: 260)
            .background(.ultraThinMaterial)
            Spacer()
        }
        .offset(x: isOpen ? 0 : -260)
        .animation(.spring(response: 0.4, dampingFraction: 0.82), value: isOpen)
    }
}
```

---

## 15. Bounce Loading Dots

```swift
struct BounceDots: View {
    @State private var isAnimating = false

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(.blue)
                    .frame(width: 10, height: 10)
                    .offset(y: isAnimating ? -10 : 0)
                    .animation(
                        .easeInOut(duration: 0.5)
                        .repeatForever()
                        .delay(Double(index) * 0.15),
                        value: isAnimating
                    )
            }
        }
        .onAppear { isAnimating = true }
    }
}
```

---

## 16. Progress Ring

```swift
struct ProgressRing: View {
    let progress: Double
    let lineWidth: CGFloat = 8

    var body: some View {
        ZStack {
            Circle()
                .stroke(.gray.opacity(0.2), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(.blue, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.spring(response: 0.6, dampingFraction: 0.8), value: progress)
            Text("\(Int(progress * 100))%")
                .font(.system(.title3, design: .rounded, weight: .bold))
                .contentTransition(.numericText())
        }
        .frame(width: 80, height: 80)
    }
}
```

---

## 17. Morphing Shape

```swift
struct MorphingShape: View {
    @State private var isCircle = true

    var body: some View {
        RoundedRectangle(cornerRadius: isCircle ? 75 : 16)
            .fill(.orange.gradient)
            .frame(width: isCircle ? 150 : 250, height: 150)
            .animation(.spring(response: 0.5, dampingFraction: 0.65), value: isCircle)
            .onTapGesture { isCircle.toggle() }
    }
}
```

---

## 18. Parallax Scroll

```swift
struct ParallaxCard: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                ForEach(0..<10, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(hue: Double(index) / 10, saturation: 0.6, brightness: 0.9))
                        .frame(height: 200)
                        .scrollTransition { content, phase in
                            content
                                .scaleEffect(1 - abs(phase.value) * 0.1)
                                .opacity(1 - abs(phase.value) * 0.3)
                                .offset(y: phase.value * 20)
                        }
                }
            }
            .padding()
        }
    }
}
```

---

## 19. Fade-In on Appear

```swift
struct FadeInOnAppear: ViewModifier {
    @State private var isVisible = false
    let delay: Double

    func body(content: Content) -> some View {
        content
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 20)
            .animation(.easeOut(duration: 0.5).delay(delay), value: isVisible)
            .onAppear { isVisible = true }
    }
}

extension View {
    func fadeInOnAppear(delay: Double = 0) -> some View {
        modifier(FadeInOnAppear(delay: delay))
    }
}

// Usage:
// ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
//     ItemRow(item: item)
//         .fadeInOnAppear(delay: Double(index) * 0.08)
// }
```

---

## 20. Spring Snap-Back

```swift
struct SnapBackCard: View {
    @State private var offset: CGSize = .zero
    @State private var isDragging = false

    var body: some View {
        RoundedRectangle(cornerRadius: 20)
            .fill(.blue.gradient)
            .frame(width: 200, height: 280)
            .shadow(radius: isDragging ? 16 : 4, y: isDragging ? 12 : 2)
            .offset(offset)
            .scaleEffect(isDragging ? 1.05 : 1)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        isDragging = true
                        offset = value.translation
                    }
                    .onEnded { _ in
                        isDragging = false
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.6)) {
                            offset = .zero
                        }
                    }
            )
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isDragging)
    }
}
```
