import { NextRequest, NextResponse } from "next/server";
import { writeMeta as fsWriteMeta } from "@/lib/server-storage";
import {
  writeMeta as blobWriteMeta,
  blobPartPathnamePrefix,
} from "@/lib/blob-storage";
import {
  getStorageMode,
  type StoredFileEntry,
  type StoredMeta,
} from "@/lib/storage";
import { sha256Hex, randomSaltBase64 } from "@/lib/crypto";
import { seedDownloadCounter } from "@/lib/redis";
import {
  MAX_BLOB_BYTES,
  MAX_FILES,
  normalizeRecipientEmails,
  validateClientMeta,
} from "@/app/api/files/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FinalizeFile {
  name: string;
  type: string;
  size: number;
  blobUrl?: string;
}

interface FinalizeBody {
  id: string;
  files: FinalizeFile[];
  password?: string;
  downloadsRemaining: number;
  expiresAt: number;
  recipientEmails?: string[];
  encrypted?: boolean;
}

const ID_RE = /^[a-f0-9]{16}$/;

function isFinalizeFile(v: unknown): v is FinalizeFile {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.name === "string" &&
    typeof o.type === "string" &&
    typeof o.size === "number" &&
    o.size > 0 &&
    o.size <= MAX_BLOB_BYTES &&
    (o.blobUrl === undefined || typeof o.blobUrl === "string")
  );
}

/**
 * POST /api/files/finalize (MFL-03). Writes exactly ONE StoredMeta describing a
 * whole multi-file share (files[] + legacy top-level from files[0]) and seeds
 * exactly ONE download counter (REL-01). The encryption key never reaches here
 * — no key/keyBase64 field is accepted or stored (T-07-03).
 *
 * In blob mode each file MUST carry a blobUrl whose pathname lives under
 * `gemba/blob/{id}/` — any foreign/prefix-mismatched blob is rejected 400
 * (T-07-01). In fs mode blobUrls are ignored (parts already written to
 * {id}/{index}.bin by the part-upload path).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Partial<FinalizeBody>;
  try {
    body = (await req.json()) as Partial<FinalizeBody>;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const id = body.id;
  if (typeof id !== "string" || !ID_RE.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const files = body.files;
  if (!Array.isArray(files) || files.length < 1 || files.length > MAX_FILES) {
    return NextResponse.json({ error: "invalid files" }, { status: 400 });
  }
  if (!files.every(isFinalizeFile)) {
    return NextResponse.json({ error: "invalid file entry" }, { status: 400 });
  }

  // Validate the shared meta (downloads/expiry/recipients/encrypted) once,
  // reusing the existing bounds via files[0] as the representative shape.
  const shared = {
    name: files[0].name,
    type: files[0].type,
    size: files[0].size,
    downloadsRemaining: body.downloadsRemaining,
    expiresAt: body.expiresAt,
    recipientEmails: body.recipientEmails,
    encrypted: body.encrypted,
  };
  if (!validateClientMeta(shared)) {
    return NextResponse.json({ error: "invalid metadata" }, { status: 400 });
  }

  const mode = getStorageMode();

  if (mode === "blob") {
    // T-07-01: every blobUrl must live under this share's prefix.
    const prefix = blobPartPathnamePrefix(id);
    for (const f of files) {
      if (typeof f.blobUrl !== "string") {
        return NextResponse.json(
          { error: "missing blobUrl" },
          { status: 400 },
        );
      }
      let pathname: string;
      try {
        pathname = new URL(f.blobUrl).pathname.replace(/^\//, "");
      } catch {
        return NextResponse.json({ error: "invalid blobUrl" }, { status: 400 });
      }
      if (!pathname.startsWith(prefix)) {
        return NextResponse.json(
          { error: "foreign blobUrl" },
          { status: 400 },
        );
      }
    }
  }

  let passwordHash: string | undefined;
  let salt: string | undefined;
  if (body.password) {
    salt = randomSaltBase64();
    passwordHash = await sha256Hex(body.password + salt);
  }

  const storedFiles: StoredFileEntry[] = files.map((f) => ({
    name: f.name.slice(0, 256),
    type: f.type.slice(0, 128),
    size: f.size,
    // fs mode: parts are addressed by {id}/{index}.bin, so drop client blobUrls.
    ...(mode === "blob" && f.blobUrl !== undefined
      ? { blobUrl: f.blobUrl }
      : {}),
  }));

  const now = Date.now();
  const stored: StoredMeta = {
    id,
    // Legacy top-level mirrors files[0] (single-file readers keep working).
    name: storedFiles[0].name,
    type: storedFiles[0].type,
    size: storedFiles[0].size,
    passwordHash,
    salt,
    downloadsRemaining: shared.downloadsRemaining,
    expiresAt: shared.expiresAt,
    createdAt: now,
    ...(mode === "blob" && storedFiles[0].blobUrl !== undefined
      ? { blobUrl: storedFiles[0].blobUrl }
      : {}),
    recipientEmails: normalizeRecipientEmails(body.recipientEmails),
    encrypted: body.encrypted,
    files: storedFiles,
  };

  if (mode === "blob") {
    await blobWriteMeta(stored);
  } else {
    await fsWriteMeta(stored);
  }

  // REL-01: seed the ONE counter for the whole share, TTL aligned to expiry.
  const ttlSeconds = Math.max(1, Math.ceil((stored.expiresAt - now) / 1000));
  await seedDownloadCounter(id, stored.downloadsRemaining, ttlSeconds);

  return NextResponse.json({ id, files: storedFiles.length });
}
