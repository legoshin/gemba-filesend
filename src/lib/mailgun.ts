// Mailgun verification-code sender (Phase 5, D-05-06). Bare `fetch` + native
// `FormData` — no SDK, no new npm package (RESEARCH Pattern 3 / CONTEXT.md
// explicit instruction). Reads MAILGUN_API_KEY/DOMAIN/SENDING_REGION/FROM
// from env at call time (never hardcoded, never provisioned via marketplace).
//
// FAIL LOUD (D-05-06): any missing required env var throws a clear Error
// instead of silently no-op'ing — a misconfigured deploy must surface as an
// HTTP 500 + server log, never a silent "success" that leaves a real
// recipient waiting on an email that was never sent.

const REGION_BASE_URL: Record<"us" | "eu", string> = {
  us: "https://api.mailgun.net",
  eu: "https://api.eu.mailgun.net",
};

/**
 * Resolves the Mailgun API base URL from MAILGUN_SENDING_REGION (default
 * "us", D-05-06). Case-insensitive; any value other than "eu" resolves to
 * the US base URL. Exported so region resolution is unit-testable without a
 * live network call.
 */
export function mailgunBaseUrl(): string {
  const region = (process.env.MAILGUN_SENDING_REGION ?? "us").toLowerCase();
  return REGION_BASE_URL[region === "eu" ? "eu" : "us"];
}

/**
 * Sends the one-time verification code to `toEmail` via the Mailgun HTTP API.
 * Throws (never silently no-ops) when MAILGUN_API_KEY / MAILGUN_DOMAIN /
 * MAILGUN_FROM is unset, or when the Mailgun API responds non-OK — the
 * caller (request-code route) lets this propagate to a 500 + console.error
 * (D-05-06 fail-loud).
 */
export async function sendVerificationEmail(
  toEmail: string,
  code: string,
  fileName: string,
): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM;
  if (!apiKey || !domain || !from) {
    throw new Error("Mailgun env vars not configured");
  }

  const form = new FormData();
  form.set("from", from);
  form.set("to", toEmail);
  form.set("subject", "Your Gemba Filesend verification code");
  form.set(
    "text",
    `Your verification code is ${code}. It expires in 10 minutes.\n\n` +
      `Someone shared "${fileName}" with you via Gemba Filesend.`,
  );

  const res = await fetch(`${mailgunBaseUrl()}/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mailgun send failed: HTTP ${res.status} ${text}`);
  }
}

/**
 * Notifies `toEmail` that a file was shared with them, listing every link
 * the upload produced (Phase 6, D-06-02/D-06-09). Mirrors
 * `sendVerificationEmail`: bare fetch + native FormData, fail-loud on a
 * missing env var or a non-OK Mailgun response. Sends to exactly ONE
 * recipient per call — callers must loop per-recipient rather than passing
 * a combined `to` list (D-06-07, never a shared To/CC).
 */
export async function sendShareNotificationEmail(
  toEmail: string,
  links: Array<{ fileName: string; url: string }>,
): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM;
  if (!apiKey || !domain || !from) {
    throw new Error("Mailgun env vars not configured");
  }

  const linkLines = links
    .map(({ fileName, url }) => `${fileName}: ${url}`)
    .join("\n");

  const form = new FormData();
  form.set("from", from);
  form.set("to", toEmail);
  form.set("subject", "A file was shared with you via Gemba Filesend");
  form.set(
    "text",
    `Someone shared a file with you via Gemba Filesend.\n\n${linkLines}`,
  );

  const res = await fetch(`${mailgunBaseUrl()}/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mailgun send failed: HTTP ${res.status} ${text}`);
  }
}
