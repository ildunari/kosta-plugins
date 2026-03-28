# SwiftUI Visual Effects Catalog

20 visual effects achievable with pure SwiftUI. Each is self-contained and copy-paste ready.

---

## 1. Glassmorphism Card

```swift
struct GlassCard: View {
    var body: some View {
        ZStack {
            // Colorful background
            LinearGradient(colors: [.purple, .blue, .pink], startPoint: .topLeading, endPoint: .bottomTrailing)

            RoundedRectangle(cornerRadius: 20)
                .fill(.ultraThinMaterial)
                .frame(width: 300, height: 200)
                .overlay {
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(.white.opacity(0.3), lineWidth: 1)
                }
                .shadow(color: .black.opacity(0.15), radius: 20, y: 10)
        }
    }
}
```

---

## 2. Neon Glow

```swift
struct NeonGlow: View {
    var body: some View {
        Text("NEON")
            .font(.system(size: 60, weight: .black))
            .foregroundStyle(.cyan)
            .shadow(color: .cyan, radius: 10)
            .shadow(color: .cyan, radius: 20)
            .shadow(color: .cyan.opacity(0.5), radius: 40)
            .shadow(color: .blue.opacity(0.3), radius: 60)
    }
}
```

---

## 3. Frosted Glass Bar

```swift
struct FrostedBar: View {
    var body: some View {
        HStack {
            Image(systemName: "house.fill")
            Spacer()
            Image(systemName: "magnifyingglass")
            Spacer()
            Image(systemName: "person.fill")
        }
        .font(.title2)
        .foregroundStyle(.primary)
        .padding(.horizontal, 40)
        .padding(.vertical, 16)
        .background(.regularMaterial, in: Capsule())
    }
}
```

---

## 4. Gradient Mesh (iOS 18+)

```swift
struct GradientMeshBackground: View {
    var body: some View {
        MeshGradient(
            width: 3, height: 3,
            points: [
                [0, 0], [0.5, 0], [1, 0],
                [0, 0.5], [0.5, 0.5], [1, 0.5],
                [0, 1], [0.5, 1], [1, 1]
            ],
            colors: [
                .indigo, .cyan, .purple,
                .blue, .mint, .pink,
                .purple, .blue, .indigo
            ]
        )
        .ignoresSafeArea()
    }
}
```

---

## 5. Neumorphism Button

```swift
struct NeuButton: View {
    @State private var isPressed = false
    let bg = Color(red: 0.93, green: 0.93, blue: 0.95)

    var body: some View {
        Circle()
            .fill(bg)
            .frame(width: 80, height: 80)
            .overlay { Image(systemName: "play.fill").foregroundStyle(.gray) }
            .shadow(color: .white, radius: isPressed ? 2 : 6, x: isPressed ? -2 : -6, y: isPressed ? -2 : -6)
            .shadow(color: .black.opacity(0.2), radius: isPressed ? 2 : 6, x: isPressed ? 2 : 6, y: isPressed ? 2 : 6)
            .scaleEffect(isPressed ? 0.96 : 1)
            .onTapGesture { }
            .onLongPressGesture(minimumDuration: .infinity, pressing: { isPressed = $0 }, perform: {})
    }
}
```

---

## 6. Aurora Background

```swift
struct AuroraBackground: View {
    @State private var animate = false

    var body: some View {
        ZStack {
            Color.black
            ForEach(0..<3, id: \.self) { i in
                Ellipse()
                    .fill(
                        RadialGradient(
                            colors: [[.green, .cyan, .purple][i], .clear],
                            center: .center,
                            startRadius: 0,
                            endRadius: 300
                        )
                    )
                    .frame(width: 500, height: 300)
                    .offset(
                        x: animate ? CGFloat.random(in: -100...100) : CGFloat.random(in: -100...100),
                        y: CGFloat(i) * 80 - 100
                    )
                    .blur(radius: 60)
                    .blendMode(.screen)
            }
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.easeInOut(duration: 6).repeatForever(autoreverses: true)) {
                animate.toggle()
            }
        }
    }
}
```

---

## 7. Noise Texture Overlay

```swift
struct NoiseOverlay: View {
    var body: some View {
        Canvas { context, size in
            for _ in 0..<Int(size.width * size.height * 0.02) {
                let x = CGFloat.random(in: 0...size.width)
                let y = CGFloat.random(in: 0...size.height)
                let opacity = Double.random(in: 0.02...0.08)
                context.fill(
                    Path(CGRect(x: x, y: y, width: 1, height: 1)),
                    with: .color(.white.opacity(opacity))
                )
            }
        }
        .blendMode(.overlay)
        .allowsHitTesting(false)
    }
}
```

---

## 8. Spotlight Effect

```swift
struct SpotlightEffect: View {
    @State private var position: CGPoint = .init(x: 200, y: 400)

    var body: some View {
        ZStack {
            Color.black
            RadialGradient(
                colors: [.white.opacity(0.3), .clear],
                center: UnitPoint(x: position.x / UIScreen.main.bounds.width,
                                  y: position.y / UIScreen.main.bounds.height),
                startRadius: 10,
                endRadius: 200
            )
        }
        .ignoresSafeArea()
        .gesture(DragGesture().onChanged { position = $0.location })
    }
}
```

---

## 9. Parallax Layers

```swift
struct ParallaxLayers: View {
    @State private var offset: CGSize = .zero

    var body: some View {
        ZStack {
            Circle().fill(.blue.opacity(0.3)).frame(width: 300)
                .offset(x: offset.width * 0.1, y: offset.height * 0.1)
            Circle().fill(.purple.opacity(0.4)).frame(width: 200)
                .offset(x: offset.width * 0.3, y: offset.height * 0.3)
            Circle().fill(.pink.opacity(0.5)).frame(width: 100)
                .offset(x: offset.width * 0.6, y: offset.height * 0.6)
        }
        .gesture(DragGesture().onChanged { offset = $0.translation })
    }
}
```

---

## 10. Inner Shadow

```swift
struct InnerShadowCard: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 20)
            .fill(.gray.opacity(0.15))
            .frame(width: 200, height: 200)
            .overlay {
                RoundedRectangle(cornerRadius: 20)
                    .stroke(.gray.opacity(0.4), lineWidth: 4)
                    .blur(radius: 4)
                    .offset(x: 2, y: 2)
                    .mask(RoundedRectangle(cornerRadius: 20).fill(.linearGradient(
                        colors: [.black, .clear], startPoint: .topLeading, endPoint: .bottomTrailing
                    )))
            }
    }
}
```

---

## 11. Rainbow Border

```swift
struct RainbowBorder: View {
    @State private var rotation: Double = 0

    var body: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(.black)
            .frame(width: 250, height: 150)
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        AngularGradient(
                            colors: [.red, .orange, .yellow, .green, .cyan, .blue, .purple, .red],
                            center: .center,
                            angle: .degrees(rotation)
                        ),
                        lineWidth: 3
                    )
            }
            .onAppear {
                withAnimation(.linear(duration: 3).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
            }
    }
}
```

---

## 12. Morphing Blob

```swift
struct MorphingBlob: View {
    @State private var morph = false

    var body: some View {
        Canvas { context, size in
            let w = size.width, h = size.height
            let cx = w / 2, cy = h / 2
            var path = Path()
            let points = 8
            for i in 0..<points {
                let angle = (Double(i) / Double(points)) * 2 * .pi
                let radius: CGFloat = morph
                    ? CGFloat.random(in: 80...120)
                    : CGFloat.random(in: 90...110)
                let x = cx + cos(angle) * radius
                let y = cy + sin(angle) * radius
                if i == 0 { path.move(to: CGPoint(x: x, y: y)) }
                else { path.addLine(to: CGPoint(x: x, y: y)) }
            }
            path.closeSubpath()
            context.fill(path, with: .color(.purple.opacity(0.6)))
        }
        .frame(width: 250, height: 250)
        .blur(radius: 20)
        .onAppear {
            withAnimation(.easeInOut(duration: 3).repeatForever()) { morph.toggle() }
        }
    }
}
```

---

## 13. Pulse Ring

```swift
struct PulseRing: View {
    @State private var scale: CGFloat = 1
    @State private var opacity: Double = 1

    var body: some View {
        ZStack {
            Circle()
                .stroke(.blue, lineWidth: 2)
                .scaleEffect(scale)
                .opacity(opacity)
            Circle()
                .fill(.blue)
                .frame(width: 20, height: 20)
        }
        .frame(width: 100, height: 100)
        .onAppear {
            withAnimation(.easeOut(duration: 1.5).repeatForever(autoreverses: false)) {
                scale = 3
                opacity = 0
            }
        }
    }
}
```

---

## 14. Glass Card with Refraction

```swift
struct RefractionCard: View {
    var body: some View {
        ZStack {
            Image(systemName: "globe.americas.fill")
                .font(.system(size: 200))
                .foregroundStyle(.blue.gradient)

            RoundedRectangle(cornerRadius: 20)
                .fill(.ultraThinMaterial)
                .frame(width: 250, height: 150)
                .overlay {
                    VStack {
                        Text("Glass Card").font(.headline)
                        Text("With refraction").font(.caption).foregroundStyle(.secondary)
                    }
                }
                .shadow(color: .black.opacity(0.1), radius: 10, y: 5)
        }
    }
}
```

---

## 15. Depth Shadow Stack

```swift
struct DepthStack: View {
    var body: some View {
        ZStack {
            ForEach(0..<4, id: \.self) { i in
                RoundedRectangle(cornerRadius: 16)
                    .fill(.white)
                    .frame(width: 220 - CGFloat(i) * 10, height: 140)
                    .offset(y: CGFloat(i) * -6)
                    .shadow(color: .black.opacity(0.08), radius: CGFloat(4 + i * 2), y: CGFloat(2 + i * 2))
            }
        }
    }
}
```

---

## 16. Animated Gradient

```swift
struct AnimatedGradient: View {
    @State private var start = UnitPoint.topLeading
    @State private var end = UnitPoint.bottomTrailing

    var body: some View {
        LinearGradient(colors: [.blue, .purple, .pink, .orange], startPoint: start, endPoint: end)
            .ignoresSafeArea()
            .onAppear {
                withAnimation(.easeInOut(duration: 5).repeatForever(autoreverses: true)) {
                    start = .bottomTrailing
                    end = .topLeading
                }
            }
    }
}
```

---

## 17. Bokeh Circles

```swift
struct BokehCircles: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            ForEach(0..<20, id: \.self) { _ in
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                [.cyan, .pink, .yellow, .green].randomElement()!.opacity(0.3),
                                .clear
                            ],
                            center: .center, startRadius: 0, endRadius: CGFloat.random(in: 20...60)
                        )
                    )
                    .frame(width: CGFloat.random(in: 40...120))
                    .position(
                        x: CGFloat.random(in: 0...UIScreen.main.bounds.width),
                        y: CGFloat.random(in: 0...UIScreen.main.bounds.height)
                    )
                    .blur(radius: CGFloat.random(in: 2...8))
            }
        }
    }
}
```

---

## 18. Wave Pattern

```swift
struct WaveView: View {
    @State private var phase: CGFloat = 0

    var body: some View {
        Canvas { context, size in
            let w = size.width, h = size.height
            for layer in 0..<3 {
                var path = Path()
                let amplitude: CGFloat = 20 - CGFloat(layer) * 4
                let frequency: CGFloat = 2 + CGFloat(layer) * 0.5
                let yOffset = h * 0.6 + CGFloat(layer) * 15
                path.move(to: CGPoint(x: 0, y: yOffset))
                for x in stride(from: 0, through: w, by: 2) {
                    let y = yOffset + sin((x / w) * frequency * .pi + phase + CGFloat(layer)) * amplitude
                    path.addLine(to: CGPoint(x: x, y: y))
                }
                path.addLine(to: CGPoint(x: w, y: h))
                path.addLine(to: CGPoint(x: 0, y: h))
                path.closeSubpath()
                context.fill(path, with: .color(.blue.opacity(0.15 + Double(layer) * 0.1)))
            }
        }
        .onAppear {
            withAnimation(.linear(duration: 3).repeatForever(autoreverses: false)) {
                phase = .pi * 2
            }
        }
    }
}
```

---

## 19. Shimmer Sweep

```swift
struct ShimmerSweep: View {
    @State private var shimmerOffset: CGFloat = -1

    var body: some View {
        Text("Premium Feature")
            .font(.title.bold())
            .foregroundStyle(
                LinearGradient(
                    colors: [.gray, .white, .gray],
                    startPoint: UnitPoint(x: shimmerOffset, y: 0.5),
                    endPoint: UnitPoint(x: shimmerOffset + 0.5, y: 0.5)
                )
            )
            .onAppear {
                withAnimation(.linear(duration: 2).repeatForever(autoreverses: false)) {
                    shimmerOffset = 1.5
                }
            }
    }
}
```

---

## 20. Radial Burst

```swift
struct RadialBurst: View {
    @State private var isActive = false

    var body: some View {
        ZStack {
            ForEach(0..<12, id: \.self) { i in
                Rectangle()
                    .fill(.orange)
                    .frame(width: 3, height: isActive ? 40 : 10)
                    .offset(y: isActive ? -60 : -30)
                    .rotationEffect(.degrees(Double(i) * 30))
                    .opacity(isActive ? 0 : 1)
            }
        }
        .onTapGesture {
            isActive = false
            withAnimation(.easeOut(duration: 0.6)) { isActive = true }
        }
    }
}
```
