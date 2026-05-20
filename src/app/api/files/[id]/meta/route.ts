import { NextResponse } from "next/server";
import { deleteEntry, readMeta } from "@/lib/server-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const meta = await readMeta(id);
  if (!meta) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (meta.expiresAt < Date.now()) {
    await deleteEntry(id);
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }
  if (meta.downloadsRemaining <= 0) {
    await deleteEntry(id);
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
