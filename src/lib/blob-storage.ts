import { put, get, del } from "@vercel/blob";
import type { StoredMeta } from "@/lib/storage";

const META_PREFIX = "gemba/meta";
const BLOB_PREFIX = "gemba/blob";

export function metaPathname(id: string): string {
  return `${META_PREFIX}/${id}.json`;
}

export function blobPathnamePrefix(id: string): string {
  return `${BLOB_PREFIX}/${id}`;
}

export async function readMeta(id: string): Promise<StoredMeta | null> {
  let result;
  try {
    result = await get(metaPathname(id), { access: "private" });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "BlobNotFoundError") return null;
    throw err;
  }
  if (!result || result.statusCode !== 200) return null;

  const reader = result.stream.getReader();
  const decoder = new TextDecoder();
  let combined = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    combined += decoder.decode(value, { stream: true });
  }
  combined += decoder.decode();

  return JSON.parse(combined) as StoredMeta;
}

export async function writeMeta(meta: StoredMeta): Promise<void> {
  await put(metaPathname(meta.id), JSON.stringify(meta), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

export async function deleteEntry(meta: StoredMeta): Promise<void> {
  const promises: Promise<unknown>[] = [del(metaPathname(meta.id))];
  if (meta.blobUrl) promises.push(del(meta.blobUrl));
  await Promise.allSettled(promises);
}
