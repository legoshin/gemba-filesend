import { describe, expect, it } from "vitest";
import {
  MAX_RECIPIENT_EMAILS,
  commitRecipientTokens,
  isValidRecipientEmail,
  parseRecipientEmails,
} from "@/lib/recipient-emails";

describe("parseRecipientEmails", () => {
  it("splits on comma/newline, trims, lowercases, drops empties, dedupes", () => {
    expect(parseRecipientEmails("a@x.com, B@x.com\nc@x.com")).toEqual([
      "a@x.com",
      "b@x.com",
      "c@x.com",
    ]);
  });

  it("drops empty tokens and deduplicates case-insensitively", () => {
    expect(parseRecipientEmails("a@x.com, ,A@X.com\n\n")).toEqual(["a@x.com"]);
  });

  it("returns an empty array for a blank input", () => {
    expect(parseRecipientEmails("   \n , ")).toEqual([]);
  });
});

describe("isValidRecipientEmail", () => {
  it("accepts a well-formed address", () => {
    expect(isValidRecipientEmail("a@x.com")).toBe(true);
  });

  it("rejects an address with no @ or domain dot", () => {
    expect(isValidRecipientEmail("nope")).toBe(false);
  });

  it("rejects an address longer than 254 characters", () => {
    const longLocal = "a".repeat(255);
    expect(isValidRecipientEmail(`${longLocal}@x.com`)).toBe(false);
  });

  it("rejects an address containing whitespace", () => {
    expect(isValidRecipientEmail("a b@x.com")).toBe(false);
  });
});

describe("commitRecipientTokens", () => {
  it("merges valid tokens, drops the already-present duplicate, collects invalid as rejected", () => {
    expect(commitRecipientTokens(["a@x.com"], "b@x.com, bad, a@x.com")).toEqual({
      emails: ["a@x.com", "b@x.com"],
      rejected: ["bad"],
    });
  });

  it("normalizes casing before merging and dedup checks", () => {
    expect(commitRecipientTokens(["a@x.com"], "A@X.com, B@x.com")).toEqual({
      emails: ["a@x.com", "b@x.com"],
      rejected: [],
    });
  });

  it("keeps the first MAX_RECIPIENT_EMAILS and reports the overflow as rejected", () => {
    const raw = Array.from(
      { length: MAX_RECIPIENT_EMAILS + 2 },
      (_, i) => `user${i}@x.com`,
    ).join(", ");
    const result = commitRecipientTokens([], raw);
    expect(result.emails).toHaveLength(MAX_RECIPIENT_EMAILS);
    expect(result.emails[0]).toBe("user0@x.com");
    expect(result.rejected).toEqual([
      `user${MAX_RECIPIENT_EMAILS}@x.com`,
      `user${MAX_RECIPIENT_EMAILS + 1}@x.com`,
    ]);
  });

  it("returns the current list unchanged when the input has no valid tokens", () => {
    expect(commitRecipientTokens(["a@x.com"], "bad, , worse")).toEqual({
      emails: ["a@x.com"],
      rejected: ["bad", "worse"],
    });
  });
});
