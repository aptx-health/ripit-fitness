// swift-tools-version:6.0
import PackageDescription

// RipitCore: the iOS app's pure logic (initiative ios-app, slice 1). No UIKit or SwiftUI here,
// so `swift test --package-path ios/RipitCore` runs headless on the Mac.
let package = Package(
    name: "RipitCore",
    platforms: [.iOS(.v18), .macOS(.v15)],
    products: [.library(name: "RipitCore", targets: ["RipitCore"])],
    dependencies: [
        .package(url: "https://github.com/groue/GRDB.swift.git", from: "7.12.0"),
    ],
    targets: [
        .target(name: "RipitCore", dependencies: [.product(name: "GRDB", package: "GRDB.swift")]),
        .testTarget(name: "RipitCoreTests", dependencies: ["RipitCore", .product(name: "GRDB", package: "GRDB.swift")]),
    ]
)
