/**
 * The end-to-end interop check: takes a share link made by the macOS app and
 * downloads + decrypts it using the web app's own crypto (`src/lib/crypto.ts`,
 * via WebCrypto), then compares the bytes against the original file.
 *
 * Proves the claim that matters: a link made on the Mac opens in the browser.
 *
 *   node macos/scripts/verify-interop.mjs "<share link>" <original file> [<original file>…]
 */
import { readFileSync } from "node:fs";

const [link, ...originals] = process.argv.slice(2);
if (!link || originals.length === 0) {
  console.error("usage: verify-interop.mjs <share-link> <original-file>…");
  process.exit(2);
}

const url = new URL(link);
const id = url.searchParams.get("id");
const keyB64 = url.hash.replace(/^#/, "");
if (!id || !keyB64) {
  console.error("link is missing an id or a key fragment");
  process.exit(2);
}

// --- verbatim from src/lib/crypto.ts ---------------------------------------
const IV_BYTES = 12;
function fromBase64Url(s) {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return new Uint8Array(Buffer.from(b64, "base64"));
}
async function importKeyBase64(b64) {
  return crypto.subtle.importKey("raw", fromBase64Url(b64), { name: "AES-GCM", length: 128 }, false, ["encrypt", "decrypt"]);
}
async function decryptPacked(packed, key) {
  if (packed.byteLength <= IV_BYTES) throw new Error("payload too short");
  const iv = new Uint8Array(packed, 0, IV_BYTES);
  const ciphertext = new Uint8Array(packed, IV_BYTES);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}
// ---------------------------------------------------------------------------

const origin = url.origin;
const metaRes = await fetch(`${origin}/api/files/${id}/meta`);
if (!metaRes.ok) {
  console.error(`meta lookup failed: HTTP ${metaRes.status} ${await metaRes.text()}`);
  process.exit(1);
}
const meta = await metaRes.json();
const listed = meta.files ?? [{ name: meta.name, size: meta.size, type: meta.type }];
console.log(`share ${id}: ${listed.length} file(s), encrypted=${meta.encrypted !== false}`);

const key = await importKeyBase64(keyB64);
let failures = 0;

for (let index = 0; index < listed.length; index++) {
  const expected = readFileSync(originals[index]);
  const entry = listed[index];

  const readRes = await fetch(`${origin}/api/files/${id}?index=${index}`);
  if (!readRes.ok) {
    console.error(`  ✗ ${entry.name}: download failed HTTP ${readRes.status} ${await readRes.text()}`);
    failures++;
    continue;
  }
  const contentType = readRes.headers.get("content-type") ?? "";
  let packed;
  if (contentType.includes("application/json")) {
    // blob mode: the API hands back a short-lived presigned CDN URL.
    const { url: presigned } = await readRes.json();
    const blobRes = await fetch(presigned);
    if (!blobRes.ok) {
      console.error(`  ✗ ${entry.name}: CDN fetch failed HTTP ${blobRes.status}`);
      failures++;
      continue;
    }
    packed = await blobRes.arrayBuffer();
  } else {
    packed = await readRes.arrayBuffer();
  }

  const plaintext = Buffer.from(await decryptPacked(packed, key));
  const matches = Buffer.compare(plaintext, expected) === 0;
  const layoutOK = packed.byteLength === expected.length + 12 + 16;
  console.log(
    `  ${matches && layoutOK ? "✓" : "✗"} ${entry.name}: ` +
    `${packed.byteLength} packed bytes -> ${plaintext.length} plaintext, ` +
    `layout ${layoutOK ? "IV+ciphertext+tag" : "UNEXPECTED"}, ` +
    `bytes ${matches ? "identical to the original" : "DIFFERENT"}`
  );
  if (!matches || !layoutOK) failures++;
}

if (failures > 0) {
  console.error(`\n${failures} file(s) failed the interop check`);
  process.exit(1);
}
console.log("\nweb crypto decrypted every file made by the macOS app");
