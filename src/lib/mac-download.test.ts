import { describe, expect, it } from "vitest";

import {
  isMacPlatform,
  isTypingTarget,
  matchesDownloadShortcut,
  shouldStartMacDownload,
  type ShortcutKeyEvent,
} from "./mac-download";

const command: ShortcutKeyEvent = {
  metaKey: true,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  code: "KeyK",
  repeat: false,
};

const mac = { platform: "MacIntel", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" };
const windows = { platform: "Win32", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };

describe("matchesDownloadShortcut", () => {
  it("accepts Command-K on its own", () => {
    expect(matchesDownloadShortcut(command)).toBe(true);
  });

  it("ignores another key, another modifier, and a held key", () => {
    expect(matchesDownloadShortcut({ ...command, code: "KeyJ" })).toBe(false);
    expect(matchesDownloadShortcut({ ...command, metaKey: false })).toBe(false);
    expect(matchesDownloadShortcut({ ...command, shiftKey: true })).toBe(false);
    expect(matchesDownloadShortcut({ ...command, altKey: true })).toBe(false);
    expect(matchesDownloadShortcut({ ...command, ctrlKey: true })).toBe(false);
    expect(matchesDownloadShortcut({ ...command, repeat: true })).toBe(false);
  });
});

describe("isTypingTarget", () => {
  it("is true inside fields people type in", () => {
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT", "input"]) {
      expect(isTypingTarget({ tagName })).toBe(true);
    }
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("is false elsewhere", () => {
    expect(isTypingTarget({ tagName: "BODY" })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe("isMacPlatform", () => {
  it("recognises a Mac and nothing else", () => {
    expect(isMacPlatform(mac)).toBe(true);
    expect(isMacPlatform({ userAgentData: { platform: "macOS" } })).toBe(true);
    expect(isMacPlatform(windows)).toBe(false);
    expect(isMacPlatform(undefined)).toBe(false);
  });
});

describe("shouldStartMacDownload", () => {
  it("fires for Command-K on a Mac, outside a text field", () => {
    expect(shouldStartMacDownload(command, { tagName: "BODY" }, mac)).toBe(true);
  });

  it("does not fire while typing, on other platforms, or for other keys", () => {
    expect(shouldStartMacDownload(command, { tagName: "INPUT" }, mac)).toBe(false);
    expect(shouldStartMacDownload(command, { tagName: "BODY" }, windows)).toBe(false);
    expect(shouldStartMacDownload({ ...command, code: "KeyL" }, { tagName: "BODY" }, mac)).toBe(false);
  });
});
