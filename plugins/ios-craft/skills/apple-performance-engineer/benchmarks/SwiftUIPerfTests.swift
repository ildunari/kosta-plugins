
import XCTest

final class SwiftUIPerfTests: XCTestCase {
    func test_view_update_signposts() throws {
        measure(metrics: [XCTOSSignpostMetric.renderTime]) {
            // Launch app and navigate to SwiftUI screen with signposts
            XCUIApplication().launch()
        }
    }
}
