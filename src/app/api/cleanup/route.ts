import { NextRequest, NextResponse } from "next/server";
import { list, get } from "@vercel/blob";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { deleteEntry as blobDeleteEntry } from "@/lib/blob-storage";
import {
  deleteEntry as fsDeleteEntry,
  readMeta as fsReadMeta,
} from "@/lib/server-storage";
import { getStorageMode, type StoredMeta } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Scanning a large store can take a while; give the function room to finish.
export const maxDuration = 300;

interface CleanupStats {
  mode: "blob" | "fs";
  scanned: number;
  deletedExpired: number;
  deletedExhausted: number;
  errors: number;
}

async function cleanupBlob(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    mode: "blob",
    scanned: 0,
    deletedExpired: 0,
    deletedExhausted: 0,
    errors: 0,
  };
  const now = Date.now();
  let cursor: string | undefined;

  do {
    const page = await list({
      prefix: "gemba/meta/",
      cursor,
      limit: 1000,
    });
    for (const entry of page.blobs) {
      stats.scanned++;
      try {
        const r = await get(entry.pathname, { access: "private" });
        if (!r || r.statusCode !== 200) continue;
        const text = await new Response(r.stream).text();
        const meta = JSON.parse(text) as StoredMeta;

        if (meta.expiresAt < now) {
          await blobDeleteEntry(meta);
          stats.deletedExpired++;
        } else if (meta.downloadsRemaining <= 0) {
          await blobDeleteEntry(meta);
          stats.deletedExhausted++;
        }
      } catch {
        stats.errors++;
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return stats;
}

async function cleanupFs(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    mode: "fs",
    scanned: 0,
    deletedExpired: 0,
    deletedExhausted: 0,
    errors: 0,
  };
  const dir =
    process.env.GEMBA_STORAGE_DIR ?? path.join(process.cwd(), "data");
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return stats; // dir doesn't exist yet — nothing to clean
  }
  const now = Date.now();
  for (const file of entries) {
    if (!file.endsWith(".json")) continue;
    const id = file.replace(/\.json$/, "");
    stats.scanned++;
    try {
      const meta = await fsReadMeta(id);
      if (!meta) continue;
      if (meta.expiresAt < now) {
        await fsDeleteEntry(id);
        stats.deletedExpired++;
      } else if (meta.downloadsRemaining <= 0) {
        await fsDeleteEntry(id);
        stats.deletedExhausted++;
      }
    } catch {
      stats.errors++;
    }
  }
  return stats;
}

function isAuthorized(req: NextRequest): boolean {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>. The secret is
  // provisioned automatically when a cron is configured. In local dev (no
  // CRON_SECRET set), allow manual triggering so the route is testable.
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const stats =
    getStorageMode() === "blob" ? await cleanupBlob() : await cleanupFs();
  return NextResponse.json(stats);
}
