// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "GembaKit",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "GembaCrypto", targets: ["GembaCrypto"]),
        .library(name: "GembaUpload", targets: ["GembaUpload"]),
        .library(name: "GembaUpdate", targets: ["GembaUpdate"]),
        .executable(name: "gemba-send", targets: ["gemba-send"]),
    ],
    targets: [
        .target(name: "GembaCrypto"),
        .target(
            name: "GembaUpload",
            dependencies: ["GembaCrypto"],
            // The system zlib: CRC-32 and raw DEFLATE for the folder zip writer.
            linkerSettings: [.linkedLibrary("z")]
        ),
        // Self-update: version.json, Ed25519-verified downloads, the swap.
        .target(name: "GembaUpdate"),
        .executableTarget(name: "gemba-send", dependencies: ["GembaUpload", "GembaCrypto"]),
        .testTarget(
            name: "GembaCryptoTests",
            dependencies: ["GembaCrypto"],
            resources: [.copy("vectors.json")]
        ),
        .testTarget(name: "GembaUploadTests", dependencies: ["GembaUpload"]),
        .testTarget(name: "GembaUpdateTests", dependencies: ["GembaUpdate"]),
    ]
)
