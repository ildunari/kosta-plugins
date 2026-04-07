import WidgetKit
import SwiftUI

struct WeatherEntry: TimelineEntry {
    let date: Date
    let temp: Int
}

struct WeatherProvider: TimelineProvider {
    func placeholder(in context: Context) -> WeatherEntry { WeatherEntry(date: .now, temp: 72) }
    func getSnapshot(in context: Context, completion: @escaping (WeatherEntry) -> Void) {
        completion(WeatherEntry(date: .now, temp: 72))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WeatherEntry>) -> Void) {
        let start = Date()
        let entries = (0..<5).map { idx in
            WeatherEntry(date: Calendar.current.date(byAdding: .hour, value: idx, to: start)!, temp: 60 + idx)
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct WeatherWidgetView: View {
    var entry: WeatherEntry
    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            LinearGradient(gradient: Gradient(colors: [.blue.opacity(0.5), .clear]), startPoint: .top, endPoint: .bottom)
            Text("\(entry.temp)°").font(.system(size: 42, weight: .bold))
                .padding()
        }
    }
}

struct WeatherWidget: Widget {
    let kind = "WeatherWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WeatherProvider()) { WeatherWidgetView(entry: $0) }
            .configurationDisplayName("Weather")
            .description("Shows upcoming temperatures.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

#Preview(as: .systemMedium) {
    WeatherWidget()
} timeline: {
    WeatherEntry(date: .now, temp: 70)
}
