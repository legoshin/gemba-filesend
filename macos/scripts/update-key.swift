#!/usr/bin/env swift
// The Ed25519 key that signs app updates.
//
//   swift scripts/update-key.swift generate     make the key (once, ever)
//   swift scripts/update-key.swift public       print the public key (base64)
//   swift scripts/update-key.swift sign <file>  print a base64 signature of <file>
//
// The private key lives OUTSIDE the repo, at
//   ~/.config/gemba-filesend/update-signing.key   (override: GEMBA_UPDATE_KEY)
// readable only by you. Back it up somewhere safe: every installed copy of the
// app trusts exactly this key, so losing it means shipping the next version by
// hand (the DMG or install.sh), and leaking it means someone else could sign an
// update. The public half goes in GembaFilesend/Info.plist (GembaUpdatePublicKey).
import CryptoKit
import Foundation

let keyPath = ProcessInfo.processInfo.environment["GEMBA_UPDATE_KEY"]
    ?? (NSHomeDirectory() + "/.config/gemba-filesend/update-signing.key")

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data("error: \(message)\n".utf8))
    exit(1)
}

func loadKey() -> Curve25519.Signing.PrivateKey {
    guard let text = try? String(contentsOfFile: keyPath, encoding: .utf8),
          let raw = Data(base64Encoded: text.trimmingCharacters(in: .whitespacesAndNewlines)),
          let key = try? Curve25519.Signing.PrivateKey(rawRepresentation: raw) else {
        fail("no update signing key at \(keyPath) — run: swift scripts/update-key.swift generate")
    }
    return key
}

let args = Array(CommandLine.arguments.dropFirst())
switch args.first {
case "generate":
    if FileManager.default.fileExists(atPath: keyPath) {
        fail("\(keyPath) already exists — refusing to replace it (installed apps trust that key)")
    }
    let key = Curve25519.Signing.PrivateKey()
    let dir = (keyPath as NSString).deletingLastPathComponent
    try FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true,
                                            attributes: [.posixPermissions: 0o700])
    FileManager.default.createFile(atPath: keyPath, contents: Data((key.rawRepresentation.base64EncodedString() + "\n").utf8),
                                   attributes: [.posixPermissions: 0o600])
    print(key.publicKey.rawRepresentation.base64EncodedString())
case "public":
    print(loadKey().publicKey.rawRepresentation.base64EncodedString())
case "sign":
    guard args.count == 2, let data = FileManager.default.contents(atPath: args[1]) else { fail("usage: sign <file>") }
    print(try loadKey().signature(for: data).base64EncodedString())
default:
    fail("usage: update-key.swift generate | public | sign <file>")
}
