
import SwiftUI
import os

// Shows Equatable, view identity control, and signposts to visualize updates.
struct Player: Identifiable, Equatable { let id: Int; let score: Int }

struct ScoreRow: View, Equatable {
    let player: Player
    static func == (lhs: ScoreRow, rhs: ScoreRow) -> Bool { lhs.player == rhs.player }
    var body: some View {
        HStack { Text("#\(player.id)"); Spacer(); Text("\(player.score)") }
            .padding(8)
    }
}

struct ScoreboardView: View {
    @State private var players = (0..<500).map { Player(id: $0, score: Int.random(in: 0...100)) }
    private let log = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app", category: "SwiftUI")

    var body: some View {
        ScrollView {
            LazyVStack {
                ForEach(players) { p in
                    ScoreRow(player: p).equatable()
                }
            }
        }
        .onAppear { updateScores() }
    }

    private func updateScores() {
        // Simulate frequently changing data; only rows with different Player change
        for i in players.indices {
            if Bool.random() { players[i].score = Int.random(in: 0...100) }
        }
        log.signpost(.event, "scores-updated")
    }
}
