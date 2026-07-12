// react-native-quick-crypto platform adapter for @gemba/crypto (D-01, D-02b).
// Metro resolves this file (over crypto.ts's platform-neutral fallback) for
// any bare `./crypto` import inside a React Native bundle — see index.ts.
//
// react-native-quick-crypto exposes Node's classic `crypto` API
// (createCipheriv/createDecipheriv), which returns the 16-byte GCM auth tag
// SEPARATELY via cipher.getAuthTag(), unlike Web Crypto's crypto.subtle
// (crypto.web.ts), which appends the tag to the ciphertext automatically.
// To reproduce the exact `[iv][ciphertext+tag]` packed bytes byte-for-byte,
// this adapter MUST:
//   - encrypt: concatenate ciphertext + getAuthTag() (D-02b)
//   - decrypt: split the last 16 bytes off as the tag and call
//     setAuthTag(tag) BEFORE update()/final() (D-02b)
// This concat/split logic is intentionally local to this adapter — the
// shared core (index.ts) stays primitive-agnostic and treats both
// `encryptRaw` outputs identically (ciphertext with tag already appended).

import {
  Buffer,
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "react-native-quick-crypto";

import { AES_KEY_BITS, GCM_TAG_BYTES } from "./encoding";

const AES_KEY_BYTES = AES_KEY_BITS / 8;
const CIPHER_ALGORITHM = "aes-128-gcm";

/**
 * Native "CryptoKey": react-native-quick-crypto's Node-style API takes raw
 * key bytes directly (no `crypto.subtle`-style opaque key object exists on
 * this primitive), so the native adapter's CryptoKey is just an opaque
 * wrapper around the raw bytes. This local type is module-scoped — it does
 * not merge with the global DOM `CryptoKey` type crypto.web.ts uses, so both
 * adapters can independently satisfy the same *function signatures* (D-01)
 * without sharing a concrete key representation.
 */
export interface CryptoKey {
  readonly raw: Uint8Array<ArrayBuffer>;
}

/** Copies into a fresh, exactly-sized ArrayBuffer-backed Uint8Array. */
function toExactUint8Array(buf: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(buf.byteLength));
  out.set(buf);
  return out;
}

export async function generateKey(): Promise<CryptoKey> {
  return { raw: getRandomBytes(AES_KEY_BYTES) };
}

export async function importKeyRaw(
  raw: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  return { raw: toExactUint8Array(raw) };
}

export async function exportKeyRaw(
  key: CryptoKey,
): Promise<Uint8Array<ArrayBuffer>> {
  return toExactUint8Array(key.raw);
}

/** Raw AES-GCM encrypt: ciphertext + auth tag, no IV prepended/packed. */
export async function encryptRaw(
  data: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const cipher = createCipheriv(
    CIPHER_ALGORITHM,
    Buffer.from(key.raw),
    Buffer.from(iv),
  );
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(data)),
    cipher.final(),
  ]);
  // Tag is SEPARATE from the ciphertext on this primitive — must
  // concatenate manually to match crypto.web.ts's auto-appended layout.
  const authTag = cipher.getAuthTag();
  return toExactUint8Array(Buffer.concat([encrypted, authTag]));
}

/** Inverse of {@link encryptRaw}. Throws if the auth tag fails to verify. */
export async function decryptRaw(
  ciphertext: Uint8Array<ArrayBuffer>,
  key: CryptoKey,
  iv: Uint8Array<ArrayBuffer>,
): Promise<ArrayBuffer> {
  if (ciphertext.byteLength < GCM_TAG_BYTES) {
    throw new Error("ciphertext too short to contain an auth tag");
  }
  const splitAt = ciphertext.byteLength - GCM_TAG_BYTES;
  const tag = Buffer.from(ciphertext.subarray(splitAt));
  const ciphertextOnly = Buffer.from(ciphertext.subarray(0, splitAt));

  const decipher = createDecipheriv(
    CIPHER_ALGORITHM,
    Buffer.from(key.raw),
    Buffer.from(iv),
  );
  // MUST be called before update()/final() (D-02b).
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertextOnly),
    decipher.final(),
  ]);
  return toExactUint8Array(plaintext).buffer;
}

export async function sha256Hex(input: string): Promise<string> {
  // Async signature preserved (D-01) even though the native call is sync.
  // No explicit inputEncoding: that overload's type signature returns
  // Buffer instead of Hash (a quirk of this library's .d.ts), breaking the
  // .digest() chain. Omitting it uses the same "utf8" default internally.
  return createHash("sha256").update(input).digest("hex");
}

/** CSPRNG bytes. All randomness (salts, IVs) routes through this. */
export function getRandomBytes(n: number): Uint8Array<ArrayBuffer> {
  return toExactUint8Array(randomBytes(n));
}
