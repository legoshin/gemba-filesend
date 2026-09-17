import Foundation
import GembaCrypto
import GembaUpload

/// A command-line front end to the same upload core the app uses.
///
/// It exists mainly as the end-to-end check: it runs the real flow against a
/// real server and prints the link, so the interop claim can be tested rather
/// than asserted. It is also genuinely useful for scripting a send.
///
///   swift run gemba-send file.pdf [more files…]
///     --origin https://send.gemba.uk   which server to talk to
///     --expires-in 3600                seconds until the share expires
///     --downloads 1                    how many times it may be downloaded
///     --password secret                require a password to download
///     --plaintext                      upload without encryption (explicit)
///
struct CLI {
    static func run() async -> Int32 {
        var files: [URL] = []
        var origin = FilesendEndpoint.production.origin
        var expiresIn: TimeInterval = 3600
        var downloads = 1
        var password: String?
        var encrypt = true

        var arguments = Array(CommandLine.arguments.dropFirst())
        while let argument = arguments.first {
            arguments.removeFirst()
            switch argument {
            case "--origin":
                guard let value = arguments.first, let url = URL(string: value) else { return fail("--origin needs a URL") }
                origin = url; arguments.removeFirst()
            case "--expires-in":
                guard let value = arguments.first, let seconds = TimeInterval(value) else { return fail("--expires-in needs seconds") }
                expiresIn = seconds; arguments.removeFirst()
            case "--downloads":
                guard let value = arguments.first, let count = Int(value) else { return fail("--downloads needs a number") }
                downloads = count; arguments.removeFirst()
            case "--password":
                guard let value = arguments.first else { return fail("--password needs a value") }
                password = value; arguments.removeFirst()
            case "--plaintext":
                encrypt = false
            case "--help", "-h":
                print(usage); return 0
            default:
                files.append(URL(fileURLWithPath: argument))
            }
        }

        guard !files.isEmpty else { print(usage); return 1 }

        let uploader = ShareUploader(endpoint: FilesendEndpoint(origin: origin))
        let options = ShareOptions(
            downloadLimit: downloads,
            expiresAt: Date().addingTimeInterval(expiresIn),
            password: password,
            encrypt: encrypt
        )
        do {
            let result = try await uploader.upload(
                items: files.map { ShareItem(url: $0) },
                options: options,
                onProgress: { progress in
                    let percent = Int((progress.fraction * 100).rounded())
                    FileHandle.standardError.write(Data("\r\(progress.phase.label) \(percent)%   ".utf8))
                }
            )
            FileHandle.standardError.write(Data("\n".utf8))
            print(result.absoluteString)
            return 0
        } catch {
            FileHandle.standardError.write(Data("\n\(error.localizedDescription)\n".utf8))
            return 1
        }
    }

    static func fail(_ message: String) -> Int32 {
        FileHandle.standardError.write(Data("\(message)\n".utf8))
        return 2
    }

    static let usage = """
    usage: gemba-send [options] <file> [file…]

      --origin <url>        server to upload to (default https://send.gemba.uk)
      --expires-in <secs>   share lifetime in seconds (default 3600)
      --downloads <n>       downloads allowed (default 1)
      --password <value>    require a password on the download page
      --plaintext           upload without encryption, explicitly

    Prints the share link on stdout; progress goes to stderr.
    """
}

exit(await CLI.run())
