// components/GlassNavigation.swift
// Demonstrates navigation and toolbar patterns with Liquid Glass on iOS 26.

import SwiftUI

public struct GlassNavigationDemo: View {
    public init() {}
    public var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                NavigationLink(destination: DetailView()) {
                    Text("Push Details")
                }
                .buttonStyle(.glassProminent)

                Text("Content scrolls under the glass navigation bar.")
                    .foregroundStyle(.secondary)

                Spacer()
            }
            .padding()
            .navigationTitle("Glass Nav")
            // The toolbar automatically adopts Liquid Glass on iOS 26.
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button(action: {}) {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.glass)

                    ToolbarSpacer(.fixed(8))

                    Button(action: {}) {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .buttonStyle(.glass)
                }
            }
        }
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
    }

    struct DetailView: View {
        var body: some View {
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(0..<10) { _ in
                        GlassCard(variant: .tinted)
                            .frame(maxWidth: .infinity)
                            .frame(height: 100)
                            .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Details")
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button(action: {}) { Image(systemName: "square.and.arrow.up") }
                        .buttonStyle(.glass)
                }
            }
        }
    }
}

#Preview {
    GlassNavigationDemo()
}