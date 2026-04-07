import XCTest
@testable import FeatureProfile

final class FeatureProfileTests: XCTestCase {
    func testExample() {
        var s = ProfileState()
        XCTAssertEqual(s.name, "")
    }
}
