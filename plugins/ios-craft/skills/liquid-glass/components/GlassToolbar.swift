// components/GlassToolbar.swift
// Demonstrates toolbars adopting Liquid Glass automatically with semantic glass buttons.

import SwiftUI

public struct GlassToolbarDemo: View {
    public init() {}
    public var body: some View {
        NavigationStack {
            List {
                ForEach(0..<12, id: \.self) { i in
                    HStack {
                        Circle()
                            .frame(width: 36, height: 36)
                            .foregroundStyle(.secondary)
                        VStack(alignment: .leading) {
                            Text("Row \(i)")
                                .foregroundStyle(.primary)
                            Text("Secondary")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Glass Toolbar")
            .toolbar {
                ToolbarItemGroup(placement: .topBarLeading) {
                    Button(action: {}) {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                    }
                    .buttonStyle(.glass)
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button(action: {}) {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .buttonStyle(.glass)
                }
            }
        }
    }
}

#Preview {
    GlassToolbarDemo()
}