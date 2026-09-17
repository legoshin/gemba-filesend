import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mailgunBaseUrl, sendShareNotificationEmail } from "@/lib/mailgun";

// Canonical mailgunBaseUrl coverage (all region branches) lives in
// storage.test.ts (D-05-06) — this is a single smoke assertion confirming
// the notify sender's dependency still resolves correctly, not a duplicate
// of that suite.
describe("mailgunBaseUrl (smoke)", () => {
  const ORIGINAL_REGION = process.env.MAILGUN_SENDING_REGION;

  afterEach(() => {
    if (ORIGINAL_REGION === undefined) {
      delete process.env.MAILGUN_SENDING_REGION;
    } else {
      process.env.MAILGUN_SENDING_REGION = ORIGINAL_REGION;
    }
  });

  it("resolves us/eu correctly", () => {
    process.env.MAILGUN_SENDING_REGION = "us";
    expect(mailgunBaseUrl()).toBe("https://api.mailgun.net");
    process.env.MAILGUN_SENDING_REGION = "eu";
    expect(mailgunBaseUrl()).toBe("https://api.eu.mailgun.net");
  });
});

describe("sendShareNotificationEmail (D-06-02 fail-loud)", () => {
  const ORIGINAL_ENV = {
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
    MAILGUN_FROM: process.env.MAILGUN_FROM,
  };

  beforeEach(() => {
    delete process.env.MAILGUN_API_KEY;
    delete process.env.MAILGUN_DOMAIN;
    delete process.env.MAILGUN_FROM;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("rejects when MAILGUN_API_KEY is unset", async () => {
    process.env.MAILGUN_DOMAIN = "example.com";
    process.env.MAILGUN_FROM = "noreply@example.com";
    await expect(
      sendShareNotificationEmail("recipient@example.com", [
        { fileName: "f.txt", url: "https://example.com/download?id=1" },
      ]),
    ).rejects.toThrow(/Mailgun env vars not configured/);
  });

  it("rejects when MAILGUN_DOMAIN is unset", async () => {
    process.env.MAILGUN_API_KEY = "key";
    process.env.MAILGUN_FROM = "noreply@example.com";
    await expect(
      sendShareNotificationEmail("recipient@example.com", [
        { fileName: "f.txt", url: "https://example.com/download?id=1" },
      ]),
    ).rejects.toThrow(/Mailgun env vars not configured/);
  });

  it("rejects when MAILGUN_FROM is unset", async () => {
    process.env.MAILGUN_API_KEY = "key";
    process.env.MAILGUN_DOMAIN = "example.com";
    await expect(
      sendShareNotificationEmail("recipient@example.com", [
        { fileName: "f.txt", url: "https://example.com/download?id=1" },
      ]),
    ).rejects.toThrow(/Mailgun env vars not configured/);
  });
});
