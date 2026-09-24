/**
 * The hidden keyboard shortcut that downloads the macOS app: ⌘K on a Mac,
 * anywhere on the site (see components/mac-download-shortcut.tsx).
 *
 * The decision logic lives here, apart from the listener, so it can be tested
 * in this project's Node test environment — there is no jsdom here, and the
 * rules below (which key, which modifiers, where the focus is) are the part
 * worth pinning down.
 */

/** What the shortcut downloads: the signed, notarized disk image. */
export const MAC_APP_DOWNLOAD_PATH = "/download/GembaFilesend.dmg";

/** The shortcut as people read it. */
export const MAC_APP_SHORTCUT_LABEL = "⌘K";

/**
 * Whether this visitor is on a Mac, in which case the .dmg is worth having.
 * `navigator.platform` is deprecated but still the most reliable signal; the
 * modern `userAgentData.platform` is checked first when the browser has it.
 */
export function isMacPlatform(
  navigatorLike: { platform?: string; userAgent?: string; userAgentData?: { platform?: string } } | undefined,
): boolean {
  if (!navigatorLike) return false;
  const candidates = [
    navigatorLike.userAgentData?.platform,
    navigatorLike.platform,
    navigatorLike.userAgent,
  ];
  return candidates.some((value) => typeof value === "string" && /mac/i.test(value));
}

/** The keydown fields the shortcut cares about. */
export type ShortcutKeyEvent = {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  /** Physical key, so the shortcut survives non-US layouts. */
  code: string;
  repeat?: boolean;
};

/**
 * ⌘K exactly: Command alone, no other modifier, and not a key held down.
 * Adding a modifier is someone reaching for a different shortcut, so those
 * are left to the browser.
 */
export function matchesDownloadShortcut(event: ShortcutKeyEvent): boolean {
  return (
    event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    !event.repeat &&
    event.code === "KeyK"
  );
}

/**
 * Whether the keypress happened while someone was typing — in the password
 * box, an email field, the share link box. Text fields own their shortcuts;
 * the page must not steal a keypress meant for them.
 */
export function isTypingTarget(
  target: { tagName?: string; isContentEditable?: boolean } | null | undefined,
): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** Everything together: should this keydown start the download? */
export function shouldStartMacDownload(
  event: ShortcutKeyEvent,
  target: { tagName?: string; isContentEditable?: boolean } | null | undefined,
  navigatorLike: Parameters<typeof isMacPlatform>[0],
): boolean {
  return matchesDownloadShortcut(event) && !isTypingTarget(target) && isMacPlatform(navigatorLike);
}
