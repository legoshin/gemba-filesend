"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import {
  MAC_APP_DOWNLOAD_PATH,
  MAC_APP_SHORTCUT_LABEL,
  shouldStartMacDownload,
} from "@/lib/mac-download";

/**
 * ⌘K anywhere on the site downloads the macOS app.
 *
 * Mounted once in the root layout. It listens only on a Mac, never while
 * someone is typing in a field, and only for Command on its own — so nothing
 * else people press is taken away from the browser. The rules themselves live
 * in lib/mac-download.ts, where they are unit-tested.
 */
export function MacDownloadShortcut() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!shouldStartMacDownload(event, event.target as HTMLElement | null, navigator)) return;
      // Chrome uses ⌘K for an address-bar search; while the page has focus it
      // is ours, so take it before the browser sees it.
      event.preventDefault();

      // A same-origin link with `download` saves the file instead of opening
      // it — no navigation, so whatever is on screen stays put.
      const link = document.createElement("a");
      link.href = MAC_APP_DOWNLOAD_PATH;
      link.download = "GembaFilesend.dmg";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Downloading Gemba Filesend for macOS", {
        description: "Open the disk image and drag the app to Applications.",
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Not rendered, but announced: a keyboard-only visitor hears the shortcut
  // exists rather than having to know it.
  return (
    <span className="sr-only">
      Press {MAC_APP_SHORTCUT_LABEL} to download the Gemba Filesend app for macOS.
    </span>
  );
}
