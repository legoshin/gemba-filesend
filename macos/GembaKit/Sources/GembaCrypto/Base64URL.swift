import Foundation

/// base64url, no padding — the encoding the web app uses for the key in the
/// link fragment and for password salts (`toBase64Url` / `fromBase64Url` in
/// `src/lib/crypto.ts`). URL-fragment safe: `+` -> `-`, `/` -> `_`, `=` stripped.
public enum Base64URL {
    public static func encode(_ bytes: Data) -> String {
        bytes.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    /// Decodes base64url with or without padding. Returns nil on invalid input.
    public static func decode(_ string: String) -> Data? {
        var s = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while s.count % 4 != 0 { s += "=" }
        return Data(base64Encoded: s)
    }
}
