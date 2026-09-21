import Foundation
import CryptoKit

/// Checks a downloaded update against its manifest: size, SHA-256, and — the
/// part that matters — an Ed25519 signature made with the release key.
public struct UpdateVerifier: Sendable {
    /// The raw 32-byte Ed25519 public key.
    public let publicKey: Data

    public init(publicKey: Data) throws {
        guard (try? Curve25519.Signing.PublicKey(rawRepresentation: publicKey)) != nil else {
            throw UpdateError.missingPublicKey
        }
        self.publicKey = publicKey
    }

    /// `base64` as stored in the app's Info.plist (`GembaUpdatePublicKey`).
    public init(publicKeyBase64: String?) throws {
        guard let base64 = publicKeyBase64, let data = Data(base64Encoded: base64) else {
            throw UpdateError.missingPublicKey
        }
        try self.init(publicKey: data)
    }

    public func verify(file: URL, against manifest: UpdateManifest) throws {
        let data = try Data(contentsOf: file, options: .alwaysMapped)
        guard data.count == manifest.size else {
            throw UpdateError.sizeMismatch(expected: manifest.size, actual: data.count)
        }
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard digest == manifest.sha256.lowercased() else { throw UpdateError.checksumMismatch }
        guard let signature = Data(base64Encoded: manifest.signature),
              let key = try? Curve25519.Signing.PublicKey(rawRepresentation: publicKey),
              key.isValidSignature(signature, for: data) else {
            throw UpdateError.badSignature
        }
    }

    /// Signs `data` — used by the release tooling and the tests, never by the app.
    public static func sign(_ data: Data, privateKey: Data) throws -> String {
        let key = try Curve25519.Signing.PrivateKey(rawRepresentation: privateKey)
        return try key.signature(for: data).base64EncodedString()
    }
}
