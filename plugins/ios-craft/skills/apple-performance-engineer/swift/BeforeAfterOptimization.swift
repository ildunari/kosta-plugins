
import XCTest
import UIKit

// Demonstration test of naive vs optimized image loading using downsampling.
final class ImageListPerfTests: XCTestCase {
    func test_naive_vs_downsampled() throws {
        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
            let urls = (0..<50).compactMap { Bundle.main.url(forResource: "img\($0)", withExtension: "jpg") }
            var ivs: [UIImageView] = []
            for u in urls {
                // BEFORE (naive): decode at full resolution
                if let data = try? Data(contentsOf: u), let img = UIImage(data: data) {
                    ivs.append(UIImageView(image: img))
                }
            }
            XCTAssertGreaterThan(ivs.count, 0)
        }

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
            let urls = (0..<50).compactMap { Bundle.main.url(forResource: "img\($0)", withExtension: "jpg") }
            var ivs: [UIImageView] = []
            for u in urls {
                // AFTER (optimized): downsample to display size
                if let img = Downsampler.downsample(imageAt: u, to: CGSize(width: 200, height: 200), scale: UIScreen.main.scale) {
                    ivs.append(UIImageView(image: img))
                }
            }
            XCTAssertGreaterThan(ivs.count, 0)
        }
    }
}
