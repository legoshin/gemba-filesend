import Foundation

/// Encrypts a file on disk into the packed wire format.
///
/// The wire contract is one AES-128-GCM blob per file — `[IV][ciphertext][tag]`
/// over the *whole* file — because that is what the browser's `decryptPacked`
/// expects. GCM over a whole file cannot be chunked without changing that
/// format, and the platform offers no incremental AES-GCM that this app can
/// use: CommonCrypto's GCM entry points are gone from the current SDK, and
/// CryptoKit's in-place `seal` is macOS 27+ while this app targets macOS 14.
/// Third-party crypto is deliberately out of scope. So encryption is one-shot,
/// with two things done to keep it as cheap as it can be:
///
///   - the plaintext is memory-mapped rather than read into a heap buffer, so
///     the kernel pages it in and out instead of the app holding a full copy;
///   - the ciphertext is written straight to a temp file and uploaded from
///     disk, so it is not also held in memory during the upload.
///
/// Peak memory is therefore about one ciphertext, against the browser's three
/// full copies — the Mac app can send files the web app cannot.
public enum FileEncryptor {
    /// Above this, `encrypt` reports the memory cost up front via `memoryWarning`.
    /// Not a hard limit — the server's per-file cap is 15 GB.
    public static let comfortableSizeLimit = 2 * 1024 * 1024 * 1024

    /// Returns a sentence to show the user when a file is large enough that the
    /// one-shot encryption will be felt, or nil when there is nothing to say.
    public static func memoryWarning(forBytes bytes: Int) -> String? {
        guard bytes > comfortableSizeLimit else { return nil }
        let gb = Double(bytes) / 1_073_741_824
        return String(
            format: "This file is %.1f GB. It has to be encrypted as one piece, "
                  + "so expect that much memory to be used while it is prepared.",
            gb
        )
    }

    /// Encrypts `source` to `destination`, reporting 0...1 progress.
    /// `destination` is overwritten if present.
    public static func encrypt(
        source: URL,
        destination: URL,
        key: ShareKey,
        progress: (@Sendable (Double) -> Void)? = nil
    ) throws {
        progress?(0)
        let plaintext: Data
        do {
            plaintext = try Data(contentsOf: source, options: .mappedIfSafe)
        } catch {
            throw EncryptionError.sealFailed("could not read \(source.lastPathComponent): \(error.localizedDescription)")
        }
        // Everything below is a single atomic call with no progress of its own —
        // the same reason the web app reports progress on the read, not the seal.
        progress?(0.5)
        let packed = try PackedCrypto.seal(plaintext, key: key)
        do {
            try packed.write(to: destination, options: .atomic)
        } catch {
            throw EncryptionError.sealFailed("could not write the encrypted part: \(error.localizedDescription)")
        }
        progress?(1)
    }

    /// Copies `source` to `destination` unchanged — the explicit
    /// "upload without encryption" fallback, on the same code path so the
    /// uploader always receives a file URL either way.
    public static func copyPlaintext(
        source: URL,
        destination: URL,
        progress: (@Sendable (Double) -> Void)? = nil
    ) throws {
        if FileManager.default.fileExists(atPath: destination.path) {
            try FileManager.default.removeItem(at: destination)
        }
        try FileManager.default.copyItem(at: source, to: destination)
        progress?(1)
    }

    /// Decrypts a packed part back to plaintext on disk. Used by the round-trip
    /// self-check and by any future in-app download.
    public static func decrypt(source: URL, destination: URL, key: ShareKey) throws {
        let packed = try Data(contentsOf: source, options: .mappedIfSafe)
        let plaintext = try PackedCrypto.open(packed, key: key)
        try plaintext.write(to: destination, options: .atomic)
    }
}
