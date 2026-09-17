import { NextResponse } from "next/server";
import { readMeta as fsReadMeta, deleteEntry as fsDeleteEntry } from "@/lib/server-storage";
import { readMeta as blobReadMeta, deleteEntry as blobDeleteEntry } from "@/lib/blob-storage";
import { getStorageMode, resolveFiles, type StoredMeta } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readMetaForMode(id: string): Promise<StoredMeta | null> {
  if (getStorageMode() === "blob") return blobReadMeta(id);
  return fsReadMeta(id);
}

async function deleteForMode(meta: StoredMeta): Promise<void> {
  if (getStorageMode() === "blob") return blobDeleteEntry(meta);
  return fsDeleteEntry(meta.id);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const meta = await readMetaForMode(id);
  if (!meta) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (meta.expiresAt < Date.now()) {
    await deleteForMode(meta);
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }
  if (meta.downloadsRemaining <= 0) {
    await deleteForMode(meta);
    return NextResponse.json({ error: "exhausted" }, { status: 410 });
  }

  // MFL-05: single read path for both legacy single-file and multi-file
  // shares. Top-level name/type/size mirror files[0] (legacy download client
  // keeps working); files[] lists every file with one shared limit/expiry.
  const files = resolveFiles(meta);

  return NextResponse.json({
    name: files[0].name,
    type: files[0].type,
    size: files[0].size,
    files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    passwordProtected: Boolean(meta.passwordHash),
    // Never returns the emails themselves (T-05-07) — presence + length of
    // recipientEmails IS the verification-required flag (D-05-11).
    verifyRequired: Boolean(meta.recipientEmails?.length),
    downloadsRemaining: meta.downloadsRemaining,
    expiresAt: meta.expiresAt,
    // Legacy records predate this field — undefined must read as encrypted.
    encrypted: meta.encrypted !== false,
  });
}
