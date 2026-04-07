
import XCTest

final class TemplatePerfTests: XCTestCase {
    override class var defaultMeasureOptions: XCTMeasureOptions {
        let opts = XCTMeasureOptions()
        opts.iterationCount = 5
        return opts
    }

    func test_app_launch_and_scroll() throws {
        let app = XCUIApplication()
        measure(metrics: [XCTApplicationLaunchMetric(), XCTOSSignpostMetric.scrollingAndDeceleration]) {
            app.launch()
            // TODO: perform a representative scroll
        }
    }

    func test_cpu_memory_workload() throws {
        measure(metrics: [XCTClockMetric(), XCTCPUMetric(), XCTMemoryMetric()]) {
            let arr = (0..<1_000_00).map { $0 }
            _ = arr.reduce(0, +)
        }
    }
}
