import Foundation
import GembaCrypto

/// The app's own HTTP surface: storage mode, fs-mode part uploads, finalize,
/// and notify. Mirrors `src/app/api/**` exactly — including the rule that the
/// share key never appears in any request body.
struct FilesendAPI: Sendable {
    let endpoint: FilesendEndpoint
    let session: URLSession

    struct StorageModeResponse: Decodable { let mode: StorageMode }

    func storageMode() async throws -> StorageMode {
        var request = URLRequest(url: endpoint.url("api/storage-mode"))
        request.httpMethod = "GET"
        let (data, response) = try await session.data(for: request)
        try Self.check(response, data: data, endpoint: "/api/storage-mode")
        guard let decoded = try? JSONDecoder().decode(StorageModeResponse.self, from: data) else {
            throw UploadError.malformedResponse("/api/storage-mode")
        }
        return decoded.mode
    }

    /// fs (dev) mode: stream one already-encrypted part to `POST /api/files`
    /// with the part headers, so it lands at `{id}/{index}.bin` and finalize
    /// still owns the single meta write.
    func uploadPart(
        fileURL: URL,
        id: ShareID,
        index: Int,
        total: Int,
        progress: ProgressReporter?
    ) async throws {
        var request = URLRequest(url: endpoint.url("api/files"))
        request.httpMethod = "POST"
        request.setValue(id.value, forHTTPHeaderField: "x-file-id")
        request.setValue(String(index), forHTTPHeaderField: "x-file-index")
        request.setValue(String(total), forHTTPHeaderField: "x-file-total")
        request.setValue("application/octet-stream", forHTTPHeaderField: "content-type")
        let (data, response) = try await session.upload(for: request, fromFile: fileURL, delegate: progress)
        try Self.check(response, data: data, endpoint: "/api/files")
    }

    struct FinalizeFile: Encodable {
        let name: String
        let type: String
        let size: Int
        let blobUrl: String?
    }

    /// Writes the one meta record and seeds the one download counter for the
    /// whole share. Claim-once on the server: a second call for the same id is
    /// a 409, never an overwrite.
    func finalize(
        id: ShareID,
        files: [FinalizeFile],
        options: ShareOptions,
        encrypted: Bool
    ) async throws {
        let body = try FinalizeBodyBuilder.build(id: id, files: files, options: options, encrypted: encrypted)

        var request = URLRequest(url: endpoint.url("api/files/finalize"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        if (response as? HTTPURLResponse)?.statusCode == 409 { throw UploadError.shareAlreadyExists }
        try Self.check(response, data: data, endpoint: "/api/files/finalize")
    }

    /// Emails the finished link. The server requires the link's origin to match
    /// its own, and the link necessarily carries the key fragment — this is the
    /// one path where the key reaches the server, exactly as on the web.
    func notify(recipients: [String], fileName: String, link: String) async throws {
        var request = URLRequest(url: endpoint.url("api/notify"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "recipients": recipients,
            "links": [["fileName": fileName, "url": link]],
        ])
        let (data, response) = try await session.data(for: request)
        try Self.check(response, data: data, endpoint: "/api/notify")
    }

    static func check(_ response: URLResponse, data: Data, endpoint: String) throws {
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            var body = String(data: data, encoding: .utf8) ?? ""
            if let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let message = object["error"] as? String {
                body = message
            }
            throw UploadError.server(status: status, body: String(body.prefix(200)), endpoint: endpoint)
        }
    }
}

/// The finalize request body, built in one pure place so a test can assert what
/// leaves this machine — above all that no key material is in it.
enum FinalizeBodyBuilder {
    static func build(
        id: ShareID,
        files: [FilesendAPI.FinalizeFile],
        options: ShareOptions,
        encrypted: Bool
    ) throws -> [String: Any] {
        var body: [String: Any] = [
            "id": id.value,
            "files": files.map { file -> [String: Any] in
                var entry: [String: Any] = ["name": file.name, "type": file.type, "size": file.size]
                if let blobUrl = file.blobUrl { entry["blobUrl"] = blobUrl }
                return entry
            },
            "downloadsRemaining": options.clampedDownloadLimit,
            "expiresAt": options.expiresAtMilliseconds,
        ]
        if let password = options.password, !password.isEmpty { body["password"] = password }
        let recipients = options.normalizedRecipients()
        if !recipients.isEmpty { body["recipientEmails"] = recipients }
        // The server treats a missing `encrypted` as encrypted; only an explicit
        // false marks the user-chosen unencrypted fallback.
        if !encrypted { body["encrypted"] = false }
        return body
    }
}
