import { describe, expect, it } from "vitest";
import {
  MAX_BLOB_BYTES,
  MAX_DOWNLOADS,
  MAX_EXPIRY_MS,
  validateClientMeta,
} from "@gemba/shared";
import type { StoredMeta } from "@/lib/storage";
import {
  decrementDownloadCounter,
  seedDownloadCounter,
  type RedisLike,
} from "@/lib/redis";

const ONE_DAY_MS = 24 * 3600_000;

function validPayload() {
  return {
    name: "report.pdf",
    type: "application/pdf",
    size: 1024,
    downloadsRemaining: 5,
    expiresAt: Date.now() + ONE_DAY_MS,
  };
}

describe("validateClientMeta (TEST-04)", () => {
  it("accepts a well-formed payload", () => {
    expect(validateClientMeta(validPayload())).toBe(true);
  });

  it("accepts boundary values at MAX_DOWNLOADS / MAX_BLOB_BYTES / MAX_EXPIRY_MS", () => {
    expect(
      validateClientMeta({
        ...validPayload(),
        downloadsRemaining: MAX_DOWNLOADS,
        size: MAX_BLOB_BYTES,
        expiresAt: Date.now() + MAX_EXPIRY_MS,
      }),
    ).toBe(true);
  });

  it("rejects a non-string name", () => {
    expect(validateClientMeta({ ...validPayload(), name: 123 })).toBe(false);
  });

  it("rejects a non-string type", () => {
    expect(validateClientMeta({ ...validPayload(), type: 456 })).toBe(false);
  });

  it("rejects size <= 0", () => {
    expect(validateClientMeta({ ...validPayload(), size: 0 })).toBe(false);
    expect(validateClientMeta({ ...validPayload(), size: -1 })).toBe(false);
  });

  it("rejects size > MAX_BLOB_BYTES", () => {
    expect(
      validateClientMeta({ ...validPayload(), size: MAX_BLOB_BYTES + 1 }),
    ).toBe(false);
  });

  it("rejects downloadsRemaining < 1", () => {
    expect(
      validateClientMeta({ ...validPayload(), downloadsRemaining: 0 }),
    ).toBe(false);
  });

  it("rejects downloadsRemaining > MAX_DOWNLOADS", () => {
    expect(
      validateClientMeta({
        ...validPayload(),
        downloadsRemaining: MAX_DOWNLOADS + 1,
      }),
    ).toBe(false);
  });

  it("rejects expiresAt in the past", () => {
    expect(
      validateClientMeta({ ...validPayload(), expiresAt: Date.now() - 1000 }),
    ).toBe(false);
  });

  it("rejects expiresAt beyond MAX_EXPIRY_MS", () => {
    expect(
      validateClientMeta({
        ...validPayload(),
        expiresAt: Date.now() + MAX_EXPIRY_MS + ONE_DAY_MS,
      }),
    ).toBe(false);
  });

  it("rejects wrong-typed downloadsRemaining / expiresAt fields", () => {
    expect(
      validateClientMeta({ ...validPayload(), downloadsRemaining: "5" }),
    ).toBe(false);
    expect(
      validateClientMeta({ ...validPayload(), expiresAt: "later" }),
    ).toBe(false);
  });
});

describe("StoredMeta JSON round-trip (TEST-04)", () => {
  it("preserves every field when passwordHash/salt/blobUrl are present", () => {
    const meta: StoredMeta = {
      id: "abc123",
      name: "secret.zip",
      type: "application/zip",
      size: 2048,
      passwordHash: "deadbeef",
      salt: "saltvalue",
      downloadsRemaining: 3,
      expiresAt: Date.now() + ONE_DAY_MS,
      createdAt: Date.now(),
      blobUrl: "https://example.blob.vercel-storage.com/abc123",
    };

    const roundTripped = JSON.parse(JSON.stringify(meta)) as StoredMeta;

    expect(roundTripped).toEqual(meta);
  });

  it("preserves every field when optional passwordHash/salt/blobUrl are absent", () => {
    const meta: StoredMeta = {
      id: "xyz789",
      name: "notes.txt",
      type: "text/plain",
      size: 512,
      downloadsRemaining: 1,
      expiresAt: Date.now() + ONE_DAY_MS,
      createdAt: Date.now(),
    };

    const roundTripped = JSON.parse(JSON.stringify(meta)) as StoredMeta;

    expect(roundTripped).toEqual(meta);
  });
});

/**
 * In-memory Redis fake implementing exactly the surface the counter uses:
 * `set(key, value, opts?)` (honoring `{ nx: true }` = only set if absent) and
 * `decr(key)` (initialize missing key to 0, then subtract 1, return the new
 * number). Hermetic — no live Upstash, no UPSTASH_* env required (D-13).
 * A fresh instance is created per test for isolation.
 */
function createFakeRedis(): RedisLike {
  const store = new Map<string, number>();
  const fake = {
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
  return fake as unknown as RedisLike;
}

describe("seedDownloadCounter / decrementDownloadCounter (TEST-03)", () => {
  it("seeds dl:{id} to the limit and decrements sequentially", async () => {
    const fake = createFakeRedis();
    const id = "seq-file";
    const limit = 3;

    await seedDownloadCounter(id, limit, 3600, fake);

    const first = await decrementDownloadCounter(id, limit, 3600, fake);
    const second = await decrementDownloadCounter(id, limit, 3600, fake);
    const third = await decrementDownloadCounter(id, limit, 3600, fake);
    const fourth = await decrementDownloadCounter(id, limit, 3600, fake);

    expect(first).toBe(limit - 1);
    expect(second).toBe(limit - 2);
    expect(third).toBe(limit - 3);
    expect(fourth).toBe(limit - 4); // goes negative after N calls
    expect(fourth).toBeLessThan(0);
  });

  it("REL-01 regression: N parallel decrements against a seeded limit never exceed the limit", async () => {
    const fake = createFakeRedis();
    const id = "concurrent-file";
    const limit = 5;
    const parallelAttempts = 20; // M > N

    await seedDownloadCounter(id, limit, 3600, fake);

    const results = await Promise.all(
      Array.from({ length: parallelAttempts }, () =>
        decrementDownloadCounter(id, limit, 3600, fake),
      ),
    );

    const allowed = results.filter((r) => r >= 0);
    const rejected = results.filter((r) => r < 0);

    // Exactly `limit` decrements are ever allowed (>= 0) — the limit is
    // NEVER exceeded regardless of how many concurrent callers race it.
    expect(allowed.length).toBe(limit);
    expect(rejected.length).toBe(parallelAttempts - limit);

    // No allowed result exceeds limit - 1, and the counter never drifts
    // below the theoretical floor of -(M - N).
    expect(Math.max(...allowed)).toBeLessThanOrEqual(limit - 1);
    expect(Math.min(...results)).toBeGreaterThanOrEqual(
      -(parallelAttempts - limit),
    );
  });
});
