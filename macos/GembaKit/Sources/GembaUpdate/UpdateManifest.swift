import Foundation

/// `<site>/download/version.json` — what the newest release is and where to get it.
///
///     {
///       "version": "1.1.0",
///       "build": 2,
///       "url": "https://send.gemba.uk/download/GembaFilesend.zip?build=2",
///       "size": 1770537,
///       "sha256": "1d2f84…",
///       "signature": "<base64 Ed25519 signature of the zip's bytes>",
///       "minimumSystemVersion": "14.0",
///       "notes": "What changed",
///       "published": "2026-09-21T12:00:00Z"
///     }
///
/// Written by `scripts/make-release.sh`. The signature is what makes an update
/// trustworthy: it is made with a private key that never leaves the release
/// machine, and checked against the public key built into the app — so a file
/// swapped on the server, or in transit, is refused even if its checksum was
/// swapped along with it.
public struct UpdateManifest: Codable, Sendable, Equatable {
    public let version: String
    public let build: Int
    public let url: URL
    public let size: Int
    public let sha256: String
    public let signature: String
    public let minimumSystemVersion: String?
    public let notes: String?
    public let published: String?

    public init(version: String, build: Int, url: URL, size: Int, sha256: String, signature: String,
                minimumSystemVersion: String? = nil, notes: String? = nil, published: String? = nil) {
        self.version = version
        self.build = build
        self.url = url
        self.size = size
        self.sha256 = sha256
        self.signature = signature
        self.minimumSystemVersion = minimumSystemVersion
        self.notes = notes
        self.published = published
    }

    public var appVersion: AppVersion? { AppVersion(version, build: build) }

    /// Whether this Mac's macOS is new enough for the release.
    public func supports(system: OperatingSystemVersion) -> Bool {
        guard let minimum = minimumSystemVersion, let required = AppVersion(minimum, build: 0) else { return true }
        let current = AppVersion(components: [system.majorVersion, system.minorVersion, system.patchVersion], build: 0)
        return current >= required
    }
}

/// A marketing version ("1.2.3") plus build number, compared numerically —
/// so 1.10 is newer than 1.9, and 1.1 equals 1.1.0.
public struct AppVersion: Comparable, Sendable, CustomStringConvertible {
    public let components: [Int]
    public let build: Int

    public init?(_ marketing: String, build: Int) {
        let parts = marketing.trimmingCharacters(in: .whitespaces).split(separator: ".", omittingEmptySubsequences: false)
        let numbers = parts.map { Int($0) }
        guard !numbers.isEmpty, numbers.count <= 4, numbers.allSatisfy({ ($0 ?? -1) >= 0 }) else { return nil }
        self.init(components: numbers.compactMap { $0 }, build: build)
    }

    public init(components: [Int], build: Int) {
        self.components = components
        self.build = build
    }

    /// The running app's own version, from its Info.plist.
    public static func of(bundle: Bundle) -> AppVersion? {
        let marketing = bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        let build = Int(bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "") ?? 0
        return AppVersion(marketing, build: build)
    }

    public var description: String { components.map(String.init).joined(separator: ".") }

    public static func < (lhs: AppVersion, rhs: AppVersion) -> Bool {
        let count = max(lhs.components.count, rhs.components.count)
        for index in 0..<count {
            let a = index < lhs.components.count ? lhs.components[index] : 0
            let b = index < rhs.components.count ? rhs.components[index] : 0
            if a != b { return a < b }
        }
        return lhs.build < rhs.build
    }

    public static func == (lhs: AppVersion, rhs: AppVersion) -> Bool { !(lhs < rhs) && !(rhs < lhs) }
}

public enum UpdateError: Error, LocalizedError, Equatable {
    case badManifest(String)
    case insecureURL(String)
    case missingPublicKey
    case sizeMismatch(expected: Int, actual: Int)
    case checksumMismatch
    case badSignature
    case download(String)
    case badBundle(String)
    case cannotInstall(String)

    public var errorDescription: String? {
        switch self {
        case .badManifest(let why): "The update information couldn't be read: \(why)"
        case .insecureURL(let url): "Refusing to download an update over an insecure connection (\(url))."
        case .missingPublicKey: "This build has no update key, so it can't verify updates."
        case .sizeMismatch(let expected, let actual): "The update is \(actual) bytes, not the \(expected) announced — refused."
        case .checksumMismatch: "The update's checksum doesn't match — refused."
        case .badSignature: "The update isn't signed by Gemba — refused."
        case .download(let why): "The update couldn't be downloaded: \(why)"
        case .badBundle(let why): "The downloaded update isn't a valid Gemba Filesend app: \(why)"
        case .cannotInstall(let why): "The update couldn't be installed: \(why)"
        }
    }
}
