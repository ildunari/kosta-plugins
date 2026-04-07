// components/GlassSheetModifier.swift
// Presents a sheet that adopts Liquid Glass automatically on iOS 26.

import SwiftUI

/// A convenience wrapper to present a sheet with configurable detents.  The sheet uses the
/// system Liquid Glass background automatically on iOS 26.  Pass your content builder into
/// `content` to compose the sheet's body.
public struct GlassSheet<Content: View>: View {
    @Binding private var isPresented: Bool
    private let detents: Set<PresentationDetent>
    private let content: () -> Content

    public init(isPresented: Binding<Bool>, detents: Set<PresentationDetent> = [.medium, .large], @ViewBuilder content: @escaping () -> Content) {
        self._isPresented = isPresented
        self.detents = detents
        self.content = content
    }

    public var body: some View {
        EmptyView()
            .sheet(isPresented: $isPresented) {
                content()
                    .presentationDetents(detents)
                    // iOS 26 automatically applies Liquid Glass to the sheet background.
                    .interactiveDismissDisabled(false)
            }
    }
}

/// Demonstrates presenting a sheet backed by Liquid Glass.  The sheet content is placed on its
/// own glass surface using a `GlassEffectContainer` so that grouped controls merge elegantly.
public struct GlassSheetDemo: View {
    @State private var present = false
    public init() {}
    public var body: some View {
        VStack {
            Button("Show Glass Sheet") { present = true }
                .buttonStyle(.glassProminent)

            Spacer()
        }
        .padding()
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
        .glassSheet(isPresented: $present) {
            VStack(spacing: 20) {
                Capsule()
                    .frame(width: 60, height: 6)
                    .foregroundStyle(.secondary)
                    .opacity(0.5)

                Text("Glass Sheet")
                    .font(.headline)
                    .foregroundStyle(.primary)

                Text("System‑backed sheet with grouped glass content.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                GlassEffectContainer(spacing: 12) {
                    Button("Confirm") { present = false }
                        .buttonStyle(.glassProminent)
                    Button("Cancel") { present = false }
                        .buttonStyle(.glass)
                }
                .tint(.accentColor)
            }
            .padding()
        }
    }
}

// Extension to simplify calling the custom sheet wrapper.
private extension View {
    func glassSheet<Content: View>(isPresented: Binding<Bool>, detents: Set<PresentationDetent> = [.medium, .large], @ViewBuilder content: @escaping () -> Content) -> some View {
        self.overlay(GlassSheet(isPresented: isPresented, detents: detents, content: content))
    }
}

#Preview {
    GlassSheetDemo()
}