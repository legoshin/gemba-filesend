import XCTest
import CryptoKit
@testable import GembaCrypto

/// A progress sink the `@Sendable` callback can write to from any thread.
final class ProgressSink: @unchecked Sendable {
    private let lock = NSLock()
    private var values: [Double] = []
    func record(_ value: Double) { lock.lock(); values.append(value); lock.unlock() }
    var last: Double { lock.lock(); defer { lock.unlock() }; return values.last ?? -1 }
    var isMonotonic: Bool {
        lock.lock(); defer { lock.unlock() }
        return zip(values, values.dropFirst()).allSatisfy { $0 <= $1 }
    }
}

final class FileEncryptorTests: XCTestCase {
    private func tempDir() throws -> URL {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("gemba-tests-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: dir) }
        return dir
    }

    /// The file path must produce exactly the packed format — this is the path
    /// every upload actually takes.
    func testEncryptedFileMatchesThePackedFormat() throws {
        let dir = try tempDir()
        let key = ShareKey()

        for size in [0, 1, 15, 16, 17, 4095, 4096, 1_048_576, 40 * 1024 * 1024] {
            let plaintext = Data((0..<size).map { UInt8(($0 &* 31 &+ 7) % 251) })
            let source = dir.appendingPathComponent("in-\(size).bin")
            let dest = dir.appendingPathComponent("out-\(size).bin")
            try plaintext.write(to: source)

            let sink = ProgressSink()
            try FileEncryptor.encrypt(source: source, destination: dest, key: key) { sink.record($0) }
            XCTAssertEqual(sink.last, 1.0, accuracy: 0.0001, "progress must finish at 1")
            XCTAssertTrue(sink.isMonotonic, "progress must never go backwards")

            let packed = try Data(contentsOf: dest)
            XCTAssertEqual(packed.count, 12 + size + 16, "size \(size): IV + plaintext + tag")
            XCTAssertEqual(try PackedCrypto.open(packed, key: key), plaintext, "size \(size)")
        }
    }

    /// Encrypt -> decrypt through files, the way an in-app download would.
    func testFileRoundTrip() throws {
        let dir = try tempDir()
        let key = ShareKey()
        let plaintext = Data("the quick brown fox — 🦊".utf8)
        let source = dir.appendingPathComponent("source.txt")
        let encrypted = dir.appendingPathComponent("part.bin")
        let restored = dir.appendingPathComponent("restored.txt")
        try plaintext.write(to: source)

        try FileEncryptor.encrypt(source: source, destination: encrypted, key: key)
        try FileEncryptor.decrypt(source: encrypted, destination: restored, key: key)
        XCTAssertEqual(try Data(contentsOf: restored), plaintext)
    }

    func testDecryptWithTheWrongKeyFails() throws {
        let dir = try tempDir()
        let source = dir.appendingPathComponent("a.txt")
        let encrypted = dir.appendingPathComponent("a.bin")
        try Data("secret".utf8).write(to: source)
        try FileEncryptor.encrypt(source: source, destination: encrypted, key: ShareKey())
        XCTAssertThrowsError(
            try FileEncryptor.decrypt(source: encrypted,
                                      destination: dir.appendingPathComponent("out"),
                                      key: ShareKey())
        )
    }

    func testPlaintextFallbackCopiesBytesUnchanged() throws {
        let dir = try tempDir()
        let plaintext = Data("not encrypted, by explicit choice".utf8)
        let source = dir.appendingPathComponent("plain.txt")
        let dest = dir.appendingPathComponent("copy.bin")
        try plaintext.write(to: source)
        try FileEncryptor.copyPlaintext(source: source, destination: dest)
        XCTAssertEqual(try Data(contentsOf: dest), plaintext)
    }

    func testEncryptOverwritesAStalePart() throws {
        let dir = try tempDir()
        let key = ShareKey()
        let source = dir.appendingPathComponent("s.bin")
        let dest = dir.appendingPathComponent("d.bin")
        try Data(repeating: 0xAB, count: 64).write(to: source)
        try Data(repeating: 0xFF, count: 99_999).write(to: dest)
        try FileEncryptor.encrypt(source: source, destination: dest, key: key)
        XCTAssertEqual(try Data(contentsOf: dest).count, 12 + 64 + 16)
    }

    func testMemoryWarningOnlyForVeryLargeFiles() {
        XCTAssertNil(FileEncryptor.memoryWarning(forBytes: 100 * 1024 * 1024))
        XCTAssertNotNil(FileEncryptor.memoryWarning(forBytes: 4 * 1024 * 1024 * 1024))
    }
}
