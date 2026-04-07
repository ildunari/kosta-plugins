// components/UIKitGlassExamples.swift
// Demonstrates using UIKit Liquid Glass APIs from SwiftUI via UIViewRepresentable.

import SwiftUI
import UIKit

/// A SwiftUI wrapper that showcases both single and grouped glass effects
/// using UIKit’s `UIGlassEffect` and `UIGlassContainerEffect`. This
/// example illustrates how to embed UIKit glass views inside SwiftUI
/// layouts. Note that these APIs are available only on iOS 26 and later;
/// no fallback is provided here—older OSes should use the SwiftUI
/// implementations from other demos instead.
public struct UIKitGlassExamples: View {
    public init() {}
    public var body: some View {
        VStack(spacing: 24) {
            Text("UIKit Glass (Single)")
                .font(.headline)
                .foregroundStyle(.primary)
            UIKitSingleGlass()
                .frame(height: 80)

            Text("UIKit Glass (Grouped)")
                .font(.headline)
                .foregroundStyle(.primary)
            UIKitGroupedGlass()
                .frame(height: 80)
        }
        .padding()
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
    }
}

/// A single glass effect view using `UIGlassEffect`. A label is added on
/// top of the glass so UIKit applies vibrancy automatically.
private struct UIKitSingleGlass: UIViewRepresentable {
    func makeUIView(context: Context) -> UIVisualEffectView {
        let effectView = UIVisualEffectView()
        // Configure the glass effect with a regular style and a subtle tint.
        let glass = UIGlassEffect(style: .regular)
        glass.tintColor = UIColor.systemPurple.withAlphaComponent(0.35)
        // Apply the effect with a fade animation for a materialize feel.
        UIView.animate(withDuration: 0.25) {
            effectView.effect = glass
        }
        effectView.layer.cornerCurve = .continuous
        effectView.layer.cornerRadius = 16
        effectView.clipsToBounds = true
        // Add a centred label. UIKit automatically applies appropriate
        // vibrancy when the label is hosted inside a glass effect view.
        let label = UILabel()
        label.text = "UIKit Glass"
        label.font = UIFont.preferredFont(forTextStyle: .headline)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        effectView.contentView.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: effectView.contentView.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: effectView.contentView.centerYAnchor)
        ])
        return effectView
    }
    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {}
}

/// A grouped glass example using `UIGlassContainerEffect`. Two glass subviews
/// share a single sampling pass and merge when close together. Each subview
/// contains an icon label to illustrate vibrancy.
private struct UIKitGroupedGlass: UIViewRepresentable {
    func makeUIView(context: Context) -> UIVisualEffectView {
        // Create a container effect to unify sampling for both child views.
        let containerEffect = UIGlassContainerEffect()
        let containerView = UIVisualEffectView(effect: containerEffect)

        // Left glass view
        let leftEffect = UIGlassEffect(style: .regular)
        leftEffect.tintColor = UIColor.systemTeal.withAlphaComponent(0.35)
        let left = UIVisualEffectView(effect: leftEffect)
        left.layer.cornerCurve = .continuous
        left.layer.cornerRadius = 12
        left.clipsToBounds = true
        let leftImage = UIImageView(image: UIImage(systemName: "location.fill"))
        leftImage.tintColor = .white
        leftImage.translatesAutoresizingMaskIntoConstraints = false
        left.contentView.addSubview(leftImage)
        NSLayoutConstraint.activate([
            leftImage.centerXAnchor.constraint(equalTo: left.contentView.centerXAnchor),
            leftImage.centerYAnchor.constraint(equalTo: left.contentView.centerYAnchor)
        ])

        // Right glass view
        let rightEffect = UIGlassEffect(style: .regular)
        rightEffect.tintColor = UIColor.systemBlue.withAlphaComponent(0.35)
        let right = UIVisualEffectView(effect: rightEffect)
        right.layer.cornerCurve = .continuous
        right.layer.cornerRadius = 12
        right.clipsToBounds = true
        let rightImage = UIImageView(image: UIImage(systemName: "paperplane.fill"))
        rightImage.tintColor = .white
        rightImage.translatesAutoresizingMaskIntoConstraints = false
        right.contentView.addSubview(rightImage)
        NSLayoutConstraint.activate([
            rightImage.centerXAnchor.constraint(equalTo: right.contentView.centerXAnchor),
            rightImage.centerYAnchor.constraint(equalTo: right.contentView.centerYAnchor)
        ])

        containerView.contentView.addSubview(left)
        containerView.contentView.addSubview(right)

        // Layout the two subviews horizontally with spacing.
        left.translatesAutoresizingMaskIntoConstraints = false
        right.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            left.widthAnchor.constraint(equalTo: containerView.contentView.widthAnchor, multiplier: 0.45),
            right.widthAnchor.constraint(equalTo: containerView.contentView.widthAnchor, multiplier: 0.45),
            left.heightAnchor.constraint(equalTo: containerView.contentView.heightAnchor),
            right.heightAnchor.constraint(equalTo: containerView.contentView.heightAnchor),
            left.leadingAnchor.constraint(equalTo: containerView.contentView.leadingAnchor),
            right.trailingAnchor.constraint(equalTo: containerView.contentView.trailingAnchor),
            right.leadingAnchor.constraint(equalTo: left.trailingAnchor, constant: 12)
        ])
        return containerView
    }
    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {}
}

#Preview {
    UIKitGlassExamples()
}