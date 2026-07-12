import { NextRequest } from "next/server";
import { Readable } from "node:stream";
import { issueSignedToken, presignUrl } from "@vercel/blob";
import {
  blobSize,
  openBlobReadStream,
  readMeta as fsReadMeta,
  deleteEntry as fsDeleteEntry,
} from "@/lib/server-storage";
import {
  readMeta as blobReadMeta,
  writeMeta as blobWriteMeta,
  deleteEntry as blobDeleteEntry,
} from "@/lib/blob-storage";
import { getStorageMode, type StoredMeta } from "@/lib/storage";
import { sha256Hex } from "@/lib/crypto";
import {
  checkDownloadLimit,
  checkPasswordAttemptLimit,
} from "@/lib/rate-limit";
import { decrementDownloadCounter } from "@/lib/redis";
import { clientIp } from "@/lib/request-ip";

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
  ip: string,
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
  if (meta.passwordHash) {
    const pwLimited = await checkPasswordAttemptLimit(id, ip);
    if (pwLimited) return pwLimited;
  }
  const pwFail = await checkPassword(meta, req.headers.get("x-password"));
  if (pwFail) return pwFail;
  if (!meta.blobUrl) return new Response("blob missing", { status: 500 });

  // REL-01: atomic Redis DECR on dl:{id} replaces the old read-modify-write on
  // metadata (race-free by construction, D-08). Redis is the live authority
  // (D-09) — the decremented value is NOT written back to metadata. Fail CLOSED:
  // if Redis is unreachable, refuse the download rather than risk over-issuing.
  const ttlSeconds = Math.max(1, Math.ceil((meta.expiresAt - Date.now()) / 1000));
  let remaining: number;
  try {
    remaining = await decrementDownloadCounter(
      id,
      meta.downloadsRemaining,
      ttlSeconds,
    );
  } catch {
    return new Response("counter unavailable", { status: 503 });
  }
  if (remaining < 0) {
    await blobDeleteEntry(meta);
    return new Response("exhausted", { status: 410 });
  }
  if (remaining === 0) {
    // Last legitimate download: best-effort metadata write purely for cron
    // visibility (CR-03). Redis stays authoritative for the allow/deny
    // decision above — this does not reintroduce the read-modify-write race
    // REL-01 removed. Without this, a blob-mode file downloaded exactly its
    // configured number of times is never reaped by the cleanup cron and
    // persists until natural expiry (up to 365 days).
    await blobWriteMeta({ ...meta, downloadsRemaining: 0 });
  }

  // Mint a short-lived presigned URL the client can fetch directly from the
  // Blob CDN. Returning it in JSON rather than via 302 redirect avoids
  // ambiguity around same-origin -> cross-origin redirect handling in some
  // browsers, and lets the client surface a clearer error if the second
  // fetch (to the CDN) fails.
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

  return Response.json({ url: presignedUrl });
}

async function handleFsDownload(
  req: NextRequest,
  id: string,
  ip: string,
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
  if (meta.passwordHash) {
    const pwLimited = await checkPasswordAttemptLimit(id, ip);
    if (pwLimited) return pwLimited;
  }
  const pwFail = await checkPassword(meta, req.headers.get("x-password"));
  if (pwFail) return pwFail;

  const onDiskSize = await blobSize(id);
  if (onDiskSize == null) return new Response("not found", { status: 404 });

  // REL-01: atomic Redis DECR replaces the metadata read-modify-write (D-08);
  // Redis is the live authority, not metadata (D-09). Fail CLOSED on outage.
  const ttlSeconds = Math.max(1, Math.ceil((meta.expiresAt - Date.now()) / 1000));
  let remaining: number;
  try {
    remaining = await decrementDownloadCounter(
      id,
      meta.downloadsRemaining,
      ttlSeconds,
    );
  } catch {
    return new Response("counter unavailable", { status: 503 });
  }
  if (remaining < 0) {
    await fsDeleteEntry(id);
    return new Response("exhausted", { status: 410 });
  }

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
  const ip = clientIp(req);
  const dlLimited = await checkDownloadLimit(ip);
  if (dlLimited) return dlLimited;
  if (getStorageMode() === "blob") return handleBlobDownload(req, id, ip);
  return handleFsDownload(req, id, ip);
}
