# 08-01 Summary — GembaCrypto interop core

**Plan:** retroactive (executed inline 2026-09-17, before planning artifacts were written)
**Status:** Complete. `swift test` green — 24 tests in GembaCryptoTests.

## What was built (`macos/GembaKit/Sources/GembaCrypto/`)
- `GembaCrypto.swift` — `ShareKey` (AES-128, constant-time compare, base64url in/out),
  `PackedCrypto.seal/open` over CryptoKit's `combined` representation, `sha256Hex`,
  `randomSaltBase64URL`.
- `Base64URL.swift` — unpadded base64url, accepting padded input on the way back in.
- `ShareLink.swift` — `ShareID` (8 random bytes → 16 lowercase hex, matching the server's
  `/^[a-f0-9]{16}$/`), `ShareLink` build + parse, key confined to the fragment.
- `FileEncryptor.swift` — file-to-file encrypt/decrypt with progress and the explicit
  plaintext-copy fallback.

## Verification
- `scripts/gen-vectors.mjs` runs the WEB's crypto (WebCrypto, transcribed from `src/lib/crypto.ts`)
  over 8 payload shapes — empty, 1 byte, all 256 byte values, block-aligned, unaligned, 1 MiB —
  and self-checks each vector by round-tripping before writing it. Output:
  `Tests/GembaCryptoTests/vectors.json`.
- Tests assert both directions: web-produced bytes decrypt in Swift, and Swift's packed output has
  the exact layout the web's `decryptPacked` slices blindly.
- IV uniqueness across 200 encryptions under ONE shared key (the multi-file case; GCM nonce reuse
  is the failure that would matter).
- Tamper detection on tag and IV, wrong-key rejection, short-payload rejection.
- Key shape: 16 bytes, 22 base64url chars, no `=`, `+` or `/`.
- Password formula parity: `sha256Hex(password + salt)` against web-generated cases.

## Deviations from the spec
- The spec's streaming/chunked encryption was attempted and removed — see 08-CONTEXT.md.
  `FileEncryptor` is one-shot over a memory-mapped plaintext instead. An empty file packs to
  exactly IV+tag, so the length guard is inclusive (the web's is `> IV` only).
