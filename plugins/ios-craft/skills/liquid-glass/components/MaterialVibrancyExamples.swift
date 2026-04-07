// components/MaterialVibrancyExamples.swift
import SwiftUI
import UIKit

/// Examples showing proper and improper usage of vibrancy and materials.
public struct MaterialVibrancyExamples: View {
    public init() {}
    public var body: some View {
        VStack(spacing: 20) {
            // DO: using dynamic foreground style preserves vibrancy on glass.
            Text("Vibrant Title")
                .font(.title2.bold())
                .padding()
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .modifier(Glassify(cornerRadius: 16))
                )
                .foregroundStyle(.primary)

            // DON'T: applying a custom color disables vibrancy and looks flat.
            Text("Custom Color (No Vibrancy)")
                .font(.subheadline.weight(.semibold))
                .padding()
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .modifier(Glassify(cornerRadius: 16))
                )
                .foregroundColor(.yellow)

            // UIKit glass example demonstrating vibrancy and tinting with
            // UIGlassEffect and UIGlassContainerEffect. The view wraps a
            // UILabel inside a glass effect view so that text remains legible.
            UIKitGlassLabel(text: "UIKit Glass Label")
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .padding()
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
    }
}

/// A UIKit wrapper that renders a glass label using `UIGlassEffect`. It
/// demonstrates how to embed text inside a UIKit glass effect view while
/// preserving vibrancy. The effect is animated into place for a more
/// natural materialization.
public struct UIKitGlassLabel: UIViewRepresentable {
    public var text: String
    public func makeUIView(context: Context) -> UIVisualEffectView {
        // Create an empty visual effect view; we'll animate the effect assignment.
        let effectView = UIVisualEffectView()
        let glass = UIGlassEffect(style: .regular)
        // Set a slight tint to demonstrate prominence. You could remove this
        // assignment to use the default clear glass.
        glass.tintColor = .systemBlue.withAlphaComponent(0.4)
        // Create a UILabel that will live on top of the glass.
        let label = UILabel()
        label.text = text
        label.font = UIFont.preferredFont(forTextStyle: .headline)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        // Add the label to the content view. UIKit will automatically apply
        // appropriate vibrancy when text is placed inside a glass view.
        effectView.contentView.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: effectView.contentView.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: effectView.contentView.centerYAnchor)
        ])
        // Animate the effect assignment for a polished appearance.
        UIView.animate(withDuration: 0.25) {
            effectView.effect = glass
        }
        effectView.layer.cornerCurve = .continuous
        effectView.layer.cornerRadius = 16
        effectView.clipsToBounds = true
        return effectView
    }
    public func updateUIView(_ uiView: UIVisualEffectView, context: Context) {
        // No dynamic updates required for this simple example.
    }
}

/// Shared helper for applying glass or a fallback material. As in other
/// examples, this helper conditionally uses `glassEffect` when running
/// on iOS 26 and falls back to `.ultraThinMaterial` with a subtle
/// stroke on older OS versions. By placing this helper inside this
/// file, we avoid cross‑file dependencies.
fileprivate struct Glassify: ViewModifier {
    var cornerRadius: CGFloat
    func body(content: Content) -> some View {
        content
            .background(
                Group {
                    if #available(iOS 26, *) {
                        Color.clear.glassEffect(.regular, in: .rect(cornerRadius: cornerRadius))
                    } else {
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

#Preview { MaterialVibrancyExamples() }
