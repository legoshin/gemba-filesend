# 08-03 Summary — SwiftUI app + Share Extension

**Plan:** retroactive (executed inline 2026-09-17)
**Status:** Complete. Debug and Release build; app launched and visually checked; extension
registration confirmed with `pluginkit`.

## What was built
- `macos/GembaFilesend/` — `GembaTheme.swift` (tokens transcribed from
  `design-system/tokens/colors.css` + the `.dark` block of `src/app/globals.css`, resolved per
  colour scheme the way the CSS override does), `ContentView.swift` (drop zone, file list,
  settings, progress, result card, encryption-fallback sheet), `UploadModel.swift`,
  `GembaFilesendApp.swift`, Info.plist, entitlements.
- `macos/ShareExtension/` — `com.apple.share-services` extension accepting up to 25 files,
  running the same upload core and copying the link to the clipboard.
- `macos/scripts/generate-project.rb` — generates the `.xcodeproj`; both targets link
  `GembaCrypto` + `GembaUpload`, and the extension is embedded in the app's PlugIns.

## Verification
- `xcodebuild` Debug and Release both succeed under Swift 6 strict concurrency.
- App launched and screenshotted: renders correctly in dark mode against the Gemba dark tokens.
- `pluginkit -a` → the extension registers under `com.apple.share-services` with the right
  identifier, parent bundle and display name; unregistered afterwards so no stale pointer into a
  build directory remains.
- Sandbox entitlements confirmed on the built bundle: app-sandbox, network.client,
  files.user-selected.read-only.

## Fixes made during execution
- Three Swift 6 `sending`/isolation errors (progress closures capturing a running counter;
  `NSItemProvider` crossing an actor hop in both the drop handler and the extension).
- The disabled primary button read as enabled in dark mode, where the fill is near-white —
  opacity dropped and the label now fades with it.


## Revision, 2026-09-17 — no-scroll layout + Share menu

**The window scrolled when options expanded.** Replaced the ScrollView with
collapsible cards (one open at a time, each keeping a one-line summary when
closed) and `.windowResizability(.contentSize)`, so expanding a section makes
the window taller rather than producing a scrollbar. The drop zone collapses to
a single row once files are added. Two bounded exceptions remain, both inside an
obvious list: the file list (5 rows, scrolls internally up to the 25-file cap)
and the recipient chips (3 per row, 10 max).

Verified by screenshotting every state via a DEBUG-only `--demo` launch
argument, captured per-window by CGWindowID: 475pt empty, 514pt with files,
727pt at maximum. The hook is confirmed absent from Release (`strings` finds no
`--demo`). Two behaviours fixed while checking: adding a file no longer steals an
open settings panel, and the settings summary no longer truncates (the notify
state became an envelope badge instead of a word).

**The Share menu entry was missing** even though `pluginkit -m` reported it
registered and enabled — Finder serves a cached service list. Fixed by
`lsregister -f -R -trusted` on the installed app plus `killall Finder`.
Confirmed two ways: `NSSharingService.sharingServices(forItems:)` now lists
"Gemba Filesend", and invoking that service on a real file produced a working
share whose link decrypted byte-identically through the web's crypto.
The recovery steps are in `macos/README.md`.
