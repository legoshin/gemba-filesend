import { mkdir, readFile, writeFile, unlink, access, stat, rm } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { StoredMeta } from "@/lib/storage";

// GEMBA_STORAGE_DIR is read per-call (not cached at module load) so tests can
// point it at a temp dir before exercising the fs helpers.
function storageDir(): string {
  return process.env.GEMBA_STORAGE_DIR ?? path.join(process.cwd(), "data");
}

async function ensureStorageDir(): Promise<void> {
  await mkdir(storageDir(), { recursive: true });
}

function blobPath(id: string): string {
  return path.join(storageDir(), `${id}.bin`);
}

/** Per-share subdirectory for multi-file parts (MFL-03): {STORAGE_DIR}/{id}. */
function partDir(id: string): string {
  return path.join(storageDir(), id);
}

/** Multi-file part path: {STORAGE_DIR}/{id}/{index}.bin. */
export function partBlobPath(id: string, index: number): string {
  return path.join(partDir(id), `${index}.bin`);
}

function metaPath(id: string): string {
  return path.join(storageDir(), `${id}.json`);
}

export async function writeMeta(meta: StoredMeta): Promise<void> {
  await ensureStorageDir();
  await writeFile(metaPath(meta.id), JSON.stringify(meta), "utf-8");
}

export async function readMeta(id: string): Promise<StoredMeta | null> {
  try {
    const raw = await readFile(metaPath(id), "utf-8");
    return JSON.parse(raw) as StoredMeta;
  } catch {
    return null;
  }
}

export async function writeBlobFromWebStream(
  id: string,
  body: ReadableStream<Uint8Array>,
): Promise<void> {
  await ensureStorageDir();
  const nodeStream = Readable.fromWeb(body as never);
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(blobPath(id));
    nodeStream.on("error", reject);
    out.on("error", reject);
    out.on("finish", () => resolve());
    nodeStream.pipe(out);
  });
}

export function openBlobReadStream(id: string) {
  return createReadStream(blobPath(id));
}

export async function blobSize(id: string): Promise<number | null> {
  try {
    const s = await stat(blobPath(id));
    return s.size;
  } catch {
    return null;
  }
}

/**
 * Streams one multi-file part to {id}/{index}.bin (MFL-03). Mirrors
 * writeBlobFromWebStream but under the per-share subdirectory, which it mkdir's
 * first. The legacy {id}.bin path is left intact for single-file reads.
 */
export async function writeBlobPartFromWebStream(
  id: string,
  index: number,
  body: ReadableStream<Uint8Array>,
): Promise<void> {
  await mkdir(partDir(id), { recursive: true });
  const nodeStream = Readable.fromWeb(body as never);
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(partBlobPath(id, index));
    nodeStream.on("error", reject);
    out.on("error", reject);
    out.on("finish", () => resolve());
    nodeStream.pipe(out);
  });
}

export function openBlobPartReadStream(id: string, index: number) {
  return createReadStream(partBlobPath(id, index));
}

export async function blobPartSize(
  id: string,
  index: number,
): Promise<number | null> {
  try {
    const s = await stat(partBlobPath(id, index));
    return s.size;
  } catch {
    return null;
  }
}

export async function deleteEntry(id: string): Promise<void> {
  await Promise.allSettled([
    unlink(blobPath(id)),
    unlink(metaPath(id)),
    // Multi-file parts live under {id}/ — remove the whole share directory.
    rm(partDir(id), { recursive: true, force: true }),
  ]);
}

export async function entryExists(id: string): Promise<boolean> {
  try {
    await access(metaPath(id));
    return true;
  } catch {
    return false;
  }
}

export function generateId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
