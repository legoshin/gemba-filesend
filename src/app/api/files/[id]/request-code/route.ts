import { NextRequest, NextResponse } from "next/server";
import { readMeta as fsReadMeta } from "@/lib/server-storage";
import { readMeta as blobReadMeta } from "@/lib/blob-storage";
import { getStorageMode, type StoredMeta } from "@/lib/storage";
import { generateSixDigitCode, storeVerificationCode } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/mailgun";
import { checkRequestCodeLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EMAIL_LENGTH = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readMetaForMode(id: string): Promise<StoredMeta | null> {
  if (getStorageMode() === "blob") return blobReadMeta(id);
  return fsReadMeta(id);
}

/**
 * Always returns the same generic `{ sent: true }` response, whether or not
 * the submitted email is a stored recipient, whether or not the file exists,
 * and whether or not the file is verify-gated (T-05-01 / RESEARCH Pattern 2
 * / Pitfall 4) — an attacker must never be able to use this endpoint as a
 * membership oracle. Mailgun is invoked only on a real membership match; a
 * Mailgun/env failure on that path is the one case allowed to surface a
 * non-200 (D-05-06 fail-loud) since it only fires when the file/email are
 * real and misconfiguration must not be silently swallowed.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const ip = clientIp(req);

  const limited = await checkRequestCodeLimit(id, ip);
  if (limited) return limited;

  let email: unknown;
  try {
    const body = (await req.json()) as { email?: unknown };
    email = body.email;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (
    typeof email !== "string" ||
    email.length === 0 ||
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_RE.test(email)
  ) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const meta = await readMetaForMode(id);
  const normalized = email.trim().toLowerCase();
  const isRecipient =
    meta != null &&
    meta.expiresAt >= Date.now() &&
    meta.downloadsRemaining > 0 &&
    (meta.recipientEmails?.includes(normalized) ?? false);

  if (isRecipient && meta) {
    const code = generateSixDigitCode();
    await storeVerificationCode(id, code);
    try {
      await sendVerificationEmail(normalized, code, meta.name);
    } catch (err) {
      // FAIL LOUD (D-05-06): missing/invalid Mailgun env or a Mailgun API
      // error must surface as a 500 + server log, never a silent "sent"
      // response — this is the only branch where the file/email are
      // confirmed real, so failing loud here never leaks membership on the
      // non-match path.
      console.error("request-code: sendVerificationEmail failed", err);
      return NextResponse.json({ error: "send failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ sent: true });
}
