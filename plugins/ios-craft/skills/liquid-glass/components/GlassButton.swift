// components/GlassButton.swift
// A modern Liquid Glass button using iOS 26 button styles.

import SwiftUI

/// A semantic glass button that wraps SwiftUI's built‑in `.glass` and `.glassProminent` styles.
/// Kinds map to semantic meaning rather than bespoke visual recipes.  Primary actions use
/// a prominent background tinted with the accent color; secondary actions use a clear glass
/// treatment; destructive actions are tinted red.  You can customise the title and action
/// via the initializer.
public struct GlassButton: View {
    public enum Kind {
        case primary
        case secondary
        case destructive
    }

    private let title: String
    private let kind: Kind
    private let action: () -> Void

    /// Create a new glass button.
    /// - Parameters:
    ///   - title: The button label.
    ///   - kind: The semantic kind controlling tint and prominence.
    ///   - action: The closure to invoke when tapped.
    public init(_ title: String, kind: Kind = .primary, action: @escaping () -> Void) {
        self.title = title
        self.kind = kind
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(title)
                .font(.body.weight(.semibold))
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
        }
        .buttonStyle(kind == .primary || kind == .destructive ? .glassProminent : .glass)
        .tint(tintColor)
    }

    private var tintColor: Color {
        switch kind {
        case .primary:
            return .accentColor
        case .secondary:
            // Use a neutral tint so content stays legible.  The system will adapt based on the underlying content.
            return Color.primary.opacity(0.8)
        case .destructive:
            return .red
        }
    }
}

// MARK: - Previews

struct GlassButton_Preview: View {
    @State private var toggle = false
    var body: some View {
        VStack(spacing: 16) {
            GlassButton("Primary") { toggle.toggle() }
            GlassButton("Secondary", kind: .secondary) { toggle.toggle() }
            GlassButton("Delete", kind: .destructive) { toggle.toggle() }
        }
        .padding()
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
    }
}

#Preview {
    GlassButton_Preview()
}