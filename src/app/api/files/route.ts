import { NextRequest, NextResponse } from "next/server";
import {
  generateId,
  writeBlobFromWebStream,
  writeMeta,
  type StoredMeta,
} from "@/lib/server-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DOWNLOADS = 100;
const MAX_EXPIRY_MS = 365 * 24 * 3600_000;
const MAX_BLOB_BYTES = 16 * 1024 ** 3; // 16 GiB

interface UploadMeta {
  name: string;
  type: string;
  size: number;
  passwordHash?: string;
  salt?: string;
  downloadsRemaining: number;
  expiresAt: number;
}

function parseMetaHeader(header: string | null): UploadMeta | null {
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    const obj = JSON.parse(decoded) as Partial<UploadMeta>;
    if (
      typeof obj.name !== "string" ||
      typeof obj.type !== "string" ||
      typeof obj.size !== "number" ||
      obj.size <= 0 ||
      obj.size > MAX_BLOB_BYTES ||
      typeof obj.downloadsRemaining !== "number" ||
      obj.downloadsRemaining < 1 ||
      obj.downloadsRemaining > MAX_DOWNLOADS ||
      typeof obj.expiresAt !== "number" ||
      obj.expiresAt <= Date.now() ||
      obj.expiresAt > Date.now() + MAX_EXPIRY_MS
    ) {
      return null;
    }
    if (
      obj.passwordHash !== undefined &&
      (typeof obj.passwordHash !== "string" || typeof obj.salt !== "string")
    ) {
      return null;
    }
    return obj as UploadMeta;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const meta = parseMetaHeader(req.headers.get("x-meta"));
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

  const stored: StoredMeta = {
    id,
    name: meta.name.slice(0, 256),
    type: meta.type.slice(0, 128),
    size: meta.size,
    passwordHash: meta.passwordHash,
    salt: meta.salt,
    downloadsRemaining: meta.downloadsRemaining,
    expiresAt: meta.expiresAt,
    createdAt: Date.now(),
  };

  await writeMeta(stored);

  return NextResponse.json({ id });
}
