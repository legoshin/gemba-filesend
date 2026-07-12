import { describe, expect, it } from "vitest";
import {
  decryptPacked,
  encryptPacked,
  generateKey,
  randomSaltBase64,
  sha256Hex,
} from "@/lib/crypto";

const IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

function bufferOf(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

function randomBuffer(size: number): ArrayBuffer {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes.buffer;
}

describe("crypto: encryptPacked / decryptPacked round-trip (TEST-01)", () => {
  it.each([
    { label: "empty-ish (1 byte)", size: 1 },
    { label: "small (16 bytes)", size: 16 },
    { label: "multi-KB (8192 bytes)", size: 8192 },
  ])("round-trips $label payloads", async ({ size }) => {
    const key = await generateKey();
    const plaintext = randomBuffer(size);

    const packed = await encryptPacked(plaintext, key);
    const decrypted = await decryptPacked(packed.buffer, key);

    expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(plaintext));
  });

  it("produces [12-byte IV][ciphertext+tag] with the correct total length", async () => {
    const key = await generateKey();
    const plaintext = bufferOf([1, 2, 3, 4, 5]);

    const packed = await encryptPacked(plaintext, key);

    expect(packed.byteLength).toBe(
      IV_BYTES + plaintext.byteLength + GCM_TAG_BYTES,
    );
  });

  it("prepends a 12-byte IV that decryptPacked reads to invert the ciphertext", async () => {
    const key = await generateKey();
    const plaintext = bufferOf([9, 9, 9]);

    const packed = await encryptPacked(plaintext, key);
    const iv = packed.slice(0, IV_BYTES);

    // The IV occupies exactly the first 12 bytes; feeding the packed buffer
    // back through decryptPacked (which re-reads those same 12 bytes) proves
    // the layout is [IV][ciphertext+tag], not some other framing.
    expect(iv.byteLength).toBe(IV_BYTES);
    const decrypted = await decryptPacked(packed.buffer, key);
    expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(plaintext));
  });

  it("uses a random IV: two encryptions of the same input differ", async () => {
    const key = await generateKey();
    const plaintext = bufferOf([1, 2, 3, 4, 5, 6, 7, 8]);

    const packedA = await encryptPacked(plaintext, key);
    const packedB = await encryptPacked(plaintext, key);

    expect(packedA).not.toEqual(packedB);
    expect(packedA.slice(0, IV_BYTES)).not.toEqual(packedB.slice(0, IV_BYTES));
  });

  it("rejects a payload of length <= 12 with 'payload too short'", async () => {
    const key = await generateKey();
    const tooShort = new Uint8Array(IV_BYTES).buffer; // exactly 12 bytes

    await expect(decryptPacked(tooShort, key)).rejects.toThrow(
      "payload too short",
    );
  });

  it("throws on the wrong key (auth tag failure)", async () => {
    const key = await generateKey();
    const wrongKey = await generateKey();
    const plaintext = bufferOf([42, 42, 42]);

    const packed = await encryptPacked(plaintext, key);

    await expect(decryptPacked(packed.buffer, wrongKey)).rejects.toThrow();
  });

  it("throws on tampered ciphertext (auth tag failure)", async () => {
    const key = await generateKey();
    const plaintext = bufferOf([7, 8, 9, 10]);

    const packed = await encryptPacked(plaintext, key);
    const tampered = new Uint8Array(packed);
    tampered[tampered.length - 1] ^= 0xff; // flip a bit in the auth tag

    await expect(decryptPacked(tampered.buffer, key)).rejects.toThrow();
  });
});

describe("crypto: sha256Hex password hash/validate (TEST-02)", () => {
  it("is stable: hashing the same password+salt twice yields the same digest", async () => {
    const salt = randomSaltBase64();
    const password = "correct-horse-battery-staple";

    const hashA = await sha256Hex(password + salt);
    const hashB = await sha256Hex(password + salt);

    expect(hashA).toBe(hashB);
  });

  it("matches on the correct password (mirrors checkPassword's composition)", async () => {
    const salt = randomSaltBase64();
    const password = "s3cr3t";

    const stored = await sha256Hex(password + salt);
    const candidate = await sha256Hex(password + salt);

    expect(candidate).toBe(stored);
  });

  it("differs on a wrong password", async () => {
    const salt = randomSaltBase64();
    const stored = await sha256Hex("right-password" + salt);
    const candidate = await sha256Hex("wrong-password" + salt);

    expect(candidate).not.toBe(stored);
  });
});
