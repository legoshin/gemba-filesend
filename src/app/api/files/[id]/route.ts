import { NextRequest } from "next/server";
import { Readable } from "node:stream";
import { issueSignedToken, presignUrl } from "@vercel/blob";
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

const PRESIGN_TTL_MS = 5 * 60_000;

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

  // Decrement first so concurrent requests see the lower count. The blob
  // itself is left alone — actual cleanup happens on the next request that
  // observes downloadsRemaining <= 0 (above), which means the just-issued
  // presigned URL stays valid for its TTL window.
  const remaining = meta.downloadsRemaining - 1;
  await blobWriteMeta({ ...meta, downloadsRemaining: remaining });

  // Mint a short-lived presigned URL the client can fetch directly from the
  // Blob CDN. This bypasses Vercel's function response body limit, which is
  // what truncates large files to 0 bytes when we tried to proxy via get().
  let pathname: string;
  try {
    pathname = new URL(meta.blobUrl).pathname.replace(/^\//, "");
  } catch {
    return new Response("blob url invalid", { status: 500 });
  }
  const validUntil = Date.now() + PRESIGN_TTL_MS;
  const signedToken = await issueSignedToken({
    pathname,
    operations: ["get"],
    validUntil,
  });
  const { presignedUrl } = await presignUrl(signedToken, {
    operation: "get",
    pathname,
    access: "private",
    validUntil,
  });

  return Response.redirect(presignedUrl, 302);
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
