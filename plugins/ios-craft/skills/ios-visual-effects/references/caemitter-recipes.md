# CAEmitterLayer Particle Recipes

5 particle system recipes using CAEmitterLayer with UIViewRepresentable wrappers for SwiftUI.

---

## 1. Snow

Gentle snowfall with varying sizes and slow drift.

```swift
import SwiftUI
import UIKit

struct SnowView: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .clear

        let emitter = CAEmitterLayer()
        emitter.emitterPosition = CGPoint(x: UIScreen.main.bounds.width / 2, y: -20)
        emitter.emitterSize = CGSize(width: UIScreen.main.bounds.width, height: 1)
        emitter.emitterShape = .line

        let cell = CAEmitterCell()
        cell.birthRate = 20
        cell.lifetime = 12
        cell.velocity = 30
        cell.velocityRange = 20
        cell.emissionLongitude = .pi          // downward
        cell.emissionRange = .pi / 6          // slight spread
        cell.spin = 0.5
        cell.spinRange = 1.0
        cell.scale = 0.06
        cell.scaleRange = 0.04
        cell.alphaRange = 0.3
        cell.alphaSpeed = -0.05               // fade out slowly
        cell.xAcceleration = 5                // gentle drift right
        cell.contents = UIImage(systemName: "circle.fill")?
            .withTintColor(.white, renderingMode: .alwaysOriginal).cgImage

        emitter.emitterCells = [cell]
        view.layer.addSublayer(emitter)
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {}
}

// Usage:
// ZStack {
//     Color.black.ignoresSafeArea()
//     SnowView().ignoresSafeArea()
// }
```

---

## 2. Confetti

Burst of colorful confetti shapes for celebrations.

```swift
struct ConfettiView: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .clear

        let emitter = CAEmitterLayer()
        emitter.emitterPosition = CGPoint(x: UIScreen.main.bounds.width / 2, y: -10)
        emitter.emitterSize = CGSize(width: UIScreen.main.bounds.width, height: 1)
        emitter.emitterShape = .line

        let colors: [UIColor] = [.systemRed, .systemBlue, .systemGreen, .systemYellow, .systemOrange, .systemPurple, .systemPink]

        var cells: [CAEmitterCell] = []
        for color in colors {
            let cell = CAEmitterCell()
            cell.birthRate = 4
            cell.lifetime = 8
            cell.velocity = 180
            cell.velocityRange = 60
            cell.emissionLongitude = .pi       // downward
            cell.emissionRange = .pi / 4
            cell.spin = 3
            cell.spinRange = 6
            cell.scale = 0.05
            cell.scaleRange = 0.03
            cell.yAcceleration = 80            // gravity
            cell.xAcceleration = CGFloat.random(in: -20...20)
            cell.contents = UIImage(systemName: "square.fill")?
                .withTintColor(color, renderingMode: .alwaysOriginal).cgImage
            cells.append(cell)
        }

        emitter.emitterCells = cells
        view.layer.addSublayer(emitter)

        // Burst then stop
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            emitter.birthRate = 0
        }

        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {}
}
```

---

## 3. Fire

Warm fire effect rising from a point source.

```swift
struct FireView: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .clear

        let emitter = CAEmitterLayer()
        emitter.emitterPosition = CGPoint(x: UIScreen.main.bounds.width / 2, y: UIScreen.main.bounds.height - 100)
        emitter.emitterSize = CGSize(width: 60, height: 1)
        emitter.emitterShape = .line
        emitter.renderMode = .additive        // glow blending

        // Core flame
        let flame = CAEmitterCell()
        flame.birthRate = 150
        flame.lifetime = 1.5
        flame.lifetimeRange = 0.5
        flame.velocity = 80
        flame.velocityRange = 30
        flame.emissionLongitude = -.pi / 2    // upward
        flame.emissionRange = .pi / 8
        flame.scale = 0.15
        flame.scaleSpeed = -0.08              // shrink as they rise
        flame.alphaSpeed = -0.5               // fade out
        flame.color = UIColor(red: 1.0, green: 0.5, blue: 0.1, alpha: 0.8).cgColor
        flame.redRange = 0.1
        flame.greenRange = 0.2
        flame.contents = UIImage(systemName: "circle.fill")?
            .withTintColor(.white, renderingMode: .alwaysOriginal).cgImage

        // Ember sparks
        let ember = CAEmitterCell()
        ember.birthRate = 20
        ember.lifetime = 2.0
        ember.velocity = 120
        ember.velocityRange = 40
        ember.emissionLongitude = -.pi / 2
        ember.emissionRange = .pi / 6
        ember.scale = 0.03
        ember.scaleRange = 0.02
        ember.alphaSpeed = -0.4
        ember.yAcceleration = -20             // drift upward
        ember.color = UIColor.orange.cgColor
        ember.contents = UIImage(systemName: "circle.fill")?
            .withTintColor(.white, renderingMode: .alwaysOriginal).cgImage

        emitter.emitterCells = [flame, ember]
        view.layer.addSublayer(emitter)
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {}
}
```

---

## 4. Floating Bubbles

Transparent bubbles rising gently with slight wobble.

```swift
struct BubblesView: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .clear

        let emitter = CAEmitterLayer()
        emitter.emitterPosition = CGPoint(x: UIScreen.main.bounds.width / 2,
                                           y: UIScreen.main.bounds.height + 20)
        emitter.emitterSize = CGSize(width: UIScreen.main.bounds.width, height: 1)
        emitter.emitterShape = .line

        let bubble = CAEmitterCell()
        bubble.birthRate = 3
        bubble.lifetime = 10
        bubble.lifetimeRange = 3
        bubble.velocity = 40
        bubble.velocityRange = 15
        bubble.emissionLongitude = -.pi / 2   // upward
        bubble.emissionRange = .pi / 8
        bubble.scale = 0.08
        bubble.scaleRange = 0.06
        bubble.alphaRange = 0.3
        bubble.alphaSpeed = -0.05
        bubble.xAcceleration = 3              // gentle side drift
        bubble.spin = 0
        bubble.color = UIColor(white: 1, alpha: 0.4).cgColor

        // Create a circle with a ring appearance for bubble look
        let size = CGSize(width: 40, height: 40)
        let renderer = UIGraphicsImageRenderer(size: size)
        let bubbleImage = renderer.image { ctx in
            let rect = CGRect(origin: .zero, size: size).insetBy(dx: 2, dy: 2)
            ctx.cgContext.setStrokeColor(UIColor.white.withAlphaComponent(0.6).cgColor)
            ctx.cgContext.setLineWidth(1.5)
            ctx.cgContext.strokeEllipse(in: rect)
            // Highlight spot
            let spot = CGRect(x: 12, y: 8, width: 8, height: 6)
            ctx.cgContext.setFillColor(UIColor.white.withAlphaComponent(0.4).cgColor)
            ctx.cgContext.fillEllipse(in: spot)
        }
        bubble.contents = bubbleImage.cgImage

        emitter.emitterCells = [bubble]
        view.layer.addSublayer(emitter)
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {}
}
```

---

## 5. Sparkle Trail

Sparkles that follow a point, useful for touch-following effects.

```swift
struct SparkleTrailView: UIViewRepresentable {
    let position: CGPoint

    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.backgroundColor = .clear

        let emitter = CAEmitterLayer()
        emitter.emitterPosition = position
        emitter.emitterSize = CGSize(width: 1, height: 1)
        emitter.emitterShape = .point

        let sparkle = CAEmitterCell()
        sparkle.birthRate = 60
        sparkle.lifetime = 1.0
        sparkle.lifetimeRange = 0.3
        sparkle.velocity = 40
        sparkle.velocityRange = 20
        sparkle.emissionRange = .pi * 2       // all directions
        sparkle.scale = 0.04
        sparkle.scaleRange = 0.03
        sparkle.scaleSpeed = -0.03            // shrink
        sparkle.alphaSpeed = -0.8             // fade fast
        sparkle.spin = 2
        sparkle.spinRange = 4
        sparkle.color = UIColor.systemYellow.cgColor
        sparkle.redRange = 0.1
        sparkle.greenRange = 0.1
        sparkle.contents = UIImage(systemName: "sparkle")?
            .withTintColor(.white, renderingMode: .alwaysOriginal).cgImage

        emitter.emitterCells = [sparkle]
        view.layer.addSublayer(emitter)
        context.coordinator.emitter = emitter
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        context.coordinator.emitter?.emitterPosition = position
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    class Coordinator {
        var emitter: CAEmitterLayer?
    }
}

// Usage with drag gesture:
// struct SparkleDemo: View {
//     @State private var pos: CGPoint = CGPoint(x: 200, y: 400)
//
//     var body: some View {
//         ZStack {
//             Color.black.ignoresSafeArea()
//             SparkleTrailView(position: pos).ignoresSafeArea()
//         }
//         .gesture(DragGesture().onChanged { pos = $0.location })
//     }
// }
```

---

## Tips

- **Performance**: CAEmitterLayer runs on the GPU. Keep `birthRate * lifetime` under ~500 total particles for smooth 60fps.
- **Render modes**: `.additive` (glow, fire), `.oldestFirst` (default), `.backToFront` (correct layering for opaque particles).
- **Stop emission gracefully**: Set `emitter.birthRate = 0` — existing particles finish their lifetime naturally.
- **Custom images**: Use `UIGraphicsImageRenderer` to create particle shapes programmatically instead of loading images.
- **Color variation**: Use `redRange`, `greenRange`, `blueRange` for per-particle color randomization. Combine with `redSpeed`, `greenSpeed`, `blueSpeed` for color change over lifetime.
