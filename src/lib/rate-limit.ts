// Per-IP sliding-window rate limiters (SEC-02), backed by the shared Upstash
// store (D-10). Each limiter follows the checkPassword() contract in
// src/app/api/files/[id]/route.ts: return null to continue, return a Response
// to short-circuit — so call sites stay a one-line `if (limited) return limited;`.
//
// Thresholds are env-tunable (D-02) with moderate defaults. Breaches return
// HTTP 429 + a Retry-After header. Limiters fail-OPEN: if Redis is unreachable
// the request is allowed (availability over strictness — the atomic counter,
// which fails CLOSED, is what protects the download-limit invariant). When the
// Upstash creds are unset (local dev) the limiters allow all traffic, mirroring
// isAuthorized()'s `if (!secret) return true` in cleanup/route.ts.

import { Ratelimit } from "@upstash/ratelimit";
import type { Redis } from "@upstash/redis";
import { getRedisClient } from "@/lib/redis";

/** Upstash creds present → real limiting; absent → dev allow-all. */
function hasUpstash(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/** Read a positive integer threshold from env, falling back to a default. */
function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

let uploadLimiter: Ratelimit | null = null;
let downloadLimiter: Ratelimit | null = null;
let passwordLimiter: Ratelimit | null = null;

function buildLimiter(limit: number, prefix: string): Ratelimit | null {
  if (!hasUpstash()) return null;
  return new Ratelimit({
    // Real Upstash client when creds are set (getRedisClient returns a full
    // Redis in that branch); cast narrows the shared RedisLike back to Redis.
    redis: getRedisClient() as unknown as Redis,
    limiter: Ratelimit.slidingWindow(limit, "1 m"),
    prefix,
  });
}

function getUploadLimiter(): Ratelimit | null {
  if (!uploadLimiter) {
    uploadLimiter = buildLimiter(intEnv("RATE_LIMIT_UPLOAD_PER_MIN", 10), "rl:up");
  }
  return uploadLimiter;
}

function getDownloadLimiter(): Ratelimit | null {
  if (!downloadLimiter) {
    downloadLimiter = buildLimiter(
      intEnv("RATE_LIMIT_DOWNLOAD_PER_MIN", 30),
      "rl:dl",
    );
  }
  return downloadLimiter;
}

function getPasswordLimiter(): Ratelimit | null {
  if (!passwordLimiter) {
    passwordLimiter = buildLimiter(
      intEnv("RATE_LIMIT_PASSWORD_PER_MIN", 5),
      "rl:pw",
    );
  }
  return passwordLimiter;
}

/** Shared enforcement: null = allow/continue, Response = 429 short-circuit. */
async function enforce(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<Response | null> {
  if (!limiter) return null; // dev fallback / no creds → allow
  try {
    const { success, reset } = await limiter.limit(identifier);
    if (success) return null;
    const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return new Response("rate limited", {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    });
  } catch (err) {
    // Fail OPEN: never surface Redis errors to the client, never block
    // traffic on a limiter outage. Still log so a sustained Upstash outage
    // that silently disables rate limiting (including the password
    // brute-force guard) is observable (WR-01), matching the console.error
    // precedent already used for SW registration failures.
    console.error("rate-limit: enforce() failed, failing open", err);
    return null;
  }
}

/** Upload throttle: RATE_LIMIT_UPLOAD_PER_MIN per IP per minute. */
export async function checkUploadLimit(ip: string): Promise<Response | null> {
  return enforce(getUploadLimiter(), ip);
}

/** Download throttle: RATE_LIMIT_DOWNLOAD_PER_MIN per IP per minute. */
export async function checkDownloadLimit(ip: string): Promise<Response | null> {
  return enforce(getDownloadLimiter(), ip);
}

/**
 * Password brute-force throttle: RATE_LIMIT_PASSWORD_PER_MIN per (file id + IP)
 * per minute — a brief per-window lockout (D-02).
 */
export async function checkPasswordAttemptLimit(
  fileId: string,
  ip: string,
): Promise<Response | null> {
  return enforce(getPasswordLimiter(), fileId + ":" + ip);
}
