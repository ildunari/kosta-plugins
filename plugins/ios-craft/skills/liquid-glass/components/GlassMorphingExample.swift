// components/GlassMorphingExample.swift
// Demonstrates morphing between different glass shapes using `glassEffectID`.

import SwiftUI

/// Shows how to coordinate transitions between multiple glass elements using
/// `glassEffectID` and a shared namespace. Tapping the button toggles
/// between a compact arrangement and an expanded card. The card and its
/// compact representation share the same `glassEffectID` so SwiftUI can
/// smoothly morph between them. A spring animation controls the timing
/// of the morph. Fallback behaviour for pre‑iOS 26 systems uses
/// standard shapes without morphing.
public struct GlassMorphingExample: View {
    @Namespace private var glassNS
    @State private var expanded = false

    public init() {}

    public var body: some View {
        VStack(spacing: 24) {
            if #available(iOS 26, *) {
                GlassEffectContainer(spacing: 12) {
                    if expanded {
                        RoundedRectangle(cornerRadius: 16)
                            .frame(height: 90)
                            .glassEffect(.regular, in: .rect(cornerRadius: 16))
                            .glassEffectID("card", in: glassNS)
                    } else {
                        HStack(spacing: 12) {
                            Circle()
                                .frame(width: 48, height: 48)
                                .glassEffect(.regular, in: .circle)
                                .glassEffectID("card", in: glassNS)
                            RoundedRectangle(cornerRadius: 12)
                                .frame(height: 48)
                                .glassEffect(.regular, in: .rect(cornerRadius: 12))
                                .glassEffectID("card", in: glassNS)
                        }
                    }
                }
                .padding(.horizontal)

                Button(expanded ? "Collapse" : "Expand") {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                        expanded.toggle()
                    }
                }
                .buttonStyle(.glassProminent)
            } else {
                // Fallback: show static shapes without morphing.
                if expanded {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(.ultraThinMaterial)
                        .frame(height: 90)
                } else {
                    HStack(spacing: 12) {
                        Circle()
                            .fill(.ultraThinMaterial)
                            .frame(width: 48, height: 48)
                        RoundedRectangle(cornerRadius: 12)
                            .fill(.ultraThinMaterial)
                            .frame(height: 48)
                    }
                }
                Button(expanded ? "Collapse" : "Expand") {
                    withAnimation(.spring()) {
                        expanded.toggle()
                    }
                }
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(.ultraThinMaterial)
                )
            }
        }
        .padding(.vertical, 24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
    }
}

#Preview {
    GlassMorphingExample()
}