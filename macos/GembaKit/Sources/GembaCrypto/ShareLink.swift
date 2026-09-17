import Foundation

/// The id that names a share: 8 random bytes as 16 lowercase hex characters —
/// the same shape `generateClientId()` produces in the browser and the only
/// shape `/api/files/finalize` accepts (`/^[a-f0-9]{16}$/`).
public struct ShareID: Sendable, Equatable, CustomStringConvertible {
    public let value: String

    public init() {
        var bytes = Data(count: 8)
        _ = bytes.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 8, $0.baseAddress!) }
        self.value = bytes.map { String(format: "%02x", $0) }.joined()
    }

    public init?(_ raw: String) {
        let ok = raw.count == 16 && raw.allSatisfy { $0.isHexDigit && !$0.isUppercase }
        guard ok else { return nil }
        self.value = raw
    }

    public var description: String { value }
}

/// A finished share: one link for the whole selection, with the key only ever
/// after the `#`. The fragment is never sent to the server by any client —
/// browsers do not transmit it and this app never puts it in a request.
public struct ShareLink: Sendable, Equatable {
    public let id: ShareID
    public let key: ShareKey?
    public let passwordProtected: Bool
    public let origin: URL

    public init(id: ShareID, key: ShareKey?, passwordProtected: Bool, origin: URL) {
        self.id = id
        self.key = key
        self.passwordProtected = passwordProtected
        self.origin = origin
    }

    public var url: URL {
        var components = URLComponents(url: origin, resolvingAgainstBaseURL: false)!
        components.path = "/download"
        var query = [URLQueryItem(name: "id", value: id.value)]
        if passwordProtected { query.append(URLQueryItem(name: "pw", value: "1")) }
        components.queryItems = query
        components.fragment = key?.base64URL
        return components.url!
    }

    public var absoluteString: String { url.absoluteString }

    /// Reads a link produced by either client back into its parts.
    public init?(parsing string: String) {
        guard let components = URLComponents(string: string),
              let scheme = components.scheme, let host = components.host,
              let idRaw = components.queryItems?.first(where: { $0.name == "id" })?.value,
              let id = ShareID(idRaw)
        else { return nil }

        var originComponents = URLComponents()
        originComponents.scheme = scheme
        originComponents.host = host
        originComponents.port = components.port
        guard let origin = originComponents.url else { return nil }

        self.id = id
        self.origin = origin
        self.passwordProtected = components.queryItems?.contains { $0.name == "pw" && $0.value == "1" } ?? false
        if let fragment = components.fragment, !fragment.isEmpty {
            self.key = try? ShareKey(base64URL: fragment)
        } else {
            self.key = nil
        }
    }
}
