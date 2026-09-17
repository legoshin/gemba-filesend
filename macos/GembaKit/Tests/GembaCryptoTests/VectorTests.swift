import XCTest
import Foundation
@testable import GembaCrypto

/// The interop contract. Every vector in `vectors.json` was produced by the web
/// app's own WebCrypto path (`macos/scripts/gen-vectors.mjs` is a transcription
/// of `src/lib/crypto.ts`), so these tests answer the only question that matters:
/// will a link made on one platform open on the other.
final class VectorTests: XCTestCase {
    struct Fixtures: Decodable, Sendable {
        struct Vector: Decodable, Sendable {
            let name: String
            let keyBase64Url: String
            let plaintextBase64: String
            let packedBase64: String
            let plaintextLength: Int
        }
        struct Base64URLCase: Decodable, Sendable { let bytesBase64: String; let encoded: String }
        struct PasswordCase: Decodable, Sendable { let password: String; let salt: String; let sha256Hex: String }
        let vectors: [Vector]
        let base64UrlCases: [Base64URLCase]
        let passwordCases: [PasswordCase]
    }

    static let fixtures: Fixtures = {
        guard let url = Bundle.module.url(forResource: "vectors", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode(Fixtures.self, from: data)
        else { fatalError("vectors.json missing — run `node macos/scripts/gen-vectors.mjs`") }
        return decoded
    }()

    /// Web -> Mac: bytes the browser produced must decrypt here.
    func testDecryptsWebProducedPayloads() throws {
        for v in Self.fixtures.vectors {
            let key = try ShareKey(base64URL: v.keyBase64Url)
            let packed = try XCTUnwrap(Data(base64Encoded: v.packedBase64), v.name)
            let expected = try XCTUnwrap(Data(base64Encoded: v.plaintextBase64), v.name)
            let plaintext = try PackedCrypto.open(packed, key: key)
            XCTAssertEqual(plaintext, expected, "vector \(v.name) did not round-trip")
            XCTAssertEqual(plaintext.count, v.plaintextLength, "vector \(v.name) length")
        }
    }

    /// Mac -> Web: our packed layout must be exactly [12-byte IV][ciphertext][16-byte tag],
    /// which is what the web's `decryptPacked` slices blindly. A layout drift here
    /// is the single failure that would silently break every link we make.
    func testPackedLayoutMatchesWebExpectation() throws {
        for v in Self.fixtures.vectors {
            let key = try ShareKey(base64URL: v.keyBase64Url)
            let plaintext = try XCTUnwrap(Data(base64Encoded: v.plaintextBase64))
            let packed = try PackedCrypto.seal(plaintext, key: key)

            XCTAssertEqual(packed.count, ShareKey.ivBytes + plaintext.count + ShareKey.tagBytes,
                           "vector \(v.name): packed size must be IV + plaintext + tag")

            // Decrypt the way the web does: slice the IV off the front, hand the
            // rest to AES-GCM as ciphertext||tag.
            let iv = packed.prefix(ShareKey.ivBytes)
            let body = packed.dropFirst(ShareKey.ivBytes)
            XCTAssertEqual(iv.count, 12)
            let reassembled = Data(iv) + Data(body)
            XCTAssertEqual(try PackedCrypto.open(reassembled, key: key), plaintext)
        }
    }

    /// Two encryptions of the same file under the same share key must never
    /// reuse an IV — GCM nonce reuse is catastrophic, and a multi-file share
    /// deliberately shares one key across files.
    func testEveryEncryptionUsesAFreshIV() throws {
        let key = ShareKey()
        let data = Data("same bytes every time".utf8)
        var seen = Set<Data>()
        for _ in 0..<200 {
            let iv = try PackedCrypto.seal(data, key: key).prefix(ShareKey.ivBytes)
            XCTAssertTrue(seen.insert(Data(iv)).inserted, "IV reused under a shared share key")
        }
    }

    func testTamperedCiphertextIsRejected() throws {
        let key = ShareKey()
        var packed = try PackedCrypto.seal(Data("payload".utf8), key: key)
        packed[packed.count - 1] ^= 0x01 // flip a bit in the auth tag
        XCTAssertThrowsError(try PackedCrypto.open(packed, key: key))

        var flippedIV = try PackedCrypto.seal(Data("payload".utf8), key: key)
        flippedIV[0] ^= 0x01
        XCTAssertThrowsError(try PackedCrypto.open(flippedIV, key: key))
    }

    func testWrongKeyIsRejected() throws {
        let packed = try PackedCrypto.seal(Data("payload".utf8), key: ShareKey())
        XCTAssertThrowsError(try PackedCrypto.open(packed, key: ShareKey()))
    }

    func testShortPayloadIsRejected() {
        XCTAssertThrowsError(try PackedCrypto.open(Data(repeating: 0, count: 27), key: ShareKey()))
    }

    // MARK: - Encoding + key parity

    func testBase64URLMatchesWeb() throws {
        for c in Self.fixtures.base64UrlCases {
            let bytes = try XCTUnwrap(Data(base64Encoded: c.bytesBase64))
            XCTAssertEqual(Base64URL.encode(bytes), c.encoded)
            XCTAssertEqual(Base64URL.decode(c.encoded), bytes)
        }
        // The web strips padding; we must accept both forms on the way back in.
        XCTAssertEqual(Base64URL.decode("AAEC"), Data([0, 1, 2]))
        XCTAssertEqual(Base64URL.decode("AAECAw"), Base64URL.decode("AAECAw=="))
        XCTAssertNil(Base64URL.decode("not base64 !!"))
    }

    func testKeysAreAlways128Bit() throws {
        for _ in 0..<50 {
            let key = ShareKey()
            let raw = try XCTUnwrap(Base64URL.decode(key.base64URL))
            XCTAssertEqual(raw.count, 16, "share key must be AES-128, not AES-256")
            XCTAssertEqual(key.base64URL.count, 22, "16 bytes base64url-unpadded is 22 chars")
            XCTAssertFalse(key.base64URL.contains("="))
            XCTAssertFalse(key.base64URL.contains("+"))
            XCTAssertFalse(key.base64URL.contains("/"))
        }
        XCTAssertThrowsError(try ShareKey(raw: Data(repeating: 0, count: 32)))
    }

    func testKeyRoundTripsThroughLinkFragment() throws {
        let key = ShareKey()
        XCTAssertEqual(try ShareKey(base64URL: key.base64URL), key)
    }

    /// Password hashing is server-side, but the app must agree on the formula
    /// to reason about it — sha256Hex(password + salt).
    func testPasswordHashFormulaMatchesServer() {
        for c in Self.fixtures.passwordCases {
            XCTAssertEqual(sha256Hex(c.password + c.salt), c.sha256Hex)
        }
    }

    func testSaltShapeMatchesWeb() {
        let salt = randomSaltBase64URL()
        XCTAssertEqual(Base64URL.decode(salt)?.count, 16)
        XCTAssertFalse(salt.contains("="))
    }
}
