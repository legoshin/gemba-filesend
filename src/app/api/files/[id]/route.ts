import { NextRequest } from "next/server";
import { Readable } from "node:stream";
import {
  blobSize,
  deleteEntry,
  openBlobReadStream,
  readMeta,
  writeMeta,
} from "@/lib/server-storage";
import { sha256Hex } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const meta = await readMeta(id);
  if (!meta) {
    return new Response("not found", { status: 404 });
  }
  if (meta.expiresAt < Date.now()) {
    await deleteEntry(id);
    return new Response("expired", { status: 410 });
  }
  if (meta.downloadsRemaining <= 0) {
    await deleteEntry(id);
    return new Response("exhausted", { status: 410 });
  }

  if (meta.passwordHash) {
    const provided = req.headers.get("x-password") ?? "";
    if (!provided) {
      return new Response("password required", { status: 401 });
    }
    const candidate = await sha256Hex(provided + (meta.salt ?? ""));
    if (candidate !== meta.passwordHash) {
      return new Response("invalid password", { status: 403 });
    }
  }

  const onDiskSize = await blobSize(id);
  if (onDiskSize == null) {
    return new Response("not found", { status: 404 });
  }

  const remaining = meta.downloadsRemaining - 1;
  await writeMeta({ ...meta, downloadsRemaining: remaining });

  const nodeStream = openBlobReadStream(id);
  if (remaining === 0) {
    nodeStream.on("close", () => {
      void deleteEntry(id);
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
