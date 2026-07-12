// Frozen golden vectors — the walking-skeleton "spec" (D-04, CRYPTO-03).
//
// These values were generated ONCE by running crypto.web.ts (the shipped
// Web Crypto implementation, the reference oracle) against the fixed inputs
// below, then hard-frozen as literals. Every runtime's crypto adapter must
// reproduce these exact bytes: apps/web/src/golden-vectors.test.ts is the
// web half of the gate (this plan); the native adapter (crypto.native.ts,
// 05-04) is gated against these same literals on-device via Maestro.
//
// DO NOT regenerate these values casually — changing them silently breaks
// the interop contract this phase exists to lock down. If the packed byte
// layout or encoding ever needs to change, that is an explicit, reviewed
// decision, not a routine test-fixture update.

/** Fixed 16-byte AES-128 key, Base64URL-encoded. */
export const fixedKeyBase64Url = "AAECAwQFBgcICQoLDA0ODw";

/** Fixed 12-byte GCM IV, Base64URL-encoded. */
export const fixedIvBase64Url = "ZGVmZ2hpamtsbW5v";

/** Fixed plaintext: "The quick brown fox jumps over the lazy dog" (UTF-8, 43 bytes). */
export const fixedPlaintextBytes: readonly number[] = [
  84, 104, 101, 32, 113, 117, 105, 99, 107, 32, 98, 114, 111, 119, 110, 32,
  102, 111, 120, 32, 106, 117, 109, 112, 115, 32, 111, 118, 101, 114, 32, 116,
  104, 101, 32, 108, 97, 122, 121, 32, 100, 111, 103,
];

/**
 * Expected `[iv(12)][ciphertext+tag]` bytes (Base64URL) for
 * encryptPackedWithIv(fixedPlaintextBytes, importedFixedKey, fixedIv).
 * Length must equal 12 + 43 + 16 = 71 bytes.
 */
export const expectedPackedBase64 =
  "ZGVmZ2hpamtsbW5vTgorhap30ZnwHjVi6b1FzFbnAN_43LAqh0_e4dmA14fSmXJI6mJese43QNbZPAqCrEKQ5P-bMJD5BDU";

/** Fixed password + salt whose sha256Hex(password + salt) is frozen below. */
export const fixedPassword = "correct horse battery staple";
export const fixedSalt = "pepper-1234567890";

/** Expected sha256Hex(fixedPassword + fixedSalt) — lowercase hex. */
export const expectedSha256Hex =
  "0578f73830ca02a68a7f6f87a3eaa7dc361922667164756d4ca2eb477247cb1f";

/** Fixed bytes: "Hello, Gemba!" (UTF-8, 13 bytes). */
export const fixedBase64UrlBytes: readonly number[] = [
  72, 101, 108, 108, 111, 44, 32, 71, 101, 109, 98, 97, 33,
];

/** Expected toBase64Url(fixedBase64UrlBytes). */
export const expectedBase64Url = "SGVsbG8sIEdlbWJhIQ";
