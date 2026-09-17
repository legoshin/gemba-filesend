import Foundation
import CryptoKit

/// Failures in the local read+encrypt step. Kept distinct from network and
/// validation errors so the UI can offer the same explicit unencrypted-upload
/// fallback the web app offers (never a silent downgrade).
public enum EncryptionError: Error, LocalizedError, Sendable {
    case payloadTooShort
    case invalidKeyLength(Int)
    case invalidKeyEncoding
    case sealFailed(String)
    case openFailed(String)

    public var errorDescription: String? {
        switch self {
        case .payloadTooShort:
            return "Encrypted payload is too short to contain an IV."
        case .invalidKeyLength(let n):
            return "Share key must be 16 bytes (AES-128); got \(n)."
        case .invalidKeyEncoding:
            return "Share key is not valid base64url."
        case .sealFailed(let m):
            return "Encryption failed: \(m)"
        case .openFailed(let m):
            return "Decryption failed: \(m)"
        }
    }
}

/// The AES-128-GCM share key. One key per share — every file in a multi-file
/// share is encrypted under this same key with its own random IV, and the key
/// only ever appears in the link fragment.
///
/// Wire contract (must byte-match `src/lib/crypto.ts`):
///   - AES-128-GCM (128-bit key, *not* 256)
///   - 12-byte random IV per file
///   - packed blob = [12-byte IV][ciphertext][16-byte tag]
///   - key encoded base64url without padding
///
/// CryptoKit's `AES.GCM.SealedBox.combined` is exactly nonce ‖ ciphertext ‖ tag,
/// which is byte-identical to the web's `encryptPacked` output, so the packed
/// form needs no re-layout in either direction.
public struct ShareKey: Sendable, Equatable {
    public static let keyBytes = 16
    public static let ivBytes = 12
    public static let tagBytes = 16

    private let raw: Data

    /// Generates a fresh 128-bit key from the system CSPRNG.
    public init() {
        var bytes = Data(count: Self.keyBytes)
        _ = bytes.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, Self.keyBytes, $0.baseAddress!) }
        self.raw = bytes
    }

    public init(raw: Data) throws {
        guard raw.count == Self.keyBytes else { throw EncryptionError.invalidKeyLength(raw.count) }
        self.raw = raw
    }

    /// Parses the `#fragment` half of a share link.
    public init(base64URL: String) throws {
        guard let data = Base64URL.decode(base64URL) else { throw EncryptionError.invalidKeyEncoding }
        try self.init(raw: data)
    }

    /// The form that goes after `#` in the share link. Never send this anywhere else.
    public var base64URL: String { Base64URL.encode(raw) }

    var symmetric: SymmetricKey { SymmetricKey(data: raw) }

    public static func == (a: ShareKey, b: ShareKey) -> Bool {
        // Constant-time compare — keys are secret material.
        guard a.raw.count == b.raw.count else { return false }
        var diff: UInt8 = 0
        for i in 0..<a.raw.count { diff |= a.raw[i] ^ b.raw[i] }
        return diff == 0
    }
}

public enum PackedCrypto {
    /// Encrypts `data` and returns `[iv][ciphertext + tag]` — the exact bytes
    /// `encryptPacked` produces in the browser.
    public static func seal(_ data: Data, key: ShareKey) throws -> Data {
        do {
            let box = try AES.GCM.seal(data, using: key.symmetric)
            guard let combined = box.combined else {
                throw EncryptionError.sealFailed("sealed box has no combined representation")
            }
            return combined
        } catch let e as EncryptionError {
            throw e
        } catch {
            throw EncryptionError.sealFailed(String(describing: error))
        }
    }

    /// Inverse of `seal`. Throws if the authentication tag does not verify.
    public static func open(_ packed: Data, key: ShareKey) throws -> Data {
        // An empty plaintext packs to exactly IV + tag, so this bound is inclusive.
        guard packed.count >= ShareKey.ivBytes + ShareKey.tagBytes else {
            throw EncryptionError.payloadTooShort
        }
        do {
            let box = try AES.GCM.SealedBox(combined: packed)
            return try AES.GCM.open(box, using: key.symmetric)
        } catch {
            throw EncryptionError.openFailed(String(describing: error))
        }
    }
}

/// Mirrors `randomSaltBase64()` — 16 random bytes, base64url.
public func randomSaltBase64URL() -> String {
    var bytes = Data(count: 16)
    _ = bytes.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 16, $0.baseAddress!) }
    return Base64URL.encode(bytes)
}

/// Mirrors `sha256Hex()` — lowercase hex of SHA-256 over the UTF-8 bytes.
public func sha256Hex(_ input: String) -> String {
    SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
}
