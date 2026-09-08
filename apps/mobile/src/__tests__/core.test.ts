import {
  decryptPacked,
  encryptPackedWithIv,
  fromBase64Url,
  importKeyBase64,
  toBase64Url,
} from "@gemba/crypto";
import {
  expectedBase64Url,
  expectedPackedBase64,
  fixedBase64UrlBytes,
  fixedIvBase64Url,
  fixedKeyBase64Url,
  fixedPlaintextBytes,
} from "@gemba/crypto/vectors";

const IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

/**
 * jest-expo web/fallback-adapter pre-check (WR-01 correction): exercises
 * @gemba/crypto against the same frozen golden vectors that
 * apps/web/src/golden-vectors.test.ts asserts against. Test 1 covers the
 * shared pure-TS core (Base64URL codec, [iv][ciphertext+tag] packing layout);
 * tests 2 and 3 additionally drive real AES-GCM (importKeyBase64 /
 * encryptPackedWithIv / decryptPacked) through the platform-resolved
 * "./crypto" adapter, which — under jest.config.js's pinned .web.ts resolution
 * — is crypto.web.ts (globalThis.crypto.subtle), NOT a pure-TS-only path.
 * This suite MUST NOT import react-native-quick-crypto or crypto.native.ts —
 * the real on-device native-module gate is Maestro in 05-04, not this suite.
 * Running under "jest-expo/node" (plain Node test environment) with the
 * .web.ts-first resolver confirms this never touches an RN native module.
 */
describe("apps/mobile shared-core pre-check (D-05)", () => {
  it("toBase64Url/fromBase64Url round-trips arbitrary bytes", () => {
    const original = new Uint8Array(fixedBase64UrlBytes);
    const encoded = toBase64Url(original);
    const decoded = fromBase64Url(encoded);

    expect(encoded).toBe(expectedBase64Url);
    expect(decoded).toEqual(original);
  });

  it("reproduces the exact frozen packed-bytes layout ([iv][ciphertext+tag])", async () => {
    const key = await importKeyBase64(fixedKeyBase64Url);
    const iv = fromBase64Url(fixedIvBase64Url);
    const plaintext = new Uint8Array(fixedPlaintextBytes).buffer;

    const packed = await encryptPackedWithIv(plaintext, key, iv);

    expect(packed.byteLength).toBe(
      IV_BYTES + fixedPlaintextBytes.length + GCM_TAG_BYTES,
    );
    expect(toBase64Url(packed)).toBe(expectedPackedBase64);
  });

  it("unpacks the frozen packed bytes back to the fixed plaintext", async () => {
    const key = await importKeyBase64(fixedKeyBase64Url);
    const packed = fromBase64Url(expectedPackedBase64);

    const decrypted = await decryptPacked(packed.buffer, key);

    expect(new Uint8Array(decrypted)).toEqual(
      new Uint8Array(fixedPlaintextBytes),
    );
  });
});
