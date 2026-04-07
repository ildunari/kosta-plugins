// components/AccessibilityExamples.swift
import SwiftUI
import UIKit

public struct AccessibilityExamples: View {
    @Environment(\.accessibilityContrast) private var accContrast
    @State private var reduceTransparency = UIAccessibility.isReduceTransparencyEnabled

    public init() {}

    public var body: some View {
        VStack(spacing: 16) {
            Text("Accessibility-aware glass")
                .font(.headline)
                .foregroundStyle(.primary)

            Group {
                if reduceTransparency {
                    // When Reduce Transparency is enabled, fall back to an opaque
                    // surface to honour accessibility preferences. Use a dark
                    // fill for sufficient contrast.
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color.black.opacity(0.85))
                        .overlay(
                            Text("Opaque (Reduce Transparency)")
                                .foregroundStyle(.white)
                                .font(.footnote.weight(.semibold))
                        )
                } else {
                    // Otherwise apply Liquid Glass with dynamic contrast. Use
                    // glassEffect on iOS 26+, fallback to ultraThinMaterial.
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .overlay(
                            Text("Glass (Normal)")
                                .foregroundStyle(.primary)
                                .font(.footnote.weight(.semibold))
                        )
                        .modifier(Glassify(cornerRadius: 16))
                }
            }
            .frame(height: 72)

            Text("High Contrast: \(accContrast == .increased ? "On" : "Off")")
                .font(.caption)
                .foregroundStyle(accContrast == .increased ? .primary : .secondary)
        }
        .padding()
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
        .onReceive(NotificationCenter.default.publisher(for: UIAccessibility.reduceTransparencyStatusDidChangeNotification)) { _ in
            reduceTransparency = UIAccessibility.isReduceTransparencyEnabled
        }
    }
}

#Preview { AccessibilityExamples() }

/// Helper to conditionally apply Liquid Glass in iOS 26+. Duplicated
/// across examples for isolation. When the OS version is lower, falls
/// back to a thin material and stroke to maintain legibility.
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
