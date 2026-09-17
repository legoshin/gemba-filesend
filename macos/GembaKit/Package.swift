// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "GembaKit",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "GembaCrypto", targets: ["GembaCrypto"]),
        .library(name: "GembaUpload", targets: ["GembaUpload"]),
        .executable(name: "gemba-send", targets: ["gemba-send"]),
    ],
    targets: [
        .target(name: "GembaCrypto"),
        .target(name: "GembaUpload", dependencies: ["GembaCrypto"]),
        .executableTarget(name: "gemba-send", dependencies: ["GembaUpload", "GembaCrypto"]),
        .testTarget(
            name: "GembaCryptoTests",
            dependencies: ["GembaCrypto"],
            resources: [.copy("vectors.json")]
        ),
        .testTarget(name: "GembaUploadTests", dependencies: ["GembaUpload"]),
    ]
)
