import WidgetKit
import SwiftUI
import AppIntents

struct GreetingEntry: TimelineEntry {
    let date: Date
    let config: GreetingConfigIntent
}

struct GreetingProvider: AppIntentTimelineProvider {
    typealias Entry = GreetingEntry
    func placeholder(in context: Context) -> Entry { Entry(date: .now, config: .init()) }
    func snapshot(for configuration: GreetingConfigIntent, in context: Context) async -> Entry {
        Entry(date: .now, config: configuration)
    }
    func timeline(for configuration: GreetingConfigIntent, in context: Context) async -> Timeline<Entry> {
        let now = Date()
        let entries = (0..<5).map { Entry(date: Calendar.current.date(byAdding: .hour, value: $0, to: now)!, config: configuration) }
        return Timeline(entries: entries, policy: .atEnd)
    }
}

struct GreetingWidgetView: View {
    var entry: GreetingEntry
    var body: some View {
        VStack { Text(entry.config.name).font(.headline); Text(entry.date, style: .time) }
            .padding()
    }
}

struct GreetingWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "GreetingWidget", intent: GreetingConfigIntent.self, provider: GreetingProvider()) { GreetingWidgetView(entry: $0) }
            .configurationDisplayName("Greeting")
            .description("Shows a custom greeting.")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct GreetingConfigIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Greeting"
    @Parameter(title: "Name") var name: String
    static var parameterSummary: some ParameterSummary { Summary("Greet \(\$name)") }
    init(name: String = "World") { self.name = name }
}
