import Foundation

public enum UploadError: Error, LocalizedError, Sendable {
    case noFiles
    case tooManyFiles(Int)
    case fileTooLarge
    case invalidExpiry
    case tooManyRecipients
    case invalidRecipient(String)
    case notifyWithoutRecipients
    case server(status: Int, body: String, endpoint: String)
    case malformedResponse(String)
    case clientTokenRejected(String)
    case blobRejected(code: String, message: String)
    case shareAlreadyExists
    case cancelled

    public var errorDescription: String? {
        switch self {
        case .noFiles: return "Add at least one file."
        case .tooManyFiles(let n): return "A share can hold at most 25 files — you picked \(n)."
        case .fileTooLarge: return "That file is larger than the 15 GB per-file limit."
        case .invalidExpiry: return "Expiry must be in the future and within a year."
        case .tooManyRecipients: return "At most 10 recipients per share."
        case .invalidRecipient(let e): return "\(e) doesn't look like an email address."
        case .notifyWithoutRecipients: return "Add a recipient, or turn off emailing the link."
        case .server(let status, let body, let endpoint):
            return "\(endpoint) failed (HTTP \(status))\(body.isEmpty ? "" : ": \(body)")"
        case .malformedResponse(let what): return "Unexpected response from \(what)."
        case .clientTokenRejected(let m): return "Upload was not authorized: \(m)"
        case .blobRejected(let code, let message):
            return "Storage rejected the upload (\(code))\(message.isEmpty ? "" : ": \(message)")"
        case .shareAlreadyExists:
            return "That share id is already taken. Try the upload again."
        case .cancelled: return "Upload cancelled."
        }
    }
}
