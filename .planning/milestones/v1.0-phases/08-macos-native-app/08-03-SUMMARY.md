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


## Addition, 2026-09-17 — one-command build

`macos/scripts/build-app.sh` does test → regenerate-if-stale → icon → build →
install → register → verify. The registration step is the point: LaunchServices
re-registration, `pluginkit -e use`, and a Finder restart all have to happen or
the Share menu entry never appears, which is the failure this phase already hit
once by hand.

`scripts/generate-project.rb` now assigns object ids in creation order instead of
the random ones xcodeproj hands out. Without that, regenerating rewrote every id
and left a ~400-line diff in `project.pbxproj` after every build. Verified
reproducible: three consecutive runs produce a byte-identical file.


## Fixes, 2026-09-17 — first run on a second Mac

Two failures on a fresh checkout on another machine, both in the tooling rather
than the app.

1. **`error: fatalError` with nothing else.** That line is SwiftPM's own
   announcement of a build failure and carries no information; the real cause was
   buried. Two changes: the test fixtures no longer load via `fatalError` in a
   static initializer (a crash there takes down the test process and leaves only
   that word), and `build-app.sh` now extracts the real compiler and assertion
   lines from the log, filtering SwiftPM's and xcodebuild's own noise, and keeps
   the full log at `macos/.build-logs/last-run.log`. Verified by breaking a
   source file on purpose: the output now names the file, line and error.
   The fixtures also fall back to the copy beside the test source when the
   resource bundle is not in place, which is the cold-checkout case — verified by
   deleting the built bundle's copy and re-running the test green.

2. **"the project needs regenerating but the xcodeproj gem is missing"** on a
   machine that had changed nothing. The staleness check compared mtimes, and a
   `git clone` stamps every file at checkout time in arbitrary order, so a fresh
   clone looked stale. It now compares the file names the project references
   against the files on disk — which is what regeneration actually changes — and
   a missing gem is a warning that still builds, not a hard stop. Only a first
   checkout with no committed project fails outright, with install instructions.
   Verified all four combinations (clean/stale × gem present/absent).
