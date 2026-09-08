// Recipient-email verification domain (Phase 5): one-time 6-digit codes and
// short-lived opaque verify-tokens, both backed by the shared Redis client
// (src/lib/redis.ts, D-05-10). This module composes getRedisClient() and
// reuses sha256Hex/toBase64Url from src/lib/crypto.ts — no new hash or RNG
// primitive is introduced (RESEARCH "Don't Hand-Roll").
//
// Every exported function takes a trailing optional `redis: RedisLike`
// argument (mirroring decrementDownloadCounter in src/lib/redis.ts) so the
// whole module is hermetically unit-testable against an in-memory fake,
// without live Upstash credentials.

import { getRedisClient, type RedisLike } from "@/lib/redis";
import { sha256Hex, toBase64Url } from "@/lib/crypto";

/** Logical code lifetime (D-05-02) — the AUTHORITATIVE expiry, enforced in
 *  app code via the absolute `expiresAt` stored inside the code payload. */
export const CODE_TTL_SECONDS = intEnv("VERIFY_CODE_TTL_SECONDS", 600);
/** Redis-level TTL on the code key — intentionally longer than
 *  CODE_TTL_SECONDS; purely a GC backstop (RESEARCH Pitfall 3), never the
 *  source of truth for expiry. */
export const CODE_REDIS_TTL_SECONDS = intEnv(
  "VERIFY_CODE_REDIS_TTL_SECONDS",
  650,
);
/** Max wrong-code attempts before the code is deleted (hard lockout, D-05-03). */
export const MAX_VERIFY_ATTEMPTS = intEnv("VERIFY_MAX_ATTEMPTS", 5);
/** Verify-token TTL — reusable (not single-use) within this window (D-05-04). */
export const VERIFY_TOKEN_TTL_SECONDS = intEnv(
  "VERIFY_TOKEN_TTL_SECONDS",
  1800,
);

/** Read a positive integer threshold from env, falling back to a default.
 *  Mirrors the intEnv() idiom in src/lib/rate-limit.ts. */
function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function codeKey(id: string): string {
  return "vcode:" + id;
}

function tokenKey(token: string): string {
  return "vtoken:" + token;
}

interface CodePayload {
  codeHash: string;
  attempts: number;
  expiresAt: number;
}

/**
 * Generates a 6-digit, zero-padded numeric code via crypto.getRandomValues
 * (D-05-01) — reuses the existing in-repo `% N` RNG idiom used by
 * generateClientId()/server-storage.generateId(); negligible modulo bias for
 * a 10-min, 5-attempt code.
 */
export function generateSixDigitCode(): string {
  const rand = crypto.getRandomValues(new Uint32Array(1))[0];
  const code = rand % 1_000_000;
  return String(code).padStart(6, "0");
}

/**
 * Stores the (hashed) code for `id`, keyed off an absolute expiry inside the
 * payload (D-05-02/D-05-09). Overwrites any prior code for the same id.
 */
export async function storeVerificationCode(
  id: string,
  code: string,
  redis: RedisLike = getRedisClient(),
): Promise<void> {
  const payload: CodePayload = {
    codeHash: await sha256Hex(code),
    attempts: 0,
    expiresAt: Date.now() + CODE_TTL_SECONDS * 1000,
  };
  await redis.set(codeKey(id), payload, { ex: CODE_REDIS_TTL_SECONDS });
}

export type VerifyCodeResult = "ok" | "invalid" | "expired" | "locked" | "none";

/**
 * Verifies `code` against the stored payload for `id`.
 *
 * - "none": no code stored for this id.
 * - "expired": the payload's absolute expiresAt has passed (code deleted) —
 *   enforced in app code, independent of the Redis-level TTL (Pitfall 3).
 * - "locked": attempts already at/over MAX_VERIFY_ATTEMPTS (code deleted).
 * - "ok": hash matches — code consumed (deleted), single-use.
 * - "invalid": hash mismatch — attempt count incremented, SAME absolute
 *   expiresAt is kept on rewrite (the Redis `ex` refresh is only a GC
 *   backstop, never extends the logical window). Deletes + returns "locked"
 *   if this attempt reaches MAX_VERIFY_ATTEMPTS.
 */
export async function verifyCode(
  id: string,
  code: string,
  redis: RedisLike = getRedisClient(),
): Promise<VerifyCodeResult> {
  const key = codeKey(id);
  const payload = (await redis.get(key)) as CodePayload | null;
  if (!payload) return "none";

  if (Date.now() >= payload.expiresAt) {
    await redis.del(key);
    return "expired";
  }
  if (payload.attempts >= MAX_VERIFY_ATTEMPTS) {
    await redis.del(key);
    return "locked";
  }

  const candidateHash = await sha256Hex(code);
  if (candidateHash === payload.codeHash) {
    await redis.del(key);
    return "ok";
  }

  const attempts = payload.attempts + 1;
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    await redis.del(key);
    return "locked";
  }
  await redis.set(
    key,
    { ...payload, attempts },
    { ex: CODE_REDIS_TTL_SECONDS },
  );
  return "invalid";
}

/**
 * Mints a reusable, opaque verify-token bound to `id` (D-05-04: 30-min TTL,
 * reusable — not single-use — so a multi-download link works without
 * re-verifying each time).
 */
export async function issueVerifyToken(
  id: string,
  redis: RedisLike = getRedisClient(),
): Promise<string> {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  await redis.set(tokenKey(token), id, { ex: VERIFY_TOKEN_TTL_SECONDS });
  return token;
}

/**
 * Returns true only when `token` was minted for exactly this `id`. Lets a
 * Redis error propagate (does NOT catch-and-return-false) so the caller
 * (checkVerification in the download route) can fail closed.
 */
export async function isVerifyTokenValid(
  id: string,
  token: string,
  redis: RedisLike = getRedisClient(),
): Promise<boolean> {
  const stored = await redis.get(tokenKey(token));
  return stored === id;
}
