import { mkdir, readFile, writeFile, unlink, access, stat } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { StoredMeta } from "@/lib/storage";

const STORAGE_DIR =
  process.env.GEMBA_STORAGE_DIR ?? path.join(process.cwd(), "data");

async function ensureStorageDir(): Promise<void> {
  await mkdir(STORAGE_DIR, { recursive: true });
}

function blobPath(id: string): string {
  return path.join(STORAGE_DIR, `${id}.bin`);
}

function metaPath(id: string): string {
  return path.join(STORAGE_DIR, `${id}.json`);
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

export async function deleteEntry(id: string): Promise<void> {
  await Promise.allSettled([unlink(blobPath(id)), unlink(metaPath(id))]);
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
