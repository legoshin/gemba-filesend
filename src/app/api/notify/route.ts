import { NextRequest, NextResponse } from "next/server";
import { sendShareNotificationEmail } from "@/lib/mailgun";
import { checkNotifyLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NotifyLink {
  fileName: string;
  url: string;
}

interface NotifyBody {
  recipients: string[];
  links: NotifyLink[];
}

/**
 * Minimal shape check for the tracer slice: non-empty recipients + non-empty
 * links, each link carrying a fileName and url. Task 2 hardens this into a
 * fully validated, exported `validateNotifyBody`.
 */
function isValidNotifyBody(body: unknown): body is NotifyBody {
  if (typeof body !== "object" || body === null) return false;
  const obj = body as { recipients?: unknown; links?: unknown };
  return (
    Array.isArray(obj.recipients) &&
    obj.recipients.length > 0 &&
    obj.recipients.every((r) => typeof r === "string" && r.length > 0) &&
    Array.isArray(obj.links) &&
    obj.links.length > 0 &&
    obj.links.every(
      (l): l is NotifyLink =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as NotifyLink).fileName === "string" &&
        (l as NotifyLink).fileName.length > 0 &&
        typeof (l as NotifyLink).url === "string" &&
        (l as NotifyLink).url.length > 0,
    )
  );
}

/**
 * Notifies each recipient that a file was shared with them, relaying the
 * real download link(s) — including any `#key` fragment (D-06-01, LOCKED
 * E2E exception). Sends one Mailgun email per recipient (D-06-07, never a
 * shared To/CC). Fails loud with HTTP 500 on a Mailgun error so a
 * misconfigured deploy never surfaces as a silent "sent" response.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const ip = clientIp(req);

  const limited = await checkNotifyLimit(ip);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!isValidNotifyBody(body)) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  try {
    for (const recipient of body.recipients) {
      await sendShareNotificationEmail(recipient, body.links);
    }
  } catch (err) {
    console.error("notify: sendShareNotificationEmail failed", err);
    return NextResponse.json({ error: "send failed" }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
