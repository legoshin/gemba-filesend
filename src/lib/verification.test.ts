import { describe, expect, it } from "vitest";
import type { RedisLike } from "@/lib/redis";
import { sha256Hex } from "@/lib/crypto";
import {
  MAX_VERIFY_ATTEMPTS,
  generateSixDigitCode,
  issueVerifyToken,
  isVerifyTokenValid,
  storeVerificationCode,
  verifyCode,
} from "@/lib/verification";

/**
 * In-memory Redis fake implementing the surface verification.ts uses:
 * set(key, value, opts?) (honoring { nx: true } = only set if absent),
 * get(key) (returns the stored value, mirroring @upstash/redis's automatic
 * JSON de/serialization — objects round-trip unchanged), and del(key).
 * Hermetic — no live Upstash required, matching the storage.test.ts pattern
 * (Plan 04-03 / TEST-03). A fresh instance is created per test for isolation.
 */
function createFakeRedis(): RedisLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = new Map<string, any>();
  const fake = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async set(key: string, value: any, opts?: { nx?: boolean; ex?: number }) {
      if (opts?.nx && store.has(key)) return null;
      store.set(key, value);
      return "OK";
    },
    async decr(key: string) {
      const next = (Number(store.get(key)) || 0) - 1;
      store.set(key, next);
      return next;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async get(key: string): Promise<any> {
      return store.has(key) ? store.get(key) : null;
    },
    async del(key: string) {
      const existed = store.delete(key);
      return existed ? 1 : 0;
    },
  };
  return fake as unknown as RedisLike;
}

/** A fake whose get() always throws, to prove fail-closed propagation. */
function createThrowingRedis(): RedisLike {
  const fake = {
    async set() {
      return "OK";
    },
    async decr() {
      return 0;
    },
    async get() {
      throw new Error("redis unavailable");
    },
    async del() {
      return 0;
    },
  };
  return fake as unknown as RedisLike;
}

describe("generateSixDigitCode (D-05-01)", () => {
  it("returns a 6-character all-digit string across many calls", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateSixDigitCode();
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    }
  });
});

describe("storeVerificationCode / verifyCode (D-05-02/03/09)", () => {
  it("verifies the correct code exactly once, then returns none", async () => {
    const fake = createFakeRedis();
    const id = "file-1";
    const code = "123456";

    await storeVerificationCode(id, code, fake);

    expect(await verifyCode(id, code, fake)).toBe("ok");
    expect(await verifyCode(id, code, fake)).toBe("none");
  });

  it("returns invalid on a wrong code and locked on the 5th wrong attempt", async () => {
    const fake = createFakeRedis();
    const id = "file-2";
    const code = "654321";

    await storeVerificationCode(id, code, fake);

    for (let i = 0; i < MAX_VERIFY_ATTEMPTS - 1; i++) {
      expect(await verifyCode(id, "000000", fake)).toBe("invalid");
    }
    // 5th wrong attempt: locked, code deleted.
    expect(await verifyCode(id, "000000", fake)).toBe("locked");

    // A subsequent correct code returns "none" — the code was deleted.
    expect(await verifyCode(id, code, fake)).toBe("none");
  });

  it("returns expired when the payload's absolute expiresAt is in the past, even though the Redis key still exists", async () => {
    const fake = createFakeRedis();
    const id = "file-3";
    const code = "111222";

    // Pre-seed a payload with a past absolute expiresAt directly (bypassing
    // storeVerificationCode) to prove the app-code check, not Redis TTL,
    // enforces expiry (Pitfall 3).
    await fake.set("vcode:" + id, {
      codeHash: await sha256Hex(code),
      attempts: 0,
      expiresAt: Date.now() - 1000,
    });

    expect(await verifyCode(id, code, fake)).toBe("expired");
  });
});

describe("issueVerifyToken / isVerifyTokenValid (D-05-04, T-05-04)", () => {
  it("mints a non-empty base64url token bound only to its own file id", async () => {
    const fake = createFakeRedis();
    const id = "file-4";
    const otherId = "file-5";

    const token = await issueVerifyToken(id, fake);

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    // base64url charset only.
    expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);

    expect(await isVerifyTokenValid(id, token, fake)).toBe(true);
    expect(await isVerifyTokenValid(otherId, token, fake)).toBe(false);
    expect(await isVerifyTokenValid(id, "not-a-real-token", fake)).toBe(false);
  });
});

describe("isVerifyTokenValid fail-closed behavior (T-05-08)", () => {
  it("rejects (propagates the Redis error) rather than resolving false", async () => {
    const throwing = createThrowingRedis();
    await expect(
      isVerifyTokenValid("file-6", "some-token", throwing),
    ).rejects.toThrow();
  });
});
