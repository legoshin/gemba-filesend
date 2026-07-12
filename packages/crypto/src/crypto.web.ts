// Web Crypto (crypto.subtle) platform adapter for @gemba/crypto. Ported
// verbatim from the pre-extraction apps/web/src/lib/crypto.ts call sites.
// Used in browser (Web Crypto) and Node API routes (globalThis.crypto.subtle,
// available since Node 18).
//
// Web Crypto appends the 16-byte GCM auth tag to the ciphertext automatically
// on encrypt and verifies/strips it automatically on decrypt — so this
// adapter never manually concatenates or splits the tag (D-02b). That
// asymmetry is the native adapter's job (crypto.native.ts, 05-04).

import { AES_KEY_BITS } from "./encoding";

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: AES_KEY_BITS },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function importKeyRaw(
  raw: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: AES_KEY_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function exportKeyRaw(
  key: CryptoKey,
): Promise<Uint8Array<ArrayBuffer>> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

/** Raw AES-GCM encrypt: ciphertext + auth tag, no IV prepended/packed. */
export async function encryptRaw(
  data: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  return new Uint8Array(ciphertext);
}

/** Inverse of {@link encryptRaw}. Throws if the auth tag fails to verify. */
export async function decryptRaw(
  ciphertext: Uint8Array<ArrayBuffer>,
  key: CryptoKey,
  iv: Uint8Array<ArrayBuffer>,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** CSPRNG bytes. All randomness (salts, IVs) routes through this. */
export function getRandomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}
