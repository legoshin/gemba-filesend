import Foundation
import GembaCrypto

/// Where this app talks to. Defaults to production; overridable so the same
/// build can be pointed at a local `next dev` (which runs in fs storage mode).
public struct FilesendEndpoint: Sendable, Equatable {
    public static let production = FilesendEndpoint(origin: URL(string: "https://send.gemba.uk")!)

    public let origin: URL

    public init(origin: URL) { self.origin = origin }

    func url(_ path: String) -> URL { origin.appendingPathComponent(path) }
}

/// Which storage backend the server is running, reported by `/api/storage-mode`.
/// Production is `blob` (Vercel Blob, client-direct uploads); a dev server
/// without a blob token is `fs` (parts streamed through the API route).
public enum StorageMode: String, Sendable, Decodable {
    case blob
    case fs
}

/// The per-share settings the web upload page exposes, with the same bounds the
/// API enforces (`validateClientMeta`).
public struct ShareOptions: Sendable {
    public static let maxDownloads = 100
    public static let maxFiles = 25
    public static let maxRecipients = 10
    public static let maxBytesPerFile = 15 * 1024 * 1024 * 1024
    public static let maxExpiry: TimeInterval = 365 * 24 * 3600

    /// How many times the whole share may be downloaded (1...100).
    public var downloadLimit: Int
    /// When the share stops resolving. Must be in the future, within a year.
    public var expiresAt: Date
    /// Optional password. Only ever sent to `/api/files/finalize`, which salts
    /// and hashes it server-side — it is never part of the link.
    public var password: String?
    /// Recipients who must verify by emailed code before downloading.
    public var verifiedRecipients: [String]
    /// Email the finished link to `verifiedRecipients` via `/api/notify`.
    public var notifyRecipients: Bool
    /// Client-side encryption. `false` is the explicit, user-chosen fallback —
    /// it downgrades the entire share, exactly as the web app does.
    public var encrypt: Bool

    public init(
        downloadLimit: Int = 1,
        expiresAt: Date = Date().addingTimeInterval(24 * 3600),
        password: String? = nil,
        verifiedRecipients: [String] = [],
        notifyRecipients: Bool = false,
        encrypt: Bool = true
    ) {
        self.downloadLimit = downloadLimit
        self.expiresAt = expiresAt
        self.password = password
        self.verifiedRecipients = verifiedRecipients
        self.notifyRecipients = notifyRecipients
        self.encrypt = encrypt
    }

    var clampedDownloadLimit: Int { max(1, min(Self.maxDownloads, downloadLimit)) }
    var expiresAtMilliseconds: Int { Int(expiresAt.timeIntervalSince1970 * 1000) }

    /// Local mirror of the server's `validateClientMeta`, so a bad combination
    /// fails before anything is encrypted or uploaded.
    func validate(fileCount: Int, largestFile: Int) throws {
        guard fileCount >= 1 else { throw UploadError.noFiles }
        guard fileCount <= Self.maxFiles else { throw UploadError.tooManyFiles(fileCount) }
        guard largestFile <= Self.maxBytesPerFile else { throw UploadError.fileTooLarge }
        guard expiresAt > Date() else { throw UploadError.invalidExpiry }
        guard expiresAt.timeIntervalSinceNow <= Self.maxExpiry else { throw UploadError.invalidExpiry }
        guard verifiedRecipients.count <= Self.maxRecipients else { throw UploadError.tooManyRecipients }
        for email in verifiedRecipients where !Self.looksLikeEmail(email) {
            throw UploadError.invalidRecipient(email)
        }
        if notifyRecipients && verifiedRecipients.isEmpty { throw UploadError.notifyWithoutRecipients }
    }

    /// Mirrors the server's `EMAIL_RE` — deliberately the same loose check, so
    /// the app never rejects an address the API would accept or vice versa.
    public static func looksLikeEmail(_ s: String) -> Bool {
        s.count <= 254 && s.range(of: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", options: .regularExpression) != nil
    }

    func normalizedRecipients() -> [String] {
        verifiedRecipients.map { $0.trimmingCharacters(in: .whitespaces).lowercased() }
    }
}

/// One file — or one folder — queued for a share.
///
/// A folder travels as a single `.zip`: the uploader compresses it into its own
/// temporary directory just before encrypting, and deletes it afterwards. So a
/// folder item's `name` is already the name the recipient will see
/// (`Photos.zip`), while `displayName` is what the sender picked (`Photos`).
public struct ShareItem: Sendable, Identifiable, Equatable {
    public let id: UUID
    public let url: URL
    /// The name the recipient receives. For a folder, `<folder>.zip`.
    public let name: String
    /// The name to show the sender.
    public let displayName: String
    /// Bytes. For a folder, the total of the files inside — the zip is usually
    /// smaller, and its real size is only known once it has been made.
    public let size: Int
    public let contentType: String
    public let isFolder: Bool
    /// Number of files inside, for a folder. Zero for a file.
    public let fileCount: Int

    public init(url: URL) {
        self.id = UUID()
        self.url = url
        var isDirectory: ObjCBool = false
        let exists = FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory)
        // A package (.app, .pages, .bundle) is a directory on disk, and zipping
        // it is exactly right — sending its insides one by one would not be.
        self.isFolder = exists && isDirectory.boolValue
        self.displayName = url.lastPathComponent
        if isFolder {
            self.name = FolderArchiver.archiveName(for: url)
            let (bytes, count) = ShareItem.folderContents(url)
            self.size = bytes
            self.fileCount = count
            self.contentType = "application/zip"
        } else {
            self.name = url.lastPathComponent
            let attrs = try? FileManager.default.attributesOfItem(atPath: url.path)
            self.size = (attrs?[.size] as? Int) ?? 0
            self.fileCount = 0
            self.contentType = ShareItem.mimeType(for: url)
        }
    }

    static func mimeType(for url: URL) -> String {
        if let type = UTTypeMIME(url) { return type }
        return "application/octet-stream"
    }

    static func folderContents(_ folder: URL) -> (bytes: Int, files: Int) {
        guard let enumerator = FileManager.default.enumerator(
            at: folder,
            includingPropertiesForKeys: [.fileSizeKey, .isRegularFileKey],
            options: [],
            errorHandler: { _, _ in true }
        ) else { return (0, 0) }
        var bytes = 0
        var files = 0
        for case let child as URL in enumerator {
            let values = try? child.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
            if values?.isRegularFile == true {
                bytes += values?.fileSize ?? 0
                files += 1
            }
        }
        return (bytes, files)
    }
}

import UniformTypeIdentifiers

private func UTTypeMIME(_ url: URL) -> String? {
    guard let type = UTType(filenameExtension: url.pathExtension) else { return nil }
    return type.preferredMIMEType
}

/// The finished share, ready to show and copy.
public struct ShareResult: Sendable {
    public let link: ShareLink
    public let encrypted: Bool
    public let files: [ShareItem]
    public let notified: Bool
    /// Set when the upload succeeded but emailing the link did not — the share
    /// is still valid, so this never fails the upload.
    public let notifyError: String?

    public init(
        link: ShareLink,
        encrypted: Bool,
        files: [ShareItem],
        notified: Bool,
        notifyError: String?
    ) {
        self.link = link
        self.encrypted = encrypted
        self.files = files
        self.notified = notified
        self.notifyError = notifyError
    }

    public var absoluteString: String { link.absoluteString }
}
