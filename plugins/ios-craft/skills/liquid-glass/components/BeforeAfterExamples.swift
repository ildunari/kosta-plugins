// components/BeforeAfterExamples.swift
import SwiftUI

public struct BeforeAfterExamples: View {
    public init() {}
    public var body: some View {
        VStack(spacing: 24) {
            HStack(spacing: 16) {
                // Before: flat, opaque surface without transparency.
                VStack(spacing: 8) {
                    Text("Before").font(.caption).foregroundStyle(.secondary)
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color.black.opacity(0.9))
                        .frame(width: 160, height: 100)
                        .overlay(Text("Flat Card").foregroundStyle(.white))
                }
                // After: same card rendered on Liquid Glass using glassEffect.
                VStack(spacing: 8) {
                    Text("After").font(.caption).foregroundStyle(.secondary)
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .frame(width: 160, height: 100)
                        .overlay(Text("Glass Card").foregroundStyle(.primary))
                        .modifier(Glassify(cornerRadius: 16))
                }
            }
            .padding(.vertical, 8)

            HStack(spacing: 16) {
                // Before: solid toolbar background.
                VStack(spacing: 8) {
                    Text("Before").font(.caption).foregroundStyle(.secondary)
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.black.opacity(0.95))
                        .frame(width: 260, height: 44)
                        .overlay(Text("Toolbar").foregroundStyle(.white))
                }
                // After: toolbar rendered on Liquid Glass. We apply the same shape
                // but let glassEffect handle tint and blur. A subtle stroke is
                // added via the Glassify helper.
                VStack(spacing: 8) {
                    Text("After").font(.caption).foregroundStyle(.secondary)
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .frame(width: 260, height: 44)
                        .overlay(Text("Glass Toolbar").foregroundStyle(.primary))
                        .modifier(Glassify(cornerRadius: 12))
                }
            }
        }
        .padding()
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
    }
}

#Preview { BeforeAfterExamples() }

/// A helper view modifier that applies the Liquid Glass effect on iOS 26+
/// and falls back to a thin material on earlier systems. Duplicated across
/// examples for convenience. Consider extracting into a shared helper
/// if you reuse it widely.
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
