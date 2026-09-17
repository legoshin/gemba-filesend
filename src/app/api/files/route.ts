import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  generateId,
  writeBlobFromWebStream,
  writeBlobPartFromWebStream,
  writeMeta as fsWriteMeta,
} from "@/lib/server-storage";
import {
  writeMeta as blobWriteMeta,
  blobPathnamePrefix,
  blobPartPathnamePrefix,
} from "@/lib/blob-storage";
import { getStorageMode, type StoredMeta } from "@/lib/storage";
import { sha256Hex, randomSaltBase64 } from "@/lib/crypto";
import { checkUploadLimit } from "@/lib/rate-limit";
import { seedDownloadCounter } from "@/lib/redis";
import { clientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const MAX_DOWNLOADS = 100;
export const MAX_EXPIRY_MS = 365 * 24 * 3600_000;
export const MAX_BLOB_BYTES = 15 * 1024 ** 3; // 15 GiB
/** Max files in a single multi-file share (MFL-03, T-07-04 DoS cap) — keeps
 *  StoredMeta JSON small and bounds per-share upload/download fan-out. */
export const MAX_FILES = 25;
/** Recipient email cap per upload (D-05-05) — keeps StoredMeta JSON small
 *  and caps Mailgun send volume/file. */
export const MAX_RECIPIENT_EMAILS = 10;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ClientPayload {
  id: string;
  name: string;
  type: string;
  size: number;
  password?: string;
  downloadsRemaining: number;
  expiresAt: number;
  recipientEmails?: string[];
  /** Explicit `false` marks a user-chosen unencrypted-upload fallback. */
  encrypted?: boolean;
}

interface UploadMetaPayload {
  name: string;
  type: string;
  size: number;
  passwordHash?: string;
  salt?: string;
  downloadsRemaining: number;
  expiresAt: number;
  recipientEmails?: string[];
  encrypted?: boolean;
}

/**
 * clientPayload for a multi-file part upload (MFL-03). The token it mints is
 * marked `finalize: true` so onUploadCompleted writes NO meta and seeds NO
 * counter — the /api/files/finalize route owns the single meta write + seed for
 * the whole share (avoids per-part meta races). Only the share id, part index,
 * and part size are needed at mint time; all shared meta (downloads/expiry/
 * password/recipients) is supplied to finalize instead.
 */
interface PartClientPayload {
  finalize: true;
  id: string;
  index: number;
  total: number;
  size: number;
}

/** Token payload for a finalize-owned part upload. */
interface PartTokenPayload {
  finalize: true;
  id: string;
  index: number;
}

function isPartClientPayload(p: unknown): p is PartClientPayload {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    o.finalize === true &&
    typeof o.id === "string" &&
    o.id.length > 0 &&
    typeof o.index === "number" &&
    Number.isInteger(o.index) &&
    o.index >= 0 &&
    typeof o.total === "number" &&
    Number.isInteger(o.total) &&
    o.total >= 1 &&
    o.total <= MAX_FILES &&
    o.index < o.total &&
    typeof o.size === "number" &&
    o.size > 0 &&
    o.size <= MAX_BLOB_BYTES
  );
}

/**
 * Normalizes a client-supplied recipientEmails value: undefined/empty array
 * both collapse to `undefined` (no verification, D-05-11/Pitfall 5 — presence
 * + non-empty length of the stored array IS the verifyRequired flag, so an
 * empty array must never be stored as a truthy-length marker). Otherwise
 * trims + lowercases every entry.
 */
export function normalizeRecipientEmails(
  v: unknown,
): string[] | undefined {
  if (!Array.isArray(v) || v.length === 0) return undefined;
  return v.map((e) => String(e).trim().toLowerCase());
}

function isValidRecipientEmailsField(v: unknown): boolean {
  if (v === undefined) return true;
  if (!Array.isArray(v)) return false;
  if (v.length > MAX_RECIPIENT_EMAILS) return false;
  return v.every(
    (e) =>
      typeof e === "string" &&
      e.length > 0 &&
      e.length <= MAX_EMAIL_LENGTH &&
      EMAIL_RE.test(e),
  );
}

export function validateClientMeta<T extends {
  name?: unknown;
  type?: unknown;
  size?: unknown;
  downloadsRemaining?: unknown;
  expiresAt?: unknown;
  recipientEmails?: unknown;
  encrypted?: unknown;
}>(obj: T): obj is T & {
  name: string;
  type: string;
  size: number;
  downloadsRemaining: number;
  expiresAt: number;
  recipientEmails?: string[];
  encrypted?: boolean;
} {
  return (
    typeof obj.name === "string" &&
    typeof obj.type === "string" &&
    typeof obj.size === "number" &&
    obj.size > 0 &&
    obj.size <= MAX_BLOB_BYTES &&
    typeof obj.downloadsRemaining === "number" &&
    obj.downloadsRemaining >= 1 &&
    obj.downloadsRemaining <= MAX_DOWNLOADS &&
    typeof obj.expiresAt === "number" &&
    obj.expiresAt > Date.now() &&
    obj.expiresAt <= Date.now() + MAX_EXPIRY_MS &&
    isValidRecipientEmailsField(obj.recipientEmails) &&
    (obj.encrypted === undefined || typeof obj.encrypted === "boolean")
  );
}

async function handleBlobUpload(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayloadStr) => {
        if (!clientPayloadStr) throw new Error("missing client payload");
        const rawPayload = JSON.parse(clientPayloadStr) as unknown;

        // Multi-file part (MFL-03): finalize-owned. The token carries only the
        // share id + index; onUploadCompleted skips meta/seed for it. The part
        // pathname MUST live under the trailing-slash share prefix, which also
        // blocks id-prefix collisions across shares (T-07-02).
        if (
          typeof rawPayload === "object" &&
          rawPayload !== null &&
          (rawPayload as Record<string, unknown>).finalize === true
        ) {
          if (!isPartClientPayload(rawPayload)) {
            throw new Error("invalid part metadata");
          }
          if (!pathname.startsWith(blobPartPathnamePrefix(rawPayload.id))) {
            throw new Error("pathname mismatch");
          }
          const partToken: PartTokenPayload = {
            finalize: true,
            id: rawPayload.id,
            index: rawPayload.index,
          };
          return {
            allowedContentTypes: ["application/octet-stream"],
            maximumSizeInBytes: MAX_BLOB_BYTES,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify(partToken),
          };
        }

        // Legacy single-file upload (no finalize marker): onUploadCompleted
        // writes the meta + seeds the counter itself, unchanged.
        const payload = rawPayload as Partial<ClientPayload>;

        if (!payload.id || typeof payload.id !== "string") {
          throw new Error("invalid id");
        }
        const expectedPrefix = blobPathnamePrefix(payload.id);
        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error("pathname mismatch");
        }
        if (!validateClientMeta(payload)) {
          throw new Error("invalid metadata");
        }

        let passwordHash: string | undefined;
        let salt: string | undefined;
        if (payload.password) {
          salt = randomSaltBase64();
          passwordHash = await sha256Hex(payload.password + salt);
        }

        const tokenPayload: UploadMetaPayload & { id: string } = {
          id: payload.id,
          name: payload.name,
          type: payload.type,
          size: payload.size,
          passwordHash,
          salt,
          downloadsRemaining: payload.downloadsRemaining,
          expiresAt: payload.expiresAt,
          recipientEmails: normalizeRecipientEmails(payload.recipientEmails),
          encrypted: payload.encrypted,
        };

        return {
          allowedContentTypes: ["application/octet-stream"],
          maximumSizeInBytes: MAX_BLOB_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify(tokenPayload),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload: tp }) => {
        if (!tp) return;
        const decodedUnknown = JSON.parse(tp) as unknown;
        // Finalize-owned part: the finalize route writes the single meta and
        // seeds the one counter for the whole share, so a part upload must NOT
        // write meta or seed here (avoids per-part meta races + double seeds).
        if (
          typeof decodedUnknown === "object" &&
          decodedUnknown !== null &&
          (decodedUnknown as Record<string, unknown>).finalize === true
        ) {
          return;
        }
        const decoded = decodedUnknown as UploadMetaPayload & { id: string };
        const stored: StoredMeta = {
          id: decoded.id,
          name: decoded.name,
          type: decoded.type,
          size: decoded.size,
          passwordHash: decoded.passwordHash,
          salt: decoded.salt,
          downloadsRemaining: decoded.downloadsRemaining,
          expiresAt: decoded.expiresAt,
          createdAt: Date.now(),
          blobUrl: blob.url,
          recipientEmails: decoded.recipientEmails,
          encrypted: decoded.encrypted,
        };
        await blobWriteMeta(stored);
        // REL-01: Redis is the live download-counter authority (D-09). Seed
        // dl:{id} to the limit with a TTL aligned to file expiry (D-08).
        const ttlSeconds = Math.max(
          1,
          Math.ceil((stored.expiresAt - Date.now()) / 1000),
        );
        await seedDownloadCounter(
          stored.id,
          stored.downloadsRemaining,
          ttlSeconds,
        );
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function parseDirectMetaHeader(header: string | null): UploadMetaPayload | null {
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    const obj = JSON.parse(decoded) as Partial<UploadMetaPayload>;
    if (!validateClientMeta(obj)) return null;
    if (
      obj.passwordHash !== undefined &&
      (typeof obj.passwordHash !== "string" || typeof obj.salt !== "string")
    ) {
      return null;
    }
    return obj as UploadMetaPayload;
  } catch {
    return null;
  }
}

const FS_ID_RE = /^[a-f0-9]{16}$/;

/**
 * Multi-file part upload in fs mode (MFL-03): the client streams one encrypted
 * part with x-file-id + x-file-index headers. The part lands at {id}/{index}.bin
 * and NO meta is written and NO counter is seeded — the /api/files/finalize
 * route owns the single meta write + seed for the whole share.
 */
async function handleDirectPartUpload(
  req: NextRequest,
  id: string,
  indexHeader: string,
): Promise<NextResponse> {
  if (!FS_ID_RE.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const index = Number(indexHeader);
  if (!Number.isInteger(index) || index < 0 || index >= MAX_FILES) {
    return NextResponse.json({ error: "invalid index" }, { status: 400 });
  }
  if (!req.body) {
    return NextResponse.json({ error: "missing body" }, { status: 400 });
  }
  try {
    await writeBlobPartFromWebStream(id, index, req.body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: `store failed: ${message}` },
      { status: 500 },
    );
  }
  return NextResponse.json({ id, index });
}

async function handleDirectUpload(req: NextRequest): Promise<NextResponse> {
  // Multi-file part branch: presence of x-file-id + x-file-index marks a part
  // upload (finalize owns meta+seed). Absence keeps the legacy single-file path.
  const partId = req.headers.get("x-file-id");
  const partIndex = req.headers.get("x-file-index");
  if (partId !== null && partIndex !== null) {
    return handleDirectPartUpload(req, partId, partIndex);
  }

  const meta = parseDirectMetaHeader(req.headers.get("x-meta"));
  if (!meta) {
    return NextResponse.json({ error: "invalid metadata" }, { status: 400 });
  }
  if (!req.body) {
    return NextResponse.json({ error: "missing body" }, { status: 400 });
  }

  const id = generateId();

  try {
    await writeBlobFromWebStream(id, req.body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: `store failed: ${message}` },
      { status: 500 },
    );
  }

  await fsWriteMeta({
    id,
    name: meta.name.slice(0, 256),
    type: meta.type.slice(0, 128),
    size: meta.size,
    passwordHash: meta.passwordHash,
    salt: meta.salt,
    downloadsRemaining: meta.downloadsRemaining,
    expiresAt: meta.expiresAt,
    createdAt: Date.now(),
    recipientEmails: normalizeRecipientEmails(meta.recipientEmails),
    encrypted: meta.encrypted,
  });

  // REL-01: seed the atomic download counter symmetrically with the blob path
  // (dual-mode parity) — Redis is the live authority (D-08/D-09).
  const ttlSeconds = Math.max(1, Math.ceil((meta.expiresAt - Date.now()) / 1000));
  await seedDownloadCounter(id, meta.downloadsRemaining, ttlSeconds);

  return NextResponse.json({ id });
}

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  const limited = await checkUploadLimit(clientIp(req));
  if (limited) return limited;

  if (getStorageMode() === "blob") {
    return handleBlobUpload(req);
  }
  return handleDirectUpload(req);
}
