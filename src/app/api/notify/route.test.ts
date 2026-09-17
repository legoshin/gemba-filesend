import { describe, expect, it } from "vitest";
import { validateNotifyBody } from "./route";

const ORIGIN = "https://gemba.example";

function validBody() {
  return {
    recipients: ["alice@example.com"],
    links: [{ fileName: "report.pdf", url: `${ORIGIN}/download?id=1#somekey` }],
  };
}

describe("validateNotifyBody (T-06-01, T-06-02)", () => {
  it("accepts a well-formed same-origin body", () => {
    const result = validateNotifyBody(validBody(), ORIGIN);
    expect(result.ok).toBe(true);
  });

  it("accepts a same-origin url with no #key fragment (unencrypted fallback)", () => {
    const body = {
      recipients: ["alice@example.com"],
      links: [{ fileName: "report.pdf", url: `${ORIGIN}/download?id=1` }],
    };
    expect(validateNotifyBody(body, ORIGIN).ok).toBe(true);
  });

  it("rejects an empty recipients array", () => {
    const body = { ...validBody(), recipients: [] };
    const result = validateNotifyBody(body, ORIGIN);
    expect(result.ok).toBe(false);
  });

  it("rejects more than MAX_RECIPIENT_EMAILS (10) recipients", () => {
    const body = {
      ...validBody(),
      recipients: Array.from({ length: 11 }, (_, i) => `user${i}@example.com`),
    };
    expect(validateNotifyBody(body, ORIGIN).ok).toBe(false);
  });

  it("accepts exactly 10 recipients (boundary)", () => {
    const body = {
      ...validBody(),
      recipients: Array.from({ length: 10 }, (_, i) => `user${i}@example.com`),
    };
    expect(validateNotifyBody(body, ORIGIN).ok).toBe(true);
  });

  it("rejects a malformed recipient email", () => {
    const body = { ...validBody(), recipients: ["not-an-email"] };
    expect(validateNotifyBody(body, ORIGIN).ok).toBe(false);
  });

  it("rejects an over-length recipient email (> 254 chars)", () => {
    const longLocal = "a".repeat(250);
    const body = { ...validBody(), recipients: [`${longLocal}@example.com`] };
    expect(validateNotifyBody(body, ORIGIN).ok).toBe(false);
  });

  it("rejects an empty links array", () => {
    const body = { ...validBody(), links: [] };
    expect(validateNotifyBody(body, ORIGIN).ok).toBe(false);
  });

  it("rejects a link with a missing fileName", () => {
    const body = { ...validBody(), links: [{ url: `${ORIGIN}/download?id=1` }] };
    expect(validateNotifyBody(body, ORIGIN).ok).toBe(false);
  });

  it("rejects a link whose url origin differs from the request origin (open-relay guard)", () => {
    const body = {
      ...validBody(),
      links: [{ fileName: "report.pdf", url: "https://evil.example/phish" }],
    };
    expect(validateNotifyBody(body, ORIGIN).ok).toBe(false);
  });

  it("rejects a non-http(s) url", () => {
    const body = {
      ...validBody(),
      links: [{ fileName: "report.pdf", url: "javascript:alert(1)" }],
    };
    expect(validateNotifyBody(body, ORIGIN).ok).toBe(false);
  });

  it("rejects a malformed url that fails to parse", () => {
    const body = {
      ...validBody(),
      links: [{ fileName: "report.pdf", url: "not a url" }],
    };
    expect(validateNotifyBody(body, ORIGIN).ok).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(validateNotifyBody(null, ORIGIN).ok).toBe(false);
    expect(validateNotifyBody("string", ORIGIN).ok).toBe(false);
  });
});
