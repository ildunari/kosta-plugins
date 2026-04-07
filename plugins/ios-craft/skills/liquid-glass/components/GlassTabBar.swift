// components/GlassTabBar.swift
// A floating glass tab bar built with iOS 26 Liquid Glass primitives.

import SwiftUI

public struct GlassTabBar: View {
    @Binding var selection: Int
    public struct Item: Identifiable {
        public var id = UUID()
        public var title: String
        public var systemImage: String
        public init(_ title: String, _ systemImage: String) {
            self.title = title; self.systemImage = systemImage
        }
    }
    let items: [Item]

    public init(selection: Binding<Int>, items: [Item]) {
        self._selection = selection
        self.items = items
    }

    public var body: some View {
        HStack(spacing: 12) {
            // Iterate over indices rather than enumerated tuples to avoid
            // key‑path quoting issues when specifying an identifier. This
            // also simplifies selection handling.
            ForEach(items.indices, id: \.self) { idx in
                let item = items[idx]
                Button(action: {
                    selection = idx
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: item.systemImage)
                        Text(item.title)
                            .font(.caption2)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                }
                .buttonStyle(selection == idx ? .glassProminent : .glass)
                .tint(selection == idx ? .accentColor : Color.primary.opacity(0.8))
            }
        }
        .padding(12)
        .glassEffect(.regular, in: .rect(cornerRadius: 24))
        .shadow(color: Color.black.opacity(0.2), radius: 12, x: 0, y: 6)
        .padding(.horizontal)
    }
}

public struct GlassTabBarDemo: View {
    @State private var selection = 0
    let items = [GlassTabBar.Item("Home","house.fill"),
                 GlassTabBar.Item("Search","magnifyingglass"),
                 GlassTabBar.Item("Profile","person.fill")]
    public var body: some View {
        VStack {
            Spacer()
            GlassTabBar(selection: $selection, items: items)
        }
        .background(Image("GlassDemoBG").resizable().scaledToFill().ignoresSafeArea())
    }
}

#Preview {
    GlassTabBarDemo()
}