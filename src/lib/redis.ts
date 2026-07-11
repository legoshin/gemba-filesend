// Shared Upstash Redis client + atomic download-counter primitives.
//
// Env-gated dispatcher, mirroring getStorageMode() in src/lib/storage.ts:
// when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, use a real
// Upstash Redis client (module-level singleton). When unset (local dev), fall
// back to a single-instance in-memory shim implementing only the surface used
// here (set + decr over a module Map). Concurrency correctness of the counter
// is proven by the hermetic in-memory fake in Plan 04-03, NOT by this dev
// shim — the shim exists only so `npm run dev` works without Upstash creds.
//
// ONE shared client backs both per-IP rate limiting (SEC-02) and the atomic
// download counter (REL-01) — D-10: a single store solves both.

import { Redis } from "@upstash/redis";

/** Minimal Redis surface consumed by this module + @upstash/ratelimit. */
export type RedisLike = Pick<Redis, "set" | "decr">;

/**
 * Single-instance in-memory dev fallback. NOT safe across serverless
 * instances — used only when Upstash creds are absent (local dev), matching
 * the "env var absent → documented permissive dev fallback" convention used
 * by isAuthorized() in src/app/api/cleanup/route.ts.
 */
function createDevShim(): RedisLike {
  const store = new Map<string, number>();
  const shim = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async set(key: string, value: any, opts?: { nx?: boolean; ex?: number }) {
      if (opts?.nx && store.has(key)) return null;
      store.set(key, Number(value));
      return "OK";
    },
    async decr(key: string) {
      const next = (store.get(key) ?? 0) - 1;
      store.set(key, next);
      return next;
    },
  };
  return shim as unknown as RedisLike;
}

let client: RedisLike | null = null;

/**
 * Returns the shared Redis client (singleton). Real Upstash client when creds
 * are set; documented in-memory dev shim otherwise. Never throws on import or
 * when env vars are missing.
 */
export function getRedisClient(): RedisLike {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  client = url && token ? new Redis({ url, token }) : createDevShim();
  return client;
}

/** Redis key convention for the atomic download counter. */
function counterKey(id: string): string {
  return "dl:" + id;
}

/**
 * Seed dl:{id} to the file's download limit with a TTL aligned to file expiry.
 * Called once at upload time (REL-01 seed, D-08).
 *
 * NX: only seed if absent. Vercel Blob may retry the onUploadCompleted
 * webhook (standard webhook resilience) — an unconditional `set` on a retry
 * would silently reset the counter back to the full limit after downloads
 * have already started, defeating the exact over-issuing bug REL-01 exists
 * to close (CR-01). A retried webhook call must be a no-op here.
 */
export async function seedDownloadCounter(
  id: string,
  limit: number,
  ttlSeconds: number,
  redis: RedisLike = getRedisClient(),
): Promise<void> {
  await redis.set(counterKey(id), limit, { nx: true, ex: ttlSeconds });
}

/**
 * Atomically decrement dl:{id} and return the post-decrement value. Performs a
 * race-safe NX self-heal first (only seeds when the key is absent — e.g. after
 * TTL/eviction) so a missing key can never silently under-count. The injectable
 * `redis` arg (last, optional) is what makes REL-01 hermetically testable with
 * an in-memory fake in Plan 04-03.
 */
export async function decrementDownloadCounter(
  id: string,
  limit: number,
  ttlSeconds: number,
  redis: RedisLike = getRedisClient(),
): Promise<number> {
  const key = counterKey(id);
  await redis.set(key, limit, { nx: true, ex: ttlSeconds });
  const remaining = await redis.decr(key);
  return Number(remaining);
}
