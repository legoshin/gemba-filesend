import Foundation

/// A native reimplementation of the parts of `@vercel/blob/client` that the
/// upload path uses. The web app calls `upload()` from that package; there is no
/// Swift equivalent, so this speaks the same two-step protocol directly:
///
///   1. POST the app's own `/api/files` with a `blob.generate-client-token`
///      event. The route's `onBeforeGenerateToken` scopes the token to one
///      share prefix and returns a short-lived client token.
///   2. PUT the bytes straight to the Blob API with that token. The file never
///      passes through the app's server.
///
/// Deliberately *not* multipart: the web uses multipart because a browser tab
/// can die mid-upload, while URLSession uploads from a file on disk and the
/// single PUT keeps the client small. The resulting blob is identical.
public struct BlobClient: Sendable {
    /// Matches `defaultVercelBlobApiUrl` in @vercel/blob.
    static let apiURL = URL(string: "https://vercel.com/api/blob")!
    /// Matches `BLOB_API_VERSION` in @vercel/blob 2.x. Bump only alongside that.
    static let apiVersion = "12"

    let session: URLSession
    let endpoint: FilesendEndpoint

    public init(endpoint: FilesendEndpoint, session: URLSession = .shared) {
        self.endpoint = endpoint
        self.session = session
    }

    struct ClientTokenResponse: Decodable {
        let type: String?
        let clientToken: String
    }

    /// Step 1 — ask our own API to mint a token scoped to `pathname`.
    func clientToken(pathname: String, clientPayload: String) async throws -> String {
        var request = URLRequest(url: endpoint.url("api/files"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        let event: [String: Any] = [
            "type": "blob.generate-client-token",
            "payload": [
                "pathname": pathname,
                "clientPayload": clientPayload,
                "multipart": false,
            ],
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: event)

        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            throw UploadError.clientTokenRejected(Self.errorMessage(from: data, status: status))
        }
        guard let decoded = try? JSONDecoder().decode(ClientTokenResponse.self, from: data) else {
            throw UploadError.malformedResponse("the client-token handshake")
        }
        return decoded.clientToken
    }

    struct PutResponse: Decodable {
        let url: String
        let pathname: String?
        let contentType: String?
    }

    /// Step 2 — PUT the encrypted part straight to Blob storage.
    func put(
        fileURL: URL,
        pathname: String,
        clientToken: String,
        access: String = "private",
        contentType: String = "application/octet-stream",
        progress: ProgressReporter?
    ) async throws -> String {
        var components = URLComponents(url: Self.apiURL, resolvingAgainstBaseURL: false)!
        components.path += "/"
        components.queryItems = [URLQueryItem(name: "pathname", value: pathname)]

        var request = URLRequest(url: components.url!)
        request.httpMethod = "PUT"
        request.setValue("Bearer \(clientToken)", forHTTPHeaderField: "authorization")
        request.setValue(Self.apiVersion, forHTTPHeaderField: "x-api-version")
        request.setValue(Self.storeID(from: clientToken), forHTTPHeaderField: "x-vercel-blob-store-id")
        request.setValue(access, forHTTPHeaderField: "x-vercel-blob-access")
        request.setValue(contentType, forHTTPHeaderField: "x-content-type")
        request.setValue(UUID().uuidString, forHTTPHeaderField: "x-api-blob-request-id")
        request.setValue("0", forHTTPHeaderField: "x-api-blob-request-attempt")

        let (data, response) = try await session.upload(
            for: request, fromFile: fileURL, delegate: progress
        )
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let (code, message) = Self.blobError(from: data)
            throw UploadError.blobRejected(code: code, message: message)
        }
        guard let decoded = try? JSONDecoder().decode(PutResponse.self, from: data) else {
            throw UploadError.malformedResponse("the blob upload")
        }
        return decoded.url
    }

    /// Client tokens look like `vercel_blob_client_<storeId>_<random>`; the API
    /// wants the store id as its own header (it isn't encoded in the token).
    static func storeID(from token: String) -> String {
        let parts = token.split(separator: "_", omittingEmptySubsequences: false)
        return parts.count > 3 ? String(parts[3]) : ""
    }

    static func blobError(from data: Data) -> (String, String) {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let error = object["error"] as? [String: Any]
        else { return ("unknown_error", String(data: data, encoding: .utf8) ?? "") }
        return (error["code"] as? String ?? "unknown_error", error["message"] as? String ?? "")
    }

    static func errorMessage(from data: Data, status: Int) -> String {
        if let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let message = object["error"] as? String {
            return message
        }
        let body = String(data: data, encoding: .utf8) ?? ""
        return body.isEmpty ? "HTTP \(status)" : body
    }
}

/// Bridges URLSession's byte counters to an async progress callback.
public final class ProgressReporter: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    private let onProgress: @Sendable (Double) -> Void

    public init(onProgress: @escaping @Sendable (Double) -> Void) {
        self.onProgress = onProgress
    }

    public func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didSendBodyData bytesSent: Int64,
        totalBytesSent: Int64,
        totalBytesExpectedToSend: Int64
    ) {
        guard totalBytesExpectedToSend > 0 else { return }
        onProgress(min(1, Double(totalBytesSent) / Double(totalBytesExpectedToSend)))
    }
}
