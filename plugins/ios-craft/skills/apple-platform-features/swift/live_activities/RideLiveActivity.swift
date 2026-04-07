import ActivityKit
import WidgetKit
import SwiftUI

struct RideAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var etaMinutes: Int
        var stage: String
    }
    var rideID: String
}

// Requires iOS 17+. Adjust the availability check when targeting newer releases.
@available(iOS 17.0, *)
struct RideLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RideAttributes.self) { context in
            VStack {
                Text("Ride #\(context.attributes.rideID)")
                Text("ETA: \(context.state.etaMinutes)m • \(context.state.stage)")
            }.padding()
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { Text("🚗") }
                DynamicIslandExpandedRegion(.center) { Text("\(context.state.etaMinutes)m") }
                DynamicIslandExpandedRegion(.trailing) { Text(context.state.stage) }
            } compactLeading: {
                Text("🚗")
            } compactTrailing: {
                Text("\(context.state.etaMinutes)m")
            } minimal: {
                Text("\(context.state.etaMinutes)")
            }
        }
    }
}
