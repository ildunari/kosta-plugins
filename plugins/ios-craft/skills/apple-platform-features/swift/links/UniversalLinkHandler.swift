import SwiftUI

struct LinkHandlerView: View {
    @State private var lastURL: URL?

    var body: some View {
        Text(lastURL?.absoluteString ?? "Waiting for link...")
            .padding()
            .onOpenURL { url in
                // Match scheme/path and route
                lastURL = url
                handle(url: url)
            }
    }

    func handle(url: URL) {
        // Example: myapp://item/123 or https://example.com/item/123 via AASA
        print("Handle deep link: \(url)")
    }
}
