// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FeatureProfile",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [.library(name: "FeatureProfile", targets: ["FeatureProfile"])],
    targets: [
        .target(name: "FeatureProfile", path: "Sources"),
        .testTarget(name: "FeatureProfileTests", dependencies: ["FeatureProfile"], path: "Tests")
    ]
)
