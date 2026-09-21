import Foundation

/// Turns a folder into a single .zip so it can travel as one file in a share.
///
/// The zip is written by `ZipWriter` — a streaming writer on the system's zlib —
/// rather than `NSFileCoordinator`'s `.forUploading`, which fails on symbolic
/// links inside the App Sandbox (see ZipWriter for the details). The archive is
/// always created inside `directory`, which the caller owns and deletes: that is
/// how the temporary zip is guaranteed to go away, on success and on failure.
public enum FolderArchiver {
    public enum ArchiveError: Error, LocalizedError {
        case notAFolder(String)
        case failed(String, Error)

        public var errorDescription: String? {
            switch self {
            case .notAFolder(let name):
                return "\(name) is not a folder."
            case .failed(let name, let error):
                return "Couldn't compress the folder \(name): \(error.localizedDescription)"
            }
        }
    }

    /// Zips `folder` into `directory` and returns the archive's URL, named
    /// `<folder>.zip`. The caller deletes it.
    public static func archive(
        folder: URL,
        into directory: URL,
        progress: ((Double) -> Void)? = nil
    ) throws -> URL {
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: folder.path, isDirectory: &isDirectory),
              isDirectory.boolValue else {
            throw ArchiveError.notAFolder(folder.lastPathComponent)
        }
        let destination = directory.appendingPathComponent(archiveName(for: folder))
        try? FileManager.default.removeItem(at: destination)
        do {
            try ZipWriter.archive(folder: folder, to: destination, progress: progress)
        } catch {
            try? FileManager.default.removeItem(at: destination)
            throw ArchiveError.failed(folder.lastPathComponent, error)
        }
        return destination
    }

    /// `Photos` → `Photos.zip`. A folder already named with a `.zip`-looking
    /// suffix still gets its own `.zip`, so the recipient's file is unambiguous.
    public static func archiveName(for folder: URL) -> String {
        let base = folder.lastPathComponent.isEmpty ? "Folder" : folder.lastPathComponent
        return base + ".zip"
    }

    /// Total bytes of the regular files under `folder` — the uncompressed size,
    /// shown before the upload starts. The zip is usually smaller.
    public static func contentSize(of folder: URL) -> Int {
        ShareItem.folderContents(folder).bytes
    }
}
