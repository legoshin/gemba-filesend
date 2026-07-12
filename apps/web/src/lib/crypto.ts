// AES-128-GCM helpers. Used in browser (Web Crypto) and Node API routes
// (globalThis.crypto.subtle, available since Node 18).

const AES_KEY_BITS = 128;
const IV_BYTES = 12;

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: AES_KEY_BITS },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function exportKeyBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64Url(new Uint8Array(raw));
}

export async function importKeyBase64(b64: string): Promise<CryptoKey> {
  const raw = fromBase64Url(b64);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: AES_KEY_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypts `data` and returns `[iv (12 bytes)][ciphertext + auth tag]`. */
export async function encryptPacked(
  data: ArrayBuffer,
  key: CryptoKey,
): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  const out = new Uint8Array(new ArrayBuffer(IV_BYTES + ciphertext.byteLength));
  out.set(iv, 0);
  out.set(new Uint8Array(ciphertext), IV_BYTES);
  return out;
}

/** Inverse of `encryptPacked`. Throws if auth tag fails. */
export async function decryptPacked(
  packed: ArrayBuffer,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  if (packed.byteLength <= IV_BYTES) {
    throw new Error("payload too short");
  }
  const iv = new Uint8Array(packed, 0, IV_BYTES);
  const ciphertext = new Uint8Array(packed, IV_BYTES);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomSaltBase64(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
