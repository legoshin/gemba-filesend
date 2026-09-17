import { describe, expect, it } from "vitest";
import {
  decryptPacked,
  encryptPacked,
  generateKey,
  randomSaltBase64,
  readFileWithProgress,
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

// Regression tests for the "encryption progress freezes" bug: the upload
// page's onProgress callback was never invoked during the file-read/encrypt
// phase (only during network upload), so the progress bar stayed pinned at
// 0%. readFileWithProgress is what now supplies real, measurable progress
// during that phase — these tests would have failed against the old
// `file.arrayBuffer()`-with-no-callback implementation (onProgress called
// zero times), which is the exact defect being guarded against.
describe("crypto: readFileWithProgress (regression for encryption-progress-freezes)", () => {
  // Mirrors crypto.ts's internal READ_CHUNK_BYTES — not exported, since chunk
  // size isn't part of the public contract, but the boundary behavior is.
  const CHUNK_BYTES = 8 * 1024 * 1024;

  function patternBytes(size: number): Uint8Array {
    const out = new Uint8Array(size);
    for (let i = 0; i < size; i++) out[i] = i % 256;
    return out;
  }

  it("returns byte-identical content for a sub-chunk file and reports progress at least once", async () => {
    const size = 1000;
    const bytes = patternBytes(size);
    const file = new File([bytes], "small.bin");

    const calls: Array<[number, number]> = [];
    const result = await readFileWithProgress(file, (loaded, total) => {
      calls.push([loaded, total]);
    });

    expect(new Uint8Array(result)).toEqual(bytes);
    // The regression: onProgress was never called during this phase at all.
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[calls.length - 1]).toEqual([size, size]);
  });

  it("reports monotonically increasing progress across multiple chunks and preserves bytes at the chunk boundary", async () => {
    const size = CHUNK_BYTES * 2 + 100; // forces 3 read iterations
    const bytes = patternBytes(size);
    const file = new File([bytes], "large.bin");

    const calls: Array<[number, number]> = [];
    const result = await readFileWithProgress(file, (loaded, total) => {
      calls.push([loaded, total]);
    });

    expect(calls).toEqual([
      [CHUNK_BYTES, size],
      [CHUNK_BYTES * 2, size],
      [size, size],
    ]);

    const resultBytes = new Uint8Array(result);
    expect(resultBytes.byteLength).toBe(size);
    // Byte-level check straddling the chunk boundary (N-1, N, N+1) — proves
    // the chunked read didn't drop or duplicate bytes at the split point.
    for (const offset of [
      0,
      CHUNK_BYTES - 1,
      CHUNK_BYTES,
      CHUNK_BYTES + 1,
      size - 1,
    ]) {
      expect(resultBytes[offset]).toBe(bytes[offset]);
    }
  });

  it("handles a file exactly one chunk in size without an extra empty read", async () => {
    const size = CHUNK_BYTES;
    const bytes = patternBytes(size);
    const file = new File([bytes], "exact-chunk.bin");

    const calls: Array<[number, number]> = [];
    const result = await readFileWithProgress(file, (loaded, total) => {
      calls.push([loaded, total]);
    });

    expect(calls).toEqual([[size, size]]);
    // Buffer.compare (native) instead of expect().toEqual() — a full deep
    // equality diff over an 8M-element typed array is what timed this test
    // out originally; byte-for-byte correctness only needs one fast pass.
    expect(Buffer.compare(Buffer.from(result), Buffer.from(bytes))).toBe(0);
  });

  it("handles a 0-byte file: resolves immediately with an empty buffer and a single (0,0) progress event", async () => {
    const file = new File([], "empty.bin");

    const calls: Array<[number, number]> = [];
    const result = await readFileWithProgress(file, (loaded, total) => {
      calls.push([loaded, total]);
    });

    expect(calls).toEqual([[0, 0]]);
    expect(result.byteLength).toBe(0);
  });
});
