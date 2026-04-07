import WidgetKit
import SwiftUI

struct StepsEntry: TimelineEntry {
    let date: Date
    let steps: Int
}

struct StepsProvider: TimelineProvider {
    func placeholder(in context: Context) -> StepsEntry { StepsEntry(date: .now, steps: 500) }
    func getSnapshot(in context: Context, completion: @escaping (StepsEntry) -> Void) {
        completion(StepsEntry(date: .now, steps: 500))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<StepsEntry>) -> Void) {
        let now = Date()
        let entries = (0..<5).map { StepsEntry(date: Calendar.current.date(byAdding: .hour, value: $0, to: now)!, steps: 1000 + $0*250) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct StepsComplicationView: View {
    var entry: StepsEntry
    var body: some View {
        Text("\(entry.steps)")
    }
}

@main
struct StepsComplicationBundle: WidgetBundle {
    var body: some Widget {
        Widget {
            StaticConfiguration(kind: "Steps", provider: StepsProvider()) { StepsComplicationView(entry: $0) }
                .supportedFamilies([.accessoryCorner, .accessoryCircular, .accessoryRectangular])
        }
    }
}
