import { NextRequest, NextResponse } from "next/server";
import { sendShareNotificationEmail } from "@/lib/mailgun";
import { checkNotifyLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Recipient cap per notify call (mirrors MAX_RECIPIENT_EMAILS in
 *  src/app/api/files/route.ts, T-06-01/T-06-03). */
const MAX_RECIPIENTS = 10;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Bounds a share-link URL (T-06-02) — well above any real share-link
 *  length, generous enough for future growth without allowing abuse. */
const MAX_LINK_URL_LENGTH = 2048;

export interface NotifyLink {
  fileName: string;
  url: string;
}

interface NotifyBody {
  recipients: string[];
  links: NotifyLink[];
}

export type ValidateNotifyBodyResult =
  | ({ ok: true } & NotifyBody)
  | { ok: false; reason: string };

function isValidRecipients(v: unknown): v is string[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.length <= MAX_RECIPIENTS &&
    v.every(
      (e) =>
        typeof e === "string" &&
        e.length > 0 &&
        e.length <= MAX_EMAIL_LENGTH &&
        EMAIL_RE.test(e),
    )
  );
}

/**
 * A link's url must parse as an absolute http(s) URL, be bounded in length,
 * and share the request's origin — the endpoint must never be usable as an
 * open relay to email an arbitrary off-origin URL (T-06-02).
 */
function isValidLink(v: unknown, requestOrigin: string): v is NotifyLink {
  if (typeof v !== "object" || v === null) return false;
  const { fileName, url } = v as { fileName?: unknown; url?: unknown };
  if (typeof fileName !== "string" || fileName.length === 0) return false;
  if (typeof url !== "string" || url.length === 0 || url.length > MAX_LINK_URL_LENGTH) {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
    parsed.origin === requestOrigin
  );
}

function isValidLinks(v: unknown, requestOrigin: string): v is NotifyLink[] {
  return (
    Array.isArray(v) && v.length > 0 && v.every((l) => isValidLink(l, requestOrigin))
  );
}

/**
 * Pure, unit-testable validator for the notify request body (mirrors
 * validateClientMeta in src/app/api/files/route.ts). Returns the normalized
 * body on success, or a reason string on rejection.
 */
export function validateNotifyBody(
  body: unknown,
  requestOrigin: string,
): ValidateNotifyBodyResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, reason: "invalid body" };
  }
  const obj = body as { recipients?: unknown; links?: unknown };

  if (!isValidRecipients(obj.recipients)) {
    return { ok: false, reason: "invalid recipients" };
  }
  if (!isValidLinks(obj.links, requestOrigin)) {
    return { ok: false, reason: "invalid links" };
  }

  return { ok: true, recipients: obj.recipients, links: obj.links };
}

/**
 * Notifies each recipient that a file was shared with them, relaying the
 * real download link(s) — including any `#key` fragment (D-06-01, LOCKED
 * E2E exception). Sends one Mailgun email per recipient (D-06-07, T-06-03 —
 * never a shared To/CC), with every recipient's email iterating all links
 * (D-06-09). Fails loud with HTTP 500 on a Mailgun error so a misconfigured
 * deploy never surfaces as a silent "sent" response (T-06-06).
 */
export async function POST(req: NextRequest): Promise<Response> {
  const ip = clientIp(req);

  const limited = await checkNotifyLimit(ip);
  if (limited) return limited;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const result = validateNotifyBody(rawBody, req.nextUrl.origin);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  try {
    for (const recipient of result.recipients) {
      // One Mailgun send per recipient (never a combined `to`), each
      // enumerating every link the upload produced.
      await sendShareNotificationEmail(recipient, result.links);
    }
  } catch (err) {
    console.error("notify: sendShareNotificationEmail failed", err);
    return NextResponse.json({ error: "send failed" }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
