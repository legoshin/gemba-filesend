import Foundation

/// Turns a folder into a single .zip so it can travel as one file in a share.
///
/// Uses `NSFileCoordinator`'s `.forUploading` read, which is how Finder's own
/// "Compress" works: the system writes a standard zip of the directory to a
/// temporary location and hands it over for the duration of the accessor. No
/// subprocess and no third-party code, so it works unchanged inside the
/// sandboxed Share Extension, and the result opens with Finder, Windows
/// Explorer and `unzip` alike.
///
/// The archive the system produces lives only inside the accessor block, so it
/// is moved into `directory` — which the caller owns and deletes. That is how
/// the temporary zip is guaranteed to go away: it is only ever created inside
/// the uploader's own working directory, removed on success and on failure.
public enum FolderArchiver {
    public enum ArchiveError: Error, LocalizedError {
        case notAFolder(String)
        case coordinationFailed(String, Error)
        case archiveMissing(String)
        case moveFailed(String, Error)

        public var errorDescription: String? {
            switch self {
            case .notAFolder(let name):
                return "\(name) is not a folder."
            case .coordinationFailed(let name, let error):
                return "Couldn't read the folder \(name): \(error.localizedDescription)"
            case .archiveMissing(let name):
                return "Compressing \(name) produced no archive."
            case .moveFailed(let name, let error):
                return "Couldn't store the compressed copy of \(name): \(error.localizedDescription)"
            }
        }
    }

    /// Zips `folder` into `directory` and returns the archive's URL, named
    /// `<folder>.zip`. The caller deletes it.
    public static func archive(folder: URL, into directory: URL) throws -> URL {
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: folder.path, isDirectory: &isDirectory),
              isDirectory.boolValue else {
            throw ArchiveError.notAFolder(folder.lastPathComponent)
        }

        let destination = directory.appendingPathComponent(archiveName(for: folder))
        try? FileManager.default.removeItem(at: destination)

        var coordinationError: NSError?
        var innerError: Error?
        NSFileCoordinator().coordinate(
            readingItemAt: folder,
            options: [.forUploading],
            error: &coordinationError
        ) { zipped in
            // `zipped` is the system's temporary archive; it vanishes when this
            // block returns, so move it out now.
            do {
                guard FileManager.default.fileExists(atPath: zipped.path) else {
                    innerError = ArchiveError.archiveMissing(folder.lastPathComponent)
                    return
                }
                try FileManager.default.moveItem(at: zipped, to: destination)
            } catch {
                // The system's temp file may be on another volume, where a move
                // is not allowed; copy instead.
                do {
                    try FileManager.default.copyItem(at: zipped, to: destination)
                } catch {
                    innerError = ArchiveError.moveFailed(folder.lastPathComponent, error)
                }
            }
        }
        if let coordinationError {
            throw ArchiveError.coordinationFailed(folder.lastPathComponent, coordinationError)
        }
        if let innerError { throw innerError }
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
