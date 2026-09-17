import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { decryptPacked, encryptPacked, generateKey } from "@/lib/crypto";
import {
  resolveFiles,
  type StoredFileEntry,
  type StoredMeta,
} from "@/lib/storage";
import {
  blobPartSize,
  deleteEntry,
  openBlobPartReadStream,
  partBlobPath,
  writeBlobPartFromWebStream,
} from "@/lib/server-storage";

const IV_BYTES = 12;
const ONE_DAY_MS = 24 * 3600_000;

function randomBuffer(size: number): ArrayBuffer {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes.buffer;
}

function webStreamOf(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return Readable.toWeb(
    Readable.from(Buffer.from(bytes)),
  ) as unknown as ReadableStream<Uint8Array>;
}

function baseMeta(overrides: Partial<StoredMeta>): StoredMeta {
  return {
    id: "share-id",
    name: "a.bin",
    type: "application/octet-stream",
    size: 100,
    downloadsRemaining: 3,
    expiresAt: Date.now() + ONE_DAY_MS,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("multi-file: two files under ONE key round-trip (MFL-03, Test A)", () => {
  it("resolveFiles returns both entries in order and each decrypts under the same key", async () => {
    const key = await generateKey();
    const plainA = randomBuffer(64);
    const plainB = randomBuffer(128);

    const packedA = await encryptPacked(plainA, key);
    const packedB = await encryptPacked(plainB, key);

    const files: StoredFileEntry[] = [
      { name: "a.bin", type: "application/octet-stream", size: 64 },
      { name: "b.bin", type: "application/octet-stream", size: 128 },
    ];
    const meta = baseMeta({ files, name: "a.bin", size: 64 });

    const resolved = resolveFiles(meta);
    expect(resolved).toHaveLength(2);
    expect(resolved[0].name).toBe("a.bin");
    expect(resolved[1].name).toBe("b.bin");

    const decA = await decryptPacked(packedA.buffer, key);
    const decB = await decryptPacked(packedB.buffer, key);
    expect(new Uint8Array(decA)).toEqual(new Uint8Array(plainA));
    expect(new Uint8Array(decB)).toEqual(new Uint8Array(plainB));
  });
});

describe("multi-file: per-file IVs differ (Test B)", () => {
  it("the two packed parts' first 12 bytes are not equal", async () => {
    const key = await generateKey();
    // Same plaintext to prove the IV — not the content — is what differs.
    const plain = randomBuffer(32);

    const packedA = await encryptPacked(plain, key);
    const packedB = await encryptPacked(plain, key);

    const ivA = packedA.slice(0, IV_BYTES);
    const ivB = packedB.slice(0, IV_BYTES);
    expect(ivA).not.toEqual(ivB);
  });
});

describe("multi-file: legacy single-file meta still resolves (MFL-05, Test C)", () => {
  it("returns a length-1 array mirroring top-level name/type/size", () => {
    const meta = baseMeta({
      name: "legacy.txt",
      type: "text/plain",
      size: 512,
    });
    const resolved = resolveFiles(meta);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toEqual({
      name: "legacy.txt",
      type: "text/plain",
      size: 512,
    });
  });

  it("carries blobUrl through when the legacy meta has one", () => {
    const meta = baseMeta({
      name: "legacy.txt",
      type: "text/plain",
      size: 512,
      blobUrl: "https://example.blob.vercel-storage.com/legacy",
    });
    const resolved = resolveFiles(meta);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].blobUrl).toBe(
      "https://example.blob.vercel-storage.com/legacy",
    );
  });

  it("prefers a non-empty files[] over the legacy top-level shape", () => {
    const meta = baseMeta({
      files: [{ name: "x.bin", type: "application/octet-stream", size: 10 }],
    });
    const resolved = resolveFiles(meta);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].name).toBe("x.bin");
  });
});

describe("multi-file: fs per-index storage round-trip", () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "gemba-mf-"));
    process.env.GEMBA_STORAGE_DIR = dir;
  });

  afterAll(async () => {
    delete process.env.GEMBA_STORAGE_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it("writes and reads two encrypted parts under {id}/{index}.bin", async () => {
    const id = "fs-share";
    const key = await generateKey();
    const part0 = await encryptPacked(randomBuffer(48), key);
    const part1 = await encryptPacked(randomBuffer(80), key);

    await writeBlobPartFromWebStream(id, 0, webStreamOf(part0));
    await writeBlobPartFromWebStream(id, 1, webStreamOf(part1));

    expect(await blobPartSize(id, 0)).toBe(part0.byteLength);
    expect(await blobPartSize(id, 1)).toBe(part1.byteLength);

    const read0 = await streamToBytes(openBlobPartReadStream(id, 0));
    expect(read0).toEqual(part0);

    // deleteEntry removes the whole {id} directory (both parts).
    await deleteEntry(id);
    await expect(access(partBlobPath(id, 0))).rejects.toThrow();
  });
});

function streamToBytes(
  stream: NodeJS.ReadableStream,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("error", reject);
    stream.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
  });
}
