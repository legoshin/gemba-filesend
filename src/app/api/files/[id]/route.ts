import { NextRequest } from "next/server";
import { Readable } from "node:stream";
import { issueSignedToken, presignUrl } from "@vercel/blob";
import {
  blobSize,
  blobPartSize,
  openBlobReadStream,
  openBlobPartReadStream,
  readMeta as fsReadMeta,
  deleteEntry as fsDeleteEntry,
} from "@/lib/server-storage";
import {
  readMeta as blobReadMeta,
  writeMeta as blobWriteMeta,
  deleteEntry as blobDeleteEntry,
} from "@/lib/blob-storage";
import { getStorageMode, resolveFiles, type StoredMeta } from "@/lib/storage";
import { sha256Hex } from "@/lib/crypto";
import {
  checkDownloadLimit,
  checkPasswordAttemptLimit,
} from "@/lib/rate-limit";
import {
  decrementDownloadCounter,
  peekDownloadCounter,
  type RedisLike,
} from "@/lib/redis";
import { isVerifyTokenValid } from "@/lib/verification";
import { clientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRESIGN_TTL_MS = 5 * 60_000;

/**
 * Parses the two Phase-7 read params (MFL-03 / REL-01):
 *   - `index`  — which file in the share to serve (default 0).
 *   - `consume` — "1" (default) spends one download for the WHOLE share;
 *     "0" is a non-decrementing read (still gated on the shared limit).
 * Default consume="1" preserves legacy single-file behavior exactly (one
 * decrement per download).
 */
function parseReadParams(req: NextRequest): { index: number; consume: boolean } {
  const sp = req.nextUrl.searchParams;
  const rawIndex = sp.get("index");
  const index = rawIndex === null ? 0 : Number(rawIndex);
  const consume = sp.get("consume") !== "0";
  return { index, consume };
}

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

/**
 * Recipient-email verification gate (Phase 5, VERIFY-05). Positioned
 * identically to checkPassword() and called BEFORE it in both download
 * handlers, so an unverified/failed request never reaches
 * decrementDownloadCounter() (RESEARCH Pitfall 2 / T-05-06).
 *
 * FAIL CLOSED on a Redis error (503) — mirrors the existing
 * "counter unavailable" 503 below rather than silently allowing the
 * download (T-05-08).
 */
export async function checkVerification(
  id: string,
  meta: StoredMeta,
  token: string | null,
  redis?: RedisLike,
): Promise<Response | null> {
  if (!meta.recipientEmails?.length) return null; // not gated
  if (!token) return new Response("verification required", { status: 401 });
  let ok: boolean;
  try {
    ok = await isVerifyTokenValid(id, token, redis);
  } catch {
    return new Response("verification unavailable", { status: 503 });
  }
  if (!ok) {
    return new Response("invalid or expired verification", { status: 403 });
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
  const verifyFail = await checkVerification(
    id,
    meta,
    req.headers.get("x-verify-token"),
  );
  if (verifyFail) return verifyFail;
  if (meta.passwordHash) {
    const pwLimited = await checkPasswordAttemptLimit(id, ip);
    if (pwLimited) return pwLimited;
  }
  const pwFail = await checkPassword(meta, req.headers.get("x-password"));
  if (pwFail) return pwFail;

  // MFL-03: resolve the requested file within the share (legacy no-files meta
  // resolves to a single entry at index 0 carrying meta.blobUrl).
  const { index, consume } = parseReadParams(req);
  const files = resolveFiles(meta);
  const target = files[index];
  if (!target) return new Response("not found", { status: 404 });
  if (!target.blobUrl) return new Response("blob missing", { status: 500 });

  // REL-01 counter policy: consume="1" (default) spends exactly ONE download
  // for the whole share; consume="0" enforces the shared limit WITHOUT
  // decrementing. Fail CLOSED on Redis error for the consuming path.
  const ttlSeconds = Math.max(1, Math.ceil((meta.expiresAt - Date.now()) / 1000));
  if (consume) {
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
      // Last legitimate whole-share download: best-effort metadata write purely
      // for cron visibility (CR-03). Redis stays authoritative for the
      // allow/deny decision above. Only the WHOLE share is reaped, never per
      // file. Without this, a blob-mode share downloaded exactly its configured
      // number of times is never reaped by the cleanup cron until expiry.
      await blobWriteMeta({ ...meta, downloadsRemaining: 0 });
    }
  } else {
    // Non-decrementing gate: refuse when the shared counter is exhausted.
    let peek: number | null;
    try {
      peek = await peekDownloadCounter(id);
    } catch {
      return new Response("counter unavailable", { status: 503 });
    }
    if (peek !== null && peek <= 0) {
      return new Response("exhausted", { status: 410 });
    }
  }

  // Mint a short-lived presigned URL the client can fetch directly from the
  // Blob CDN. Returning it in JSON rather than via 302 redirect avoids
  // ambiguity around same-origin -> cross-origin redirect handling in some
  // browsers, and lets the client surface a clearer error if the second
  // fetch (to the CDN) fails.
  let pathname: string;
  try {
    pathname = new URL(target.blobUrl).pathname.replace(/^\//, "");
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
  const verifyFail = await checkVerification(
    id,
    meta,
    req.headers.get("x-verify-token"),
  );
  if (verifyFail) return verifyFail;
  if (meta.passwordHash) {
    const pwLimited = await checkPasswordAttemptLimit(id, ip);
    if (pwLimited) return pwLimited;
  }
  const pwFail = await checkPassword(meta, req.headers.get("x-password"));
  if (pwFail) return pwFail;

  // MFL-03: multi-file parts live at {id}/{index}.bin; a legacy no-files meta
  // still streams {id}.bin at index 0.
  const { index, consume } = parseReadParams(req);
  const files = resolveFiles(meta);
  const target = files[index];
  if (!target) return new Response("not found", { status: 404 });
  const isMultiFile = Array.isArray(meta.files) && meta.files.length > 0;
  const onDiskSize = isMultiFile
    ? await blobPartSize(id, index)
    : await blobSize(id);
  if (onDiskSize == null) return new Response("not found", { status: 404 });

  // REL-01 counter policy: consume="1" (default) spends ONE download for the
  // whole share; consume="0" enforces the shared limit WITHOUT decrementing.
  const ttlSeconds = Math.max(1, Math.ceil((meta.expiresAt - Date.now()) / 1000));
  let deleteOnClose = false;
  if (consume) {
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
    // Reap the WHOLE share (never per file) once the shared counter hits 0.
    deleteOnClose = remaining === 0;
  } else {
    let peek: number | null;
    try {
      peek = await peekDownloadCounter(id);
    } catch {
      return new Response("counter unavailable", { status: 503 });
    }
    if (peek !== null && peek <= 0) {
      return new Response("exhausted", { status: 410 });
    }
  }

  const nodeStream = isMultiFile
    ? openBlobPartReadStream(id, index)
    : openBlobReadStream(id);
  if (deleteOnClose) {
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
