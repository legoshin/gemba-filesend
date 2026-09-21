import Foundation
import GembaCrypto

/// What the UI is doing right now, so one progress bar can tell the truth about
/// a multi-file share instead of jumping back to zero.
public enum UploadPhase: Sendable, Equatable {
    case idle
    case preparing
    case compressing(folder: String)
    case encrypting(file: String, index: Int, of: Int)
    case uploading(file: String, index: Int, of: Int)
    case finalizing
    case notifying
    case done

    public var label: String {
        switch self {
        case .idle: return ""
        case .preparing: return "Preparing…"
        case .compressing(let folder): return "Compressing \(folder)…"
        case .encrypting(let name, let i, let n):
            return n > 1 ? "Encrypting \(name) (\(i + 1) of \(n))…" : "Encrypting \(name)…"
        case .uploading(let name, let i, let n):
            return n > 1 ? "Uploading \(name) (\(i + 1) of \(n))…" : "Uploading \(name)…"
        case .finalizing: return "Finalizing…"
        case .notifying: return "Emailing the link…"
        case .done: return "Done"
        }
    }
}

public struct UploadProgress: Sendable, Equatable {
    public let phase: UploadPhase
    /// 0...1 across the whole share, weighted by file size — not per-file.
    public let fraction: Double

    public init(phase: UploadPhase, fraction: Double) {
        self.phase = phase
        self.fraction = fraction
    }
}

/// What to do when encryption fails on one file. The web app asks rather than
/// silently sending plaintext, and so does this.
public enum EncryptionFallback: Sendable {
    case retry
    case uploadUnencrypted
    case cancel
}

/// Runs a whole share end to end: one id, one key, N encrypted parts, one
/// finalize, one link.
///
/// Ordering and ownership follow the web app exactly, because the server
/// depends on it: part uploads write no metadata, `/api/files/finalize` writes
/// the single meta record and seeds the single download counter, and the key is
/// generated here and leaves only inside the link fragment.
public actor ShareUploader {
    private let endpoint: FilesendEndpoint
    private let session: URLSession
    private let api: FilesendAPI
    private let blob: BlobClient

    public init(endpoint: FilesendEndpoint = .production, session: URLSession? = nil) {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 60
        configuration.timeoutIntervalForResource = 24 * 3600
        configuration.waitsForConnectivity = true
        let resolved = session ?? URLSession(configuration: configuration)
        self.endpoint = endpoint
        self.session = resolved
        self.api = FilesendAPI(endpoint: endpoint, session: resolved)
        self.blob = BlobClient(endpoint: endpoint, session: resolved)
    }

    public func upload(
        items: [ShareItem],
        options: ShareOptions,
        onProgress: @escaping @Sendable (UploadProgress) -> Void,
        onEncryptionFailure: @Sendable (String, Error) async -> EncryptionFallback = { _, _ in .cancel }
    ) async throws -> ShareResult {
        try options.validate(fileCount: items.count, largestFile: items.map(\.size).max() ?? 0)

        onProgress(UploadProgress(phase: .preparing, fraction: 0))
        let mode = try await api.storageMode()

        // One id and one key for the whole selection. The key is created here and
        // the only place it ever goes is the link fragment.
        let id = ShareID()
        let key = ShareKey()

        let workDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("gemba-filesend-\(id.value)", isDirectory: true)
        try FileManager.default.createDirectory(at: workDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: workDir) }

        // Folders become one .zip each, made inside `workDir` — which the defer
        // above deletes on every exit path, success or failure. So the temporary
        // archive cannot outlive the upload. Each gets its own subdirectory so
        // two folders that share a name ("Photos" from two places) don't collide.
        // Compressing takes the first fifth of the bar when there is a folder,
        // and everything after is scaled into the rest — so the bar only ever
        // moves forward across phases.
        let compressShare = items.contains(where: \.isFolder) ? 0.2 : 0
        let resolved = try resolve(items, into: workDir) { progress in
            onProgress(UploadProgress(phase: progress.phase, fraction: progress.fraction * compressShare))
        }
        let outerProgress = onProgress
        let onProgress: @Sendable (UploadProgress) -> Void = { progress in
            outerProgress(UploadProgress(phase: progress.phase,
                                         fraction: compressShare + progress.fraction * (1 - compressShare)))
        }
        let totalBytes = max(1, resolved.reduce(0) { $0 + $1.size })
        var encryptShare = options.encrypt
        var blobUrls: [String] = []

        // The whole loop restarts if the user chooses the unencrypted fallback:
        // a share has one key and one `encrypted` flag, so it can never be a
        // mix of encrypted and plaintext files.
        restart: while true {
            blobUrls = Array(repeating: "", count: items.count)
            var completedBytes = 0

            for (index, item) in resolved.enumerated() {
                let part = workDir.appendingPathComponent("\(index).part")
                // Captured as constants: the progress closures run concurrently,
                // so they cannot read the loop's running byte counter.
                let fileWeight = Double(max(item.size, 1)) / Double(totalBytes)
                let base = Double(completedBytes) / Double(totalBytes)
                let name = item.name
                let count = items.count

                var prepared = false
                while !prepared {
                    onProgress(UploadProgress(
                        phase: .encrypting(file: name, index: index, of: count),
                        fraction: base
                    ))
                    do {
                        if encryptShare {
                            try FileEncryptor.encrypt(source: item.source, destination: part, key: key) { p in
                                // Encryption is charged half of a file's share of the bar,
                                // upload the other half — so the bar never stalls or rewinds.
                                onProgress(UploadProgress(
                                    phase: .encrypting(file: name, index: index, of: count),
                                    fraction: base + fileWeight * p * 0.5
                                ))
                            }
                        } else {
                            try FileEncryptor.copyPlaintext(source: item.source, destination: part)
                        }
                        prepared = true
                    } catch {
                        switch await onEncryptionFailure(item.name, error) {
                        case .retry:
                            continue
                        case .uploadUnencrypted:
                            encryptShare = false
                            continue restart
                        case .cancel:
                            throw error
                        }
                    }
                }

                let reporter = ProgressReporter { p in
                    onProgress(UploadProgress(
                        phase: .uploading(file: name, index: index, of: count),
                        fraction: base + fileWeight * (0.5 + p * 0.5)
                    ))
                }
                onProgress(UploadProgress(
                    phase: .uploading(file: name, index: index, of: count),
                    fraction: base + fileWeight * 0.5
                ))

                switch mode {
                case .blob:
                    let pathname = "gemba/blob/\(id.value)/\(index)"
                    // Only the share id, index, count and part size — the shared
                    // metadata (password/expiry/recipients) goes to finalize, and
                    // the key goes nowhere.
                    let partSize = (try? FileManager.default
                        .attributesOfItem(atPath: part.path)[.size] as? Int) ?? nil
                    let clientPayload = try JSONSerialization.data(withJSONObject: [
                        "finalize": true,
                        "id": id.value,
                        "index": index,
                        "total": items.count,
                        "size": partSize ?? item.size,
                    ])
                    let token = try await blob.clientToken(
                        pathname: pathname,
                        clientPayload: String(data: clientPayload, encoding: .utf8) ?? "{}"
                    )
                    blobUrls[index] = try await blob.put(
                        fileURL: part, pathname: pathname, clientToken: token, progress: reporter
                    )
                case .fs:
                    try await api.uploadPart(
                        fileURL: part, id: id, index: index, total: items.count, progress: reporter
                    )
                }

                try? FileManager.default.removeItem(at: part)
                // The folder's zip has done its job once its encrypted part is up;
                // free the disk now rather than at the end of a long share.
                if item.isTemporary { try? FileManager.default.removeItem(at: item.source) }
                completedBytes += max(item.size, 1)
            }
            break
        }

        onProgress(UploadProgress(phase: .finalizing, fraction: 1))
        try await api.finalize(
            id: id,
            files: resolved.enumerated().map { index, item in
                FilesendAPI.FinalizeFile(
                    name: item.name,
                    type: item.contentType,
                    size: item.size,
                    blobUrl: mode == .blob ? blobUrls[index] : nil
                )
            },
            options: options,
            encrypted: encryptShare
        )

        let link = ShareLink(
            id: id,
            key: encryptShare ? key : nil,
            passwordProtected: !(options.password ?? "").isEmpty,
            origin: endpoint.origin
        )

        var notified = false
        var notifyError: String?
        let recipients = options.normalizedRecipients()
        if options.notifyRecipients && !recipients.isEmpty {
            onProgress(UploadProgress(phase: .notifying, fraction: 1))
            // Isolated: the share already exists and the link already works, so
            // a mail failure is reported but never rolls the upload back.
            do {
                let label = items.count > 1 ? "\(items.count) files" : items[0].name
                try await api.notify(recipients: recipients, fileName: label, link: link.absoluteString)
                notified = true
            } catch {
                notifyError = error.localizedDescription
            }
        }

        onProgress(UploadProgress(phase: .done, fraction: 1))
        return ShareResult(
            link: link,
            encrypted: encryptShare,
            files: items,
            notified: notified,
            notifyError: notifyError
        )
    }

    /// A file as it will actually be uploaded: the original, or a folder's
    /// temporary zip.
    struct ResolvedItem: Sendable {
        let source: URL
        let name: String
        let size: Int
        let contentType: String
        let isTemporary: Bool
    }

    func resolve(
        _ items: [ShareItem],
        into workDir: URL,
        onProgress: @escaping @Sendable (UploadProgress) -> Void
    ) throws -> [ResolvedItem] {
        let folderBytes = max(1, items.filter(\.isFolder).reduce(0) { $0 + $1.size })
        var doneFolderBytes = 0
        var resolved: [ResolvedItem] = []
        for (index, item) in items.enumerated() {
            guard item.isFolder else {
                resolved.append(ResolvedItem(
                    source: item.url, name: item.name, size: item.size,
                    contentType: item.contentType, isTemporary: false
                ))
                continue
            }
            let phase = UploadPhase.compressing(folder: item.displayName)
            let before = Double(doneFolderBytes)
            let weight = Double(max(item.size, 1))
            onProgress(UploadProgress(phase: phase, fraction: before / Double(folderBytes)))
            let slot = workDir.appendingPathComponent("folder-\(index)", isDirectory: true)
            try FileManager.default.createDirectory(at: slot, withIntermediateDirectories: true)
            let zip = try FolderArchiver.archive(folder: item.url, into: slot) { p in
                onProgress(UploadProgress(phase: phase, fraction: (before + weight * p) / Double(folderBytes)))
            }
            doneFolderBytes += max(item.size, 1)
            let size = (try? FileManager.default.attributesOfItem(atPath: zip.path)[.size] as? Int) ?? 0
            // The estimate that passed validation was the uncompressed size; the
            // real limit applies to what is actually sent.
            guard size <= ShareOptions.maxBytesPerFile else { throw UploadError.fileTooLarge }
            resolved.append(ResolvedItem(
                source: zip, name: item.name, size: size,
                contentType: "application/zip", isTemporary: true
            ))
        }
        return resolved
    }
}
