// @gemba/crypto — shared crypto core + public API barrel (D-01).
//
// The pure-TS parts (constants, Base64URL, the [iv][ciphertext+tag] packing
// layout, salt/IV generation plumbing) are owned once, here. The AES-GCM +
// SHA-256 primitive comes from a platform-resolved adapter re-exported from
// "./crypto": Metro resolves `crypto.native.ts` for React Native bundles and
// falls back to `crypto.ts`; Turbopack/Vite are configured (via
// `resolveExtensions` / `resolve.extensions`) to prefer `crypto.web.ts`. Only
// `crypto.web.ts` exists so far — `crypto.native.ts` lands in 05-04 without
// requiring any change here.

import {
  AES_KEY_BITS,
  GCM_TAG_BYTES,
  IV_BYTES,
  fromBase64Url,
  packPayload,
  toBase64Url,
  unpackPayload,
} from "./encoding";
import {
  decryptRaw,
  encryptRaw,
  exportKeyRaw,
  generateKey as adapterGenerateKey,
  getRandomBytes,
  importKeyRaw,
  sha256Hex as adapterSha256Hex,
} from "./crypto";

export { AES_KEY_BITS, GCM_TAG_BYTES, IV_BYTES, toBase64Url, fromBase64Url };

export const generateKey = adapterGenerateKey;
export const sha256Hex = adapterSha256Hex;

export async function exportKeyBase64(key: CryptoKey): Promise<string> {
  return toBase64Url(await exportKeyRaw(key));
}

export async function importKeyBase64(b64: string): Promise<CryptoKey> {
  return importKeyRaw(fromBase64Url(b64));
}

/** 16 CSPRNG bytes, Base64URL-encoded — used as the password-hash salt. */
export function randomSaltBase64(): string {
  return toBase64Url(getRandomBytes(16));
}

/**
 * Encrypts `data` with an explicit IV and returns the packed
 * `[iv(12)][ciphertext+tag]` bytes. Deterministic given (data, key, iv) — the
 * shared-core hook golden vectors (packages/crypto/src/vectors.ts) use to
 * generate/assert exact expected bytes without relying on the random IV that
 * {@link encryptPacked} generates internally.
 */
export async function encryptPackedWithIv(
  data: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<Uint8Array<ArrayBuffer>> {
  const ciphertextWithTag = await encryptRaw(data, key, iv);
  return packPayload(iv, ciphertextWithTag);
}

/** Encrypts `data` and returns `[iv (12 bytes)][ciphertext + auth tag]`. */
export async function encryptPacked(
  data: ArrayBuffer,
  key: CryptoKey,
): Promise<Uint8Array<ArrayBuffer>> {
  const iv = getRandomBytes(IV_BYTES);
  return encryptPackedWithIv(data, key, iv);
}

/** Inverse of {@link encryptPacked}. Throws if auth tag fails. */
export async function decryptPacked(
  packed: ArrayBuffer,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  const { iv, ciphertext } = unpackPayload(packed);
  return decryptRaw(ciphertext, key, iv);
}
