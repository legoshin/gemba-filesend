import { describe, expect, it } from "vitest";
import {
  decryptPacked,
  encryptPackedWithIv,
  fromBase64Url,
  importKeyBase64,
  sha256Hex,
  toBase64Url,
} from "@gemba/crypto";
import {
  expectedBase64Url,
  expectedPackedBase64,
  expectedSha256Hex,
  fixedBase64UrlBytes,
  fixedIvBase64Url,
  fixedKeyBase64Url,
  fixedPassword,
  fixedPlaintextBytes,
  fixedSalt,
} from "@gemba/crypto/vectors";

const IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

/**
 * Web half of the CRYPTO-03 interop gate (D-04): asserts crypto.web.ts
 * reproduces the frozen golden-vector bytes EXACTLY — not just a round-trip
 * — so any packing/encoding drift fails loudly. The native adapter
 * (crypto.native.ts, 05-04) is gated against these same literals on-device.
 */
describe("golden vectors: web byte-equality + cross-decrypt (CRYPTO-03)", () => {
  it("encryptPackedWithIv reproduces the exact frozen packed bytes", async () => {
    const key = await importKeyBase64(fixedKeyBase64Url);
    const iv = fromBase64Url(fixedIvBase64Url);
    const plaintext = new Uint8Array(fixedPlaintextBytes).buffer;

    const packed = await encryptPackedWithIv(plaintext, key, iv);

    expect(packed.byteLength).toBe(
      IV_BYTES + fixedPlaintextBytes.length + GCM_TAG_BYTES,
    );
    expect(toBase64Url(packed)).toBe(expectedPackedBase64);
  });

  it("sha256Hex(fixedPassword + fixedSalt) matches the frozen hex digest", async () => {
    const hash = await sha256Hex(fixedPassword + fixedSalt);
    expect(hash).toBe(expectedSha256Hex);
  });

  it("toBase64Url(fixedBase64UrlBytes) matches the frozen Base64URL string", () => {
    const bytes = new Uint8Array(fixedBase64UrlBytes);
    expect(toBase64Url(bytes)).toBe(expectedBase64Url);
  });

  it("cross-decrypts the frozen packed bytes back to the fixed plaintext", async () => {
    const key = await importKeyBase64(fixedKeyBase64Url);
    const packed = fromBase64Url(expectedPackedBase64);

    const decrypted = await decryptPacked(packed.buffer, key);

    expect(new Uint8Array(decrypted)).toEqual(
      new Uint8Array(fixedPlaintextBytes),
    );
  });
});
