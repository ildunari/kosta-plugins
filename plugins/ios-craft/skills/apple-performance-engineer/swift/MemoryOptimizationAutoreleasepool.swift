
import Foundation
import os

// Demonstrates bounding peak memory in a tight loop by scoping autoreleased
// Foundation objects (e.g. NSString, NSData) with autoreleasepool.
struct ImageProcessor {
    let urls: [URL]
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app", category: "Perf")

    func processAll() {
        var total = 0
        for chunk in urls.chunked(into: 50) {
            autoreleasepool {
                var acc = 0
                for u in chunk {
                    if let data = try? Data(contentsOf: u),
                       let s = String(data: data, encoding: .utf8) {
                        acc += s.count
                    }
                }
                total += acc
                logger.info("processed chunk size=\(acc)")
            }
        }
        print("TOTAL \(total)")
    }
}

// Helpers
extension Array {
    func chunked(into size: Int) -> [[Element]] {
        guard size > 0 else { return [self] }
        return stride(from: 0, to: count, by: size).map {
            Array(self[$0 ..< Swift.min($0 + size, count)])
        }
    }
}
