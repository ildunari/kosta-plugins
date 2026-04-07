// components/AnimationExamples.swift
import SwiftUI

/// A showcase of how to animate Liquid Glass elements using modern
/// iOS 26 APIs. The example demonstrates interactive bounce and
/// movement on a glass card, with a glass‑styled button to trigger
/// the animation. On older systems (≤ iOS 25), the card falls back
/// to a blurred material so the layout still works.
public struct AnimationExamples: View {
    @State private var on = false
    public init() {}
    public var body: some View {
        VStack(spacing: 24) {
            // Toggle the animation using a glass button. When tapped,
            // the card below will animate its position and opacity.
            Button(action: { on.toggle() }) {
                Text(on ? "Reset" : "Animate")
                    .font(.headline)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.glass)
            .animation(.spring(response: 0.25, dampingFraction: 0.85, blendDuration: 0.5), value: on)

            // A card that slides and fades. We apply glassEffect on
            // iOS 26+, and fall back to a thin material otherwise.
            Group {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .frame(width: 220, height: 80)
                    .offset(y: on ? -20 : 20)
                    .opacity(on ? 1 : 0.85)
                    .animation(.spring(response: 0.3, dampingFraction: 0.82, blendDuration: 0.5), value: on)
                    .overlay {
                        Text("Animated Card")
                            .font(.subheadline)
                            .foregroundStyle(.primary)
                    }
            }
            .modifier(Glassify(cornerRadius: 16))
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
    }
}

/// A helper view modifier that applies glassEffect on iOS 26
/// and falls back to .ultraThinMaterial on earlier releases. This
/// centralises the compatibility logic used in several demos.
fileprivate struct Glassify: ViewModifier {
    var cornerRadius: CGFloat
    func body(content: Content) -> some View {
        content
            .background(
                Group {
                    if #available(iOS 26, *) {
                        // Apply the regular glass style in the supplied shape.
                        Color.clear.glassEffect(.regular, in: .rect(cornerRadius: cornerRadius))
                    } else {
                        // Fallback: use ultraThinMaterial and a subtle stroke.
                        Color.clear
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius))
                            .overlay(
                                RoundedRectangle(cornerRadius: cornerRadius)
                                    .strokeBorder(Color.white.opacity(0.2), lineWidth: 0.5)
                            )
                    }
                }
            )
    }
}

#Preview {
    AnimationExamples()
}
