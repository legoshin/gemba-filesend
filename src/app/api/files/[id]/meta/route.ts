import { NextResponse } from "next/server";
import { readMeta as fsReadMeta, deleteEntry as fsDeleteEntry } from "@/lib/server-storage";
import { readMeta as blobReadMeta, deleteEntry as blobDeleteEntry } from "@/lib/blob-storage";
import { getStorageMode, type StoredMeta } from "@/lib/storage";

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

  return NextResponse.json({
    name: meta.name,
    type: meta.type,
    size: meta.size,
    passwordProtected: Boolean(meta.passwordHash),
    downloadsRemaining: meta.downloadsRemaining,
    expiresAt: meta.expiresAt,
  });
}
