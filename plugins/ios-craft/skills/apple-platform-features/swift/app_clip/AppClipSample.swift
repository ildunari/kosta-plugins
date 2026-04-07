import SwiftUI

@main
struct AppClipSample: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    // Parse invocation URL, route to critical flow
                    print("App Clip opened with: \(url)")
                }
        }
    }
}

struct ContentView: View {
    @State private var count = 0
    var body: some View {
        VStack {
            Text("App Clip").font(.largeTitle)
            Button("Perform Quick Action (\(count))") { count += 1 }
        }.padding()
    }
}
