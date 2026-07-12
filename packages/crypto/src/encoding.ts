// Platform-free constants and byte-encoding helpers for @gemba/crypto.
// No platform globals (btoa/atob/crypto.subtle) — safe to import from any
// runtime (Web, Node, React Native), and imported by both crypto.web.ts and
// crypto.native.ts (05-04) without creating a circular import back through
// index.ts.

export const AES_KEY_BITS = 128;
export const IV_BYTES = 12;
export const GCM_TAG_BYTES = 16;

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encodes bytes as URL-safe Base64 (no padding). Implements the alphabet
 * manually — does not rely on `btoa`, which is not a global in React Native.
 */
export function toBase64Url(bytes: Uint8Array): string {
  let result = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result += BASE64_CHARS[(chunk >> 18) & 0x3f];
    result += BASE64_CHARS[(chunk >> 12) & 0x3f];
    result += BASE64_CHARS[(chunk >> 6) & 0x3f];
    result += BASE64_CHARS[chunk & 0x3f];
  }
  const remaining = bytes.length - i;
  if (remaining === 1) {
    const chunk = bytes[i] << 16;
    result += BASE64_CHARS[(chunk >> 18) & 0x3f];
    result += BASE64_CHARS[(chunk >> 12) & 0x3f];
  } else if (remaining === 2) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8);
    result += BASE64_CHARS[(chunk >> 18) & 0x3f];
    result += BASE64_CHARS[(chunk >> 12) & 0x3f];
    result += BASE64_CHARS[(chunk >> 6) & 0x3f];
  }
  return result.replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Inverse of {@link toBase64Url}. Implements the alphabet manually — does
 * not rely on `atob`, which is not a global in React Native.
 */
export function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const cleaned = s.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const lookup = new Int16Array(128).fill(-1);
  for (let i = 0; i < BASE64_CHARS.length; i++) {
    lookup[BASE64_CHARS.charCodeAt(i)] = i;
  }

  const byteLength = Math.floor((cleaned.length * 3) / 4);
  const bytes = new Uint8Array(new ArrayBuffer(byteLength));

  let bytePos = 0;
  let buffer = 0;
  let bitsCollected = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const value = lookup[cleaned.charCodeAt(i)];
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bitsCollected += 6;
    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      bytes[bytePos++] = (buffer >> bitsCollected) & 0xff;
    }
  }
  return bytes;
}

/** Packs `[iv][ciphertext+tag]` into one contiguous buffer. */
export function packPayload(
  iv: Uint8Array,
  ciphertextWithTag: Uint8Array,
): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(
    new ArrayBuffer(iv.byteLength + ciphertextWithTag.byteLength),
  );
  out.set(iv, 0);
  out.set(ciphertextWithTag, iv.byteLength);
  return out;
}

/**
 * Inverse of {@link packPayload}. Throws "payload too short" if the buffer
 * cannot contain a full IV.
 */
export function unpackPayload(packed: ArrayBuffer): {
  iv: Uint8Array;
  ciphertext: Uint8Array;
} {
  if (packed.byteLength <= IV_BYTES) {
    throw new Error("payload too short");
  }
  return {
    iv: new Uint8Array(packed, 0, IV_BYTES),
    ciphertext: new Uint8Array(packed, IV_BYTES),
  };
}
