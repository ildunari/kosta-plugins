// components/GlassCard.swift
// A Liquid Glass card demonstrating different tint variants on iOS 26.

import SwiftUI

/// A flexible card component that applies a rounded glass surface with optional tinting.
/// Use `variant` to select between `.clear` (no tint), `.tinted` (subtle contrast), and
/// `.prominent` (strong contrast).  The tint intensity can be adjusted via `tintOpacity`.
public struct GlassCard: View {
    public enum Variant: String {
        case clear
        case tinted
        case prominent
    }

    public var variant: Variant = .clear
    public var cornerRadius: CGFloat = 20
    public var tintOpacity: Double = 0.08
    @Environment(\.colorScheme) private var scheme

    public init(variant: Variant = .clear, cornerRadius: CGFloat = 20, tintOpacity: Double = 0.08) {
        self.variant = variant
        self.cornerRadius = cornerRadius
        self.tintOpacity = tintOpacity
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Glass Card")
                .font(.title3.weight(.semibold))
                .foregroundStyle(.primary)
            Text("A translucent surface that preserves context while elevating content.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(16)
        .glassEffect(glassStyle, in: .rect(cornerRadius: cornerRadius))
        .shadow(color: Color.black.opacity(0.2), radius: 16, x: 0, y: 8)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
    }

    private var glassStyle: Glass {
        switch variant {
        case .clear:
            return .clear
        case .tinted:
            let base = (scheme == .dark ? Color.white : Color.black).opacity(tintOpacity)
            return .regular.tint(base)
        case .prominent:
            let base = Color.black.opacity(max(0.18, tintOpacity))
            return .regular.tint(base)
        }
    }
}

// MARK: - Previews

struct GlassCard_Preview: View {
    var body: some View {
        VStack(spacing: 20) {
            GlassCard(variant: .clear)
                .frame(height: 120)
            GlassCard(variant: .tinted)
                .frame(height: 120)
            GlassCard(variant: .prominent)
                .frame(height: 120)
        }
        .padding()
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
    }
}

#Preview {
    GlassCard_Preview()
}