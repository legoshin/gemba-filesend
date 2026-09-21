import Foundation

/// Fetches the manifest and downloads a release, verified before it is handed back.
public struct UpdateClient: Sendable {
    public static let productionManifest = URL(string: "https://send.gemba.uk/download/version.json")!
    /// Far above any real release; a manifest announcing more is refused.
    static let maxUpdateBytes = 500 * 1024 * 1024

    public let manifestURL: URL
    public let verifier: UpdateVerifier
    let session: URLSession

    public init(manifestURL: URL = productionManifest, verifier: UpdateVerifier, session: URLSession = .shared) {
        self.manifestURL = manifestURL
        self.verifier = verifier
        self.session = session
    }

    /// HTTPS everywhere; plain HTTP only to this Mac, for testing a local server.
    /// (The signature is checked either way — this is defence in depth.)
    static func isAllowed(_ url: URL) -> Bool {
        switch url.scheme?.lowercased() {
        case "https": return true
        case "http": return ["localhost", "127.0.0.1", "::1"].contains(url.host?.lowercased() ?? "")
        case "file": return true   // tests
        default: return false
        }
    }

    public func fetchManifest() async throws -> UpdateManifest {
        guard Self.isAllowed(manifestURL) else { throw UpdateError.insecureURL(manifestURL.absoluteString) }
        var request = URLRequest(url: manifestURL, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: 20)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let data: Data
        do {
            let (body, response) = try await session.data(for: request)
            if let http = response as? HTTPURLResponse, http.statusCode != 200 {
                throw UpdateError.download("the server answered \(http.statusCode)")
            }
            data = body
        } catch let error as UpdateError {
            throw error
        } catch {
            throw UpdateError.download(error.localizedDescription)
        }
        let manifest: UpdateManifest
        do {
            manifest = try JSONDecoder().decode(UpdateManifest.self, from: data)
        } catch {
            throw UpdateError.badManifest("not valid version.json")
        }
        guard manifest.appVersion != nil else { throw UpdateError.badManifest("bad version \(manifest.version)") }
        guard manifest.size > 0, manifest.size <= Self.maxUpdateBytes else { throw UpdateError.badManifest("bad size") }
        guard Self.isAllowed(manifest.url) else { throw UpdateError.insecureURL(manifest.url.absoluteString) }
        return manifest
    }

    /// The release, when it is newer than `current` and runs on this Mac.
    public func newerRelease(than current: AppVersion,
                             system: OperatingSystemVersion = ProcessInfo.processInfo.operatingSystemVersion)
        async throws -> UpdateManifest? {
        let manifest = try await fetchManifest()
        guard let offered = manifest.appVersion, offered > current, manifest.supports(system: system) else { return nil }
        return manifest
    }

    /// Downloads the release zip into `directory` and verifies it. The returned
    /// file has passed the size, checksum and signature checks; anything that
    /// fails them is deleted.
    public func download(_ manifest: UpdateManifest, into directory: URL) async throws -> URL {
        guard Self.isAllowed(manifest.url) else { throw UpdateError.insecureURL(manifest.url.absoluteString) }
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let destination = directory.appendingPathComponent("GembaFilesend-\(manifest.version)-\(manifest.build).zip")
        try? FileManager.default.removeItem(at: destination)

        let temporary: URL
        do {
            let request = URLRequest(url: manifest.url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: 60)
            let (file, response) = try await session.download(for: request)
            if let http = response as? HTTPURLResponse, http.statusCode != 200 {
                try? FileManager.default.removeItem(at: file)
                throw UpdateError.download("the server answered \(http.statusCode)")
            }
            temporary = file
        } catch let error as UpdateError {
            throw error
        } catch {
            throw UpdateError.download(error.localizedDescription)
        }
        try FileManager.default.moveItem(at: temporary, to: destination)
        do {
            try verifier.verify(file: destination, against: manifest)
        } catch {
            try? FileManager.default.removeItem(at: destination)
            throw error
        }
        return destination
    }
}
