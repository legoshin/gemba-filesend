import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  generateId,
  writeBlobFromWebStream,
  writeMeta as fsWriteMeta,
} from "@/lib/server-storage";
import { writeMeta as blobWriteMeta, blobPathnamePrefix } from "@/lib/blob-storage";
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
}>(obj: T): obj is T & {
  name: string;
  type: string;
  size: number;
  downloadsRemaining: number;
  expiresAt: number;
  recipientEmails?: string[];
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
    isValidRecipientEmailsField(obj.recipientEmails)
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
        const payload = JSON.parse(clientPayloadStr) as Partial<ClientPayload>;

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
        const decoded = JSON.parse(tp) as UploadMetaPayload & { id: string };
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

async function handleDirectUpload(req: NextRequest): Promise<NextResponse> {
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
