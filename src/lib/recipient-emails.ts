/**
 * Shared recipient-email normalizer, validator, and chip-commit helper.
 *
 * Single source of truth for the upload page's recipient list: both the
 * Verify-recipient gating metadata and the Notify-recipient POST consume the
 * normalized `string[]` this module produces, and the interactive chip input
 * is thin glue over `commitRecipientTokens`.
 *
 * Validation constants mirror the per-route values in
 * `src/app/api/files/route.ts` / `src/app/api/notify/route.ts` (the server
 * re-validates independently — this is client-side normalization + fast
 * feedback, not the trust boundary).
 */

/** Maximum recipient addresses accepted for a single share. */
export const MAX_RECIPIENT_EMAILS = 10;

const MAX_EMAIL_LENGTH = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalizes the comma/newline-separated recipient email input into a
 * deduplicated array: split, trim, lowercase, drop empties.
 */
export function parseRecipientEmails(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[,\n]/)) {
    const email = part.trim().toLowerCase();
    if (email.length > 0) seen.add(email);
  }
  return Array.from(seen);
}

/** True when `email` is a plausibly-formatted address within the length cap. */
export function isValidRecipientEmail(email: string): boolean {
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(email);
}

export interface CommitRecipientResult {
  /** Merged, deduped, capped list of valid recipient emails. */
  emails: string[];
  /** Tokens rejected as invalid (bad format) or overflow (over the cap). */
  rejected: string[];
}

/**
 * Commits free-typed `raw` tokens into the existing `current` list.
 *
 * Each token is normalized (via {@link parseRecipientEmails}) and validated
 * (via {@link isValidRecipientEmail}). Valid, not-already-present tokens are
 * appended until {@link MAX_RECIPIENT_EMAILS} is reached; invalid tokens and
 * any that would exceed the cap are returned in `rejected`. Tokens already in
 * `current` are silently deduplicated (not reported as rejected).
 */
export function commitRecipientTokens(
  current: string[],
  raw: string,
): CommitRecipientResult {
  const emails = [...current];
  const rejected: string[] = [];

  for (const token of parseRecipientEmails(raw)) {
    if (!isValidRecipientEmail(token)) {
      rejected.push(token);
      continue;
    }
    if (emails.includes(token)) continue; // already present — dedupe silently
    if (emails.length >= MAX_RECIPIENT_EMAILS) {
      rejected.push(token); // over the cap
      continue;
    }
    emails.push(token);
  }

  return { emails, rejected };
}
