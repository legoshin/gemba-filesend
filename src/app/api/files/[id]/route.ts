import { NextRequest } from "next/server";
import { Readable } from "node:stream";
import { get as blobGet } from "@vercel/blob";
import {
  blobSize,
  openBlobReadStream,
  readMeta as fsReadMeta,
  deleteEntry as fsDeleteEntry,
  writeMeta as fsWriteMeta,
} from "@/lib/server-storage";
import {
  readMeta as blobReadMeta,
  writeMeta as blobWriteMeta,
  deleteEntry as blobDeleteEntry,
} from "@/lib/blob-storage";
import { getStorageMode, type StoredMeta } from "@/lib/storage";
import { sha256Hex } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Streaming the (private) blob runs through this function, so let it run
// long enough for big files. Vercel caps this at 60s on hobby, 300s default
// on pro, configurable up to 900s.
export const maxDuration = 300;

async function checkPassword(
  meta: StoredMeta,
  provided: string | null,
): Promise<Response | null> {
  if (!meta.passwordHash) return null;
  if (!provided) return new Response("password required", { status: 401 });
  const candidate = await sha256Hex(provided + (meta.salt ?? ""));
  if (candidate !== meta.passwordHash) {
    return new Response("invalid password", { status: 403 });
  }
  return null;
}

async function handleBlobDownload(
  req: NextRequest,
  id: string,
): Promise<Response> {
  const meta = await blobReadMeta(id);
  if (!meta) return new Response("not found", { status: 404 });
  if (meta.expiresAt < Date.now()) {
    await blobDeleteEntry(meta);
    return new Response("expired", { status: 410 });
  }
  if (meta.downloadsRemaining <= 0) {
    await blobDeleteEntry(meta);
    return new Response("exhausted", { status: 410 });
  }
  const pwFail = await checkPassword(meta, req.headers.get("x-password"));
  if (pwFail) return pwFail;
  if (!meta.blobUrl) return new Response("blob missing", { status: 500 });

  // Decrement first so concurrent requests see the lower count. Don't delete
  // the blob yet — the stream below needs it. A subsequent request that finds
  // downloadsRemaining <= 0 will clean it up.
  const remaining = meta.downloadsRemaining - 1;
  await blobWriteMeta({ ...meta, downloadsRemaining: remaining });

  const result = await blobGet(meta.blobUrl, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return new Response("blob missing", { status: 500 });
  }

  return new Response(result.stream, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(result.blob.size),
      "cache-control": "no-store",
    },
  });
}

async function handleFsDownload(
  req: NextRequest,
  id: string,
): Promise<Response> {
  const meta = await fsReadMeta(id);
  if (!meta) return new Response("not found", { status: 404 });
  if (meta.expiresAt < Date.now()) {
    await fsDeleteEntry(id);
    return new Response("expired", { status: 410 });
  }
  if (meta.downloadsRemaining <= 0) {
    await fsDeleteEntry(id);
    return new Response("exhausted", { status: 410 });
  }
  const pwFail = await checkPassword(meta, req.headers.get("x-password"));
  if (pwFail) return pwFail;

  const onDiskSize = await blobSize(id);
  if (onDiskSize == null) return new Response("not found", { status: 404 });

  const remaining = meta.downloadsRemaining - 1;
  await fsWriteMeta({ ...meta, downloadsRemaining: remaining });

  const nodeStream = openBlobReadStream(id);
  if (remaining === 0) {
    nodeStream.on("close", () => {
      void fsDeleteEntry(id);
    });
  }
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(onDiskSize),
      "cache-control": "no-store",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (getStorageMode() === "blob") return handleBlobDownload(req, id);
  return handleFsDownload(req, id);
}
