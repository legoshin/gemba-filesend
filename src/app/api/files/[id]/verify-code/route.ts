import { NextRequest, NextResponse } from "next/server";
import { verifyCode, issueVerifyToken } from "@/lib/verification";
import { checkVerifyAttemptLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_RE = /^\d{6}$/;

/**
 * Verifies a submitted 6-digit code against the stored code for `id`. On a
 * match, mints the reusable verify-token (D-05-04) the client resends as
 * `x-verify-token` on GET /api/files/[id]. Never distinguishes
 * invalid/expired/locked/none in the response body — a generic 403 avoids
 * turning this into an oracle (mirrors request-code's enumeration-safety).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const ip = clientIp(req);

  const limited = await checkVerifyAttemptLimit(id, ip);
  if (limited) return limited;

  let code: unknown;
  try {
    const body = (await req.json()) as { code?: unknown };
    code = body.code;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (typeof code !== "string" || !CODE_RE.test(code)) {
    return NextResponse.json({ verified: false }, { status: 403 });
  }

  const result = await verifyCode(id, code);
  if (result === "ok") {
    const token = await issueVerifyToken(id);
    return NextResponse.json({ verified: true, token });
  }

  return NextResponse.json({ verified: false }, { status: 403 });
}
