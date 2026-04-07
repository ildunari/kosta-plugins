// components/GlassEffectContainerExample.swift
// Demonstrates grouping multiple glass elements with `GlassEffectContainer` on iOS 26.

import SwiftUI

/// An example view that groups a pair of glass buttons inside a
/// `GlassEffectContainer`. Grouping adjacent glass elements ensures
/// they sample the same region, blend seamlessly, and can morph when
/// moved closer together. When running on earlier iOS releases, the
/// buttons fall back to individual thin material surfaces so the
/// example remains functional.
public struct GlassEffectContainerExample: View {
    public init() {}
    public var body: some View {
        VStack(spacing: 24) {
            Text("Grouped Glass Buttons")
                .font(.headline)
                .foregroundStyle(.primary)

            if #available(iOS 26, *) {
                // Use GlassEffectContainer to unify sampling and tint across
                // both buttons. The spacing parameter controls when
                // neighbouring surfaces begin to merge.
                GlassEffectContainer(spacing: 18) {
                    HStack(spacing: 18) {
                        Button {
                            // Location action
                        } label: {
                            Label("Location", systemImage: "mappin.and.ellipse")
                                .labelStyle(.iconOnly)
                        }
                        .buttonStyle(.glass)

                        Button {
                            // Navigate action
                        } label: {
                            Label("Navigate", systemImage: "location")
                                .labelStyle(.iconOnly)
                        }
                        .buttonStyle(.glass)
                    }
                }
                .tint(.white.opacity(0.85))
            } else {
                // Fallback: simply lay out buttons side‑by‑side without
                // grouping and use thin material backgrounds.
                HStack(spacing: 18) {
                    Button {
                        // Location action
                    } label: {
                        Image(systemName: "mappin.and.ellipse")
                    }
                    .buttonStyle(.plain)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(.ultraThinMaterial)
                    )

                    Button {
                        // Navigate action
                    } label: {
                        Image(systemName: "location")
                    }
                    .buttonStyle(.plain)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(.ultraThinMaterial)
                    )
                }
                .foregroundColor(.primary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
    }
}

#Preview {
    GlassEffectContainerExample()
}