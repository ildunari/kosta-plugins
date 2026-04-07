// examples/DemoApp/ContentView.swift
// A comprehensive showcase of Liquid Glass on iOS 26.
//
// This view arranges a variety of components from the skill package
// into a single scrollable page. It demonstrates basic cards and
// buttons, grouping and morphing transitions, UIKit interop, animation
// and vibrancy patterns, accessibility handling, before/after
// comparisons and a floating tab bar. A toolbar button presents
// a sheet using the `GlassSheet` helper. The background image is
// common to all examples to illustrate how glass refracts vivid
// content.

import SwiftUI

struct ContentView: View {
    @State private var showSheet = false
    @State private var selectedTab = 0

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 32) {
                    // MARK: Cards & Buttons
                    Group {
                        Text("Cards & Buttons")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(.primary)

                        // Glass cards with different variants
                        VStack(spacing: 16) {
                            GlassCard(variant: .clear)
                                .frame(height: 100)
                            GlassCard(variant: .tinted)
                                .frame(height: 100)
                            GlassCard(variant: .prominent)
                                .frame(height: 100)
                        }

                        // Buttons illustrating .glass and .glassProminent styles
                        HStack(spacing: 16) {
                            Button("Primary") {}
                                .buttonStyle(.glassProminent)
                            Button("Secondary") {}
                                .buttonStyle(.glass)
                            Button(role: .destructive) {
                                // Destructive action
                            } label: {
                                Text("Delete")
                            }
                            .buttonStyle(.glassProminent)
                            .tint(.red)
                        }
                    }

                    // MARK: Grouping & Morphing
                    Group {
                        Text("Grouping & Morphing")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(.primary)

                        GlassEffectContainerExample()

                        GlassMorphingExample()
                    }

                    // MARK: UIKit Integration
                    Group {
                        Text("UIKit Integration")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(.primary)

                        // Demonstrate UIKit glass views inside SwiftUI.
                        UIKitGlassExamples()
                    }

                    // MARK: Animation & Vibrancy
                    Group {
                        Text("Animation & Vibrancy")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(.primary)

                        AnimationExamples()

                        MaterialVibrancyExamples()
                    }

                    // MARK: Accessibility
                    Group {
                        Text("Accessibility Examples")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(.primary)

                        AccessibilityExamples()
                    }

                    // MARK: Before & After
                    Group {
                        Text("Before & After")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(.primary)

                        BeforeAfterExamples()
                    }

                    // MARK: Tab Bar Demo
                    Group {
                        Text("Tab Bar Demo")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(.primary)

                        // Show the floating GlassTabBar inside the scroll view
                        GlassTabBar(selection: $selectedTab, items: [
                            .init("Home", "house.fill"),
                            .init("Explore", "magnifyingglass"),
                            .init("Profile", "person.fill")
                        ])
                        .padding(.horizontal)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 120) // extra space below content
                .padding(.top, 16)
            }
            .navigationTitle("Liquid Glass")
            .toolbar {
                ToolbarItemGroup(placement: .navigationBarTrailing) {
                    // Show a glass button that triggers a sheet
                    Button(action: { showSheet = true }) {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.glass)
                }
            }
            // Present a sheet backed by Liquid Glass using the GlassSheet wrapper.
            .overlay(
                GlassSheet(isPresented: $showSheet) {
                    // Content of the sheet. We reuse the design from GlassSheetDemo.
                    VStack(spacing: 20) {
                        Capsule()
                            .frame(width: 60, height: 6)
                            .foregroundStyle(.secondary)
                            .opacity(0.5)
                        Text("Glass Sheet")
                            .font(.headline)
                            .foregroundStyle(.primary)
                        Text("This sheet adopts Liquid Glass automatically and groups its controls.")
                            .font(.footnote)
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.secondary)
                        GlassEffectContainer(spacing: 12) {
                            Button("Confirm") { showSheet = false }
                                .buttonStyle(.glassProminent)
                            Button("Cancel") { showSheet = false }
                                .buttonStyle(.glass)
                        }
                        .tint(.accentColor)
                    }
                    .padding()
                }
            )
        }
        // A vivid background image to highlight refraction and tint
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
    }
}

#Preview {
    ContentView()
}