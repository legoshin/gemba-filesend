# 08-05 Summary — Folders, SmoothUI redesign, installer + DMG

**Plan:** executed inline 2026-09-21 from three user requests (folder sharing in the
Share menu; redesign with every applicable SmoothUI component; command-line and DMG
installers).
**Status:** Complete. 41 tests green; verified end to end against production.

## Folder sharing
- `FolderArchiver` zips via `NSFileCoordinator` `.forUploading` (Finder's own Compress;
  no subprocess, so it works in the sandboxed extension). `ShareItem` knows folders
  (`isFolder`, `displayName`, `fileCount`, `name` = `<folder>.zip`).
- `ShareUploader.resolve` zips each folder into its own slot inside the uploader's
  working directory, which is removed on every exit path; each zip is also deleted as
  soon as its part uploads. Same-named folders cannot collide.
- Extension: explicit activation rule (file URLs, ≤25), security-scoped access held
  for the whole upload. App: accepts folders by drop and panel.
- Verified: folder + file share decrypted by the web's crypto and unzipped to an
  identical tree (hidden file, empty dir, non-ASCII names); no temp directory after a
  successful run **and** after one forced to fail post-zip (local stub server); the
  sandboxed extension shared a folder end to end with no leftovers in its container.

## Redesign
- `GembaFilesend/SmoothUI/` — native SwiftUI rebuilds of 27 SmoothUI components, with
  motion values taken from SmoothUI's source (MIT, credited). Gemba palette kept.
  Mapping table in `macos/README.md`; non-applicable categories listed there too.
- Window still never scrolls: 415 / 495 / 721pt measured across states; toasts and the
  modal are overlays.
- Fixed from screenshots: toast covered the send button (moved top-right); upload label
  duplicated in card and button (button now "Sending…"); unit pill invisible in dark
  mode (uses `--button-emphasized-bg`). Checked in light and dark.
- Not seen: the extension's panel rendered — a scripted invocation never produces a
  capturable window. Functionally verified.

## Distribution
- `make-release.sh`: universal (arm64 + x86_64) Release → styled DMG, zip, stable and
  versioned names, `.sha256` sidecars, `install.sh` stamped with `--url` and the zip's
  pinned SHA-256. Unregisters its build copy afterwards.
- `installer/install.sh`: https-only, pinned or sidecar checksum, bundle id + signature
  + architecture checks, atomic swap into /Applications (falls back to ~/Applications),
  Share Extension registration, `--user`, `--uninstall`, `--purge`.
- Verified over real HTTPS (throwaway localhost cert): one-liner install, refusals for
  tampered file / unset URL / plain http / sidecar mismatch, `.dmg` install path,
  uninstall.
- Gatekeeper, verified: `spctl` rejects the ad-hoc build; enforcement applies to
  quarantined files; `curl` sets no quarantine flag. So the CLI installer opens cleanly
  on other Macs, and a browser-downloaded DMG needs "Open Anyway" — stated in the DMG
  window and the README.

## Fixed along the way
- Build scripts' `pkill -f` pattern matched the shell running them (killed itself).
- DMG window opened at 920pt with a path bar; Finder saw the volume before it was
  ready. Both fixed; geometry now exactly 660×442.
- Build-directory copies stayed registered and could shadow the installed extension;
  `build-app.sh` and `make-release.sh` now unregister them.
- Test count in script output reported one bundle (24) instead of all tests (41).
