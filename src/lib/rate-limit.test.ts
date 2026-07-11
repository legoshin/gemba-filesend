import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Force hasUpstash() -> true so buildLimiter() constructs a (fake) Ratelimit
// instead of returning null for the dev/no-creds allow-all path.
process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";

/**
 * Fakes @upstash/ratelimit's Ratelimit class so rate-limit.ts's buildLimiter()
 * constructs a controllable fake instead of a real Upstash-backed limiter --
 * hermetic, no live Upstash creds/network required (mirrors the in-memory
 * Redis fake pattern used for the counter tests in storage.test.ts, WR-03).
 */
vi.mock("@upstash/ratelimit", () => {
  class FakeRatelimit {
    static instances = new Map<string, FakeRatelimit>();
    limit = vi.fn();
    constructor(opts: { prefix: string }) {
      FakeRatelimit.instances.set(opts.prefix, this);
    }
    static slidingWindow(limit: number, window: string) {
      return { limit, window };
    }
  }
  return { Ratelimit: FakeRatelimit };
});

import { Ratelimit } from "@upstash/ratelimit";
import {
  checkDownloadLimit,
  checkPasswordAttemptLimit,
  checkUploadLimit,
} from "@/lib/rate-limit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FakeRatelimit = Ratelimit as any;

function fakeFor(prefix: string): { limit: ReturnType<typeof vi.fn> } {
  return FakeRatelimit.instances.get(prefix);
}

describe("rate-limit.ts (WR-03)", () => {
  beforeAll(async () => {
    // Trigger lazy construction of all three cached limiter singletons (each
    // exported check function builds + caches its own Ratelimit instance on
    // first call) so fakeFor(prefix) can retrieve them below. The unconfigured
    // fake .limit() returns undefined here, which enforce()'s try/catch
    // swallows harmlessly (fail-open) -- the result is discarded.
    await checkUploadLimit("init");
    await checkDownloadLimit("init");
    await checkPasswordAttemptLimit("init-file", "init-ip");
  });

  beforeEach(() => {
    fakeFor("rl:up").limit.mockClear();
    fakeFor("rl:dl").limit.mockClear();
    fakeFor("rl:pw").limit.mockClear();
  });

  it("allows a request under the limit (returns null)", async () => {
    fakeFor("rl:up").limit.mockResolvedValueOnce({
      success: true,
      reset: Date.now() + 1000,
    });
    const result = await checkUploadLimit("1.1.1.1");
    expect(result).toBeNull();
  });

  it("returns 429 with a Retry-After header when over the limit", async () => {
    const resetAt = Date.now() + 5000;
    fakeFor("rl:dl").limit.mockResolvedValueOnce({
      success: false,
      reset: resetAt,
    });
    const result = await checkDownloadLimit("2.2.2.2");

    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
    const retryAfter = Number(result?.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(4);
    expect(retryAfter).toBeLessThanOrEqual(5);
  });

  it("clamps Retry-After to a minimum of 1 second", async () => {
    // reset already in the past -- (reset - now) is negative.
    fakeFor("rl:dl").limit.mockResolvedValueOnce({
      success: false,
      reset: Date.now() - 10_000,
    });
    const result = await checkDownloadLimit("2.2.2.3");

    expect(result?.status).toBe(429);
    expect(Number(result?.headers.get("Retry-After"))).toBe(1);
  });

  it("fails open (allows) when the underlying limiter throws", async () => {
    fakeFor("rl:up").limit.mockRejectedValueOnce(new Error("redis unreachable"));
    const result = await checkUploadLimit("3.3.3.3");
    expect(result).toBeNull();
  });

  it("scopes the password-attempt identifier to fileId:ip (CR-02 support)", async () => {
    fakeFor("rl:pw").limit.mockResolvedValueOnce({
      success: true,
      reset: Date.now() + 1000,
    });
    await checkPasswordAttemptLimit("file-abc", "9.9.9.9");
    expect(fakeFor("rl:pw").limit).toHaveBeenCalledWith("file-abc:9.9.9.9");
  });

  it("gives different files independent password-attempt identifiers", async () => {
    fakeFor("rl:pw").limit.mockResolvedValueOnce({
      success: true,
      reset: Date.now() + 1000,
    });
    await checkPasswordAttemptLimit("file-one", "9.9.9.9");
    fakeFor("rl:pw").limit.mockResolvedValueOnce({
      success: true,
      reset: Date.now() + 1000,
    });
    await checkPasswordAttemptLimit("file-two", "9.9.9.9");

    expect(fakeFor("rl:pw").limit).toHaveBeenNthCalledWith(
      1,
      "file-one:9.9.9.9",
    );
    expect(fakeFor("rl:pw").limit).toHaveBeenNthCalledWith(
      2,
      "file-two:9.9.9.9",
    );
  });
});
