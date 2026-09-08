import { NextResponse } from "next/server";
import { getStorageMode } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ mode: getStorageMode() });
}
