# Gemba Filesend for macOS

A native send-first client for [send.gemba.uk](https://send.gemba.uk). Pick or
drop files **or folders**, they are encrypted on this Mac, uploaded, and
collapsed into one share link whose key lives only in the URL fragment. Also in
Finder's Share menu, for files and folders alike.

Links are interchangeable with the web app in both directions: a link made here
opens in a browser, and a link made in a browser is the same shape this app
produces. That is verified, not assumed — see **Verifying interop**.

## Layout

```
macos/
├─ GembaKit/                  Swift package — the whole non-UI core
│  ├─ Sources/GembaCrypto     AES-128-GCM packed format, base64url, share links
│  ├─ Sources/GembaUpload     storage mode, blob client, folder zipping, finalize, notify
│  ├─ Sources/gemba-send      CLI front end to the same core (used for e2e tests)
│  └─ Tests/                  48 tests, including the web-generated crypto vectors
├─ GembaFilesend/             SwiftUI app target (+ AppIcon.icns)
│  └─ SmoothUI/               the component kit — see "Design"
├─ ShareExtension/            Finder / Share-menu extension
├─ Configs/Signing.xcconfig   the one place signing is configured
├─ installer/                 install.sh (command-line installer) + DMG background
├─ GembaFilesend.xcodeproj    generated — see scripts/generate-project.rb
└─ scripts/
   ├─ build-app.sh            test, build, install to /Applications, register
   ├─ make-release.sh         universal build → DMG, zip, checksums, install.sh
   ├─ package-dmg.sh          the Developer ID + notarization route (unused)
   ├─ generate-project.rb     regenerates the Xcode project from these sources
   ├─ gen-vectors.mjs         regenerates crypto vectors from the web WebCrypto path
   ├─ verify-interop.mjs      downloads + decrypts a Mac-made link with the web's crypto
   └─ make-icon.sh            builds AppIcon.icns from the brand mark
```

`GembaCrypto`, `GembaUpload` and `SmoothUI` are compiled into both the app and
the extension, so there is exactly one implementation of the wire format and
one of the interface.

## Build and run

```sh
cd macos
./scripts/build-app.sh                # test, build Release, install, register
./scripts/build-app.sh --debug        # Debug build (adds the --demo hook)
./scripts/build-app.sh --no-install   # build only, leave /Applications alone
```

It runs the tests, regenerates the Xcode project if source files were added or
removed, builds, installs to `/Applications`, and does the three-step Share
Extension registration macOS needs (LaunchServices, enable, restart Finder) —
miss any of those and the Share menu entry silently never appears. It also
unregisters the build-directory copy afterwards: a second registered copy with
the same bundle id can shadow the installed extension.

Requires Xcode 27 / Swift 6 and a macOS 14+ deployment target. The `xcodeproj`
gem is only needed to regenerate the project (`gem install --user-install
xcodeproj`); `project.pbxproj` is committed and generated reproducibly, so a
diff in it always means something changed.

## Folders

A folder travels as one `.zip`, written by `ZipWriter` — a streaming writer on
the system's zlib, with nothing third-party. The zip keeps the folder as its top
level and opens with Finder, Windows and `unzip`.

It replaced `NSFileCoordinator`'s `.forUploading` (Finder's own Compress), which
works outside the sandbox but, inside the sandboxed Share Extension, fails on
ordinary symbolic links — `node_modules/.bin/jsesc`, `.build/release` — with
"couldn't be opened because there is no such file". Developer folders are full
of them. `ZipWriter`:

- stores **symlinks as links** (as Finder and `ditto` do): never followed, so
  it never reads outside the folder it was given and can't loop;
- keeps empty folders and Unix permissions — executable scripts stay executable;
- writes names as UTF-8 in NFC, so Windows and Linux see what macOS shows;
- streams through DEFLATE at zlib's fast level, and stores already-compressed
  formats (images, video, archives, Office files) instead of re-deflating them;
- uses ZIP64 for files, offsets or entry counts past the classic limits;
- refuses rather than silently leaving anything out.

Measured on real developer folders, and checked by `unzip -t`, `ditto` and
Python's `zipfile` against an independent `find` listing: a 740 MB folder of
31,516 files zips in about 10 s; a 115 MB one in 3 s. To check any folder
locally — nothing is uploaded, and the zip is deleted:

```sh
cd macos/GembaKit
GEMBA_ZIP_TEST_FOLDER=~/dev/some-project swift test --filter testRealFolderIfProvided
```

The temporary zip is only ever created inside the uploader's working directory,
which is removed on every exit path, and each zip is also deleted as soon as its
part has uploaded. Compression progress fills the first fifth of the progress
bar, so the bar only ever moves forward. Two folders with the same name get
separate slots. The recipient sees `Photos.zip`; the sender sees `Photos · 12
files · sent as Photos.zip`.

## The crypto contract

Must byte-match `src/lib/crypto.ts`. Any drift here silently breaks every link.

| Property | Value |
|---|---|
| Algorithm | AES-**128**-GCM (not 256) |
| Key | 16 random bytes, one per share, shared by every file in it |
| IV | 12 random bytes, fresh per file |
| Packed blob | `[12-byte IV][ciphertext][16-byte tag]` |
| Key encoding | base64url, unpadded, only ever in the link fragment |
| Share id | 8 random bytes as 16 lowercase hex chars |
| Link | `https://send.gemba.uk/download?id={id}[&pw=1]#{key}` |

CryptoKit's `AES.GCM.SealedBox.combined` is exactly `nonce ‖ ciphertext ‖ tag`,
which is the web's packed layout byte for byte, so neither side re-lays it out.

`Tests/GembaCryptoTests/vectors.json` is generated by running the web's own
crypto through Node's WebCrypto (`scripts/gen-vectors.mjs`), so the Swift side is
tested against the web implementation rather than against a second reading of
the spec. Regenerate it whenever `src/lib/crypto.ts` changes.

### One-shot encryption, deliberately

GCM over a whole file cannot be chunked without changing the wire format, and
the platform has no incremental AES-GCM this app can use: CommonCrypto's GCM
entry points are gone from the current SDK, and CryptoKit's in-place `seal` is
macOS 27+. So encryption is one-shot, with the plaintext memory-mapped and the
ciphertext written straight to a temp file that is then uploaded from disk.
Peak memory is about one ciphertext, against the browser's three full copies.
Files above 2 GB show a heads-up before the run.

## Upload flow

Mirrors the web app exactly, because the server depends on the ordering:

1. `GET /api/storage-mode` — `blob` in production, `fs` for a local dev server.
2. One share id and one key for the whole selection.
3. Each folder is zipped into the uploader's temporary directory (see *Folders*).
4. Per file: encrypt to a temp part, then
   - **blob**: `POST /api/files` with a `blob.generate-client-token` event to
     mint a token scoped to `gemba/blob/{id}/`, then `PUT` the bytes straight to
     Vercel Blob. The file never passes through the app's server.
   - **fs**: `POST /api/files` with `x-file-id` / `x-file-index` headers.
5. `POST /api/files/finalize` once — the single meta write and the single
   download-counter seed for the whole share. Claim-once on the server.
6. Build the link, with the key after the `#`.
7. Optionally `POST /api/notify`.

There is no Swift equivalent of `@vercel/blob/client`, so `BlobClient` speaks
that protocol directly. It pins two constants from that package — the API URL
and `x-api-version: 12` — which need checking if `@vercel/blob` majors.

## Verifying interop

```sh
cd macos/GembaKit
swift run gemba-send --expires-in 1800 --downloads 2 ~/some-file.pdf
# prints: https://send.gemba.uk/download?id=…#…

cd ../..
node macos/scripts/verify-interop.mjs "<that link>" ~/some-file.pdf
```

Pass a folder instead of a file and the verifier unzips what arrived and
compares every file in the tree.

The verifier downloads through the real API and decrypts with the web app's own
crypto code, then compares against the original bytes. It also checks the packed
layout is `IV + ciphertext + tag`.

## Design: SmoothUI, natively

The interface is built from [SmoothUI](https://smoothui.dev) components (MIT,
© 2024 Eduardo Calvo). SmoothUI is React + Motion, so nothing is ported code:
each component is rebuilt in SwiftUI to the motion values in SmoothUI's own
source — `spring(duration: 0.25, bounce: 0.1)` as the house spring, which
SwiftUI expresses one-to-one. Colours stay Gemba's (`GembaTheme.swift`): SmoothUI
supplies behaviour, Gemba the palette. Every animated component honours Reduce
Motion, as SmoothUI does with `prefers-reduced-motion`.

| Where | SmoothUI component |
|---|---|
| Drop zone (scale 1.02, icon float, hint swap) | Animated File Upload |
| File rows in / out (x −16 → 0, out to x 24) | Animated File Upload, Animated List |
| Folder rows | Folder Reveal |
| Files / Share settings cards, one open at a time | Accordion |
| Item count on the Files card | Notification Badge |
| Total size, progress percentage | Number Flow |
| Expiry (amount + hours/days/months) | Duration Picker, Animated Tabs, Animated Number Input |
| Download limit (roll, shake at bounds, drag to scrub) | Animated Number Input |
| Password, recipient email | Animated Input (floating label) |
| Option switches | Animated Toggle |
| Recipient chips | Animated Tags |
| Buttons | Smooth Button |
| Send button label, progress label | Text Morph (one `Text` with glyph interpolation — see below) |
| Upload progress | Animated Progress Bar, Border Beam, Motion Loader |
| Compose ⇄ result | Swap Panel |
| Result: tick, title, link | Spring Scale In, Soft Blur In, Scramble Hover (as a reveal) |
| Copy link | Button Copy |
| Header entrance | Shimmer Sweep |
| Errors, confirmations | Basic Toast |
| Encryption-failed question | Basic Modal / Dialog |
| Icon help | Animated Tooltip |
| Appearance | Theme Toggle |
| Extension: loading | Skeleton |
| Every surface | Squircle (continuous corners) |

One deliberate departure: SmoothUI's Text Morph animates each character as its
own element. Built that way natively, a label longer than its space — a long
filename plus "(4 of 8)" — was squeezed letter by letter instead of truncated,
and read as garbled glyphs. The native version is a single `Text` using
SwiftUI's glyph-interpolating transition: shared letters still glide between
strings, and long labels truncate in the middle so the count stays visible.

Not used, because nothing in a file sender needs them: the AI and orb
components, the WebGL shader transitions and surfaces, media and gallery
components, the scroll-driven ones (this window never scrolls), pointer effects,
most of the 37 text effects, and single-purpose cards (tweets, jobs, wallets,
pricing and similar). OTP input doesn't apply either — recipient codes are
entered on the web download page.

### Window layout: nothing scrolls

The window sizes to its content and never scrolls. At most one accordion is open;
toasts and the modal are overlays, so neither changes the window's height; the
two lists that can grow are bounded (five file rows, then that list scrolls on
its own; recipient chips wrap). Measured: 415pt empty, 495pt with files, 721pt
with every setting on — the tallest it gets. Toasts appear top-right, so they
never sit on the send button.

To check the layout in every state without clicking through it, a DEBUG-only
launch argument seeds the UI (it does not exist in Release builds):

```sh
open -n ".build-xcode/Build/Products/Debug/Gemba Filesend.app" --args --demo full --theme light
# --demo: files, settings, full, uploading, result, modal   --theme: light, dark, system
```

## Share Extension

Accepts up to 25 files and folders from Finder's Share menu, and does the whole
job itself — zip folders, encrypt, upload, finalize, copy the link — rather than
handing files to the main app through an App Group, which would need a real
provisioning profile. It holds security-scoped access to what was shared for the
whole upload, so a folder's contents stay readable while it is zipped. It uses
the app's first-run defaults (1 day, one download, encrypted); passwords and
recipients stay in the app.

If the entry doesn't appear, the registry and Finder's menu are out of sync —
`build-app.sh` and `install.sh` both handle it, and by hand it is:

```sh
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f -R -trusted "/Applications/Gemba Filesend.app"
pluginkit -e use -i uk.gemba.filesend.mac.ShareExtension
killall Finder
```

## Distribution

```sh
cd macos
./scripts/make-release.sh --url https://downloads.example.com/filesend
```

Produces `macos/dist/`: a styled drag-to-Applications **DMG**, a **zip**, both
under versioned and stable names, a `.sha256` beside each, and **`install.sh`**
with your URL and the zip's SHA-256 written into it. Upload the whole folder
together; people then install with

```sh
curl -fsSL https://downloads.example.com/filesend/install.sh | bash
```

The build is **universal** (Apple silicon and Intel) and ad-hoc signed.

`install.sh` — the download location is one line at the top (`DOWNLOAD_URL`),
or `--url`, or `GEMBA_DOWNLOAD_URL`; it accepts a `.zip` or a `.dmg`. It refuses
plain http, refuses any file whose SHA-256 doesn't match the pinned value (or,
unpinned, the `.sha256` beside it), checks the bundle id, the signature and that
the build runs on this Mac's architecture, then installs, registers the Share
Extension, and restarts Finder. `--user` installs to `~/Applications`,
`--uninstall` removes everything, `--purge` also removes saved data. Tested end
to end over HTTPS, including the tampered-file, unset-URL, plain-http and
checksum-sidecar refusals, the `.dmg` path, and uninstall.

### Gatekeeper — which route to give people

This build is not notarized. Verified on this Mac: Gatekeeper's policy rejects
it (`spctl --assess` says *rejected*), and Gatekeeper enforces that at launch
only for files carrying the quarantine flag.

- **Command-line installer** — `curl` does not set the quarantine flag, so the
  app opens with no prompt. This is the route to give other people.
- **DMG** — downloaded in a browser, it *is* quarantined, so the first launch is
  blocked until the person opens System Settings ▸ Privacy & Security ▸ **Open
  Anyway**. The DMG window says so, at the bottom.

To remove that prompt for DMG users, the app has to be notarized: install a
Developer ID Application certificate and use `scripts/package-dmg.sh`, which is
ready and needs nothing else. Mac App Store is not set up.

## Installing it locally

`./scripts/build-app.sh` from a checkout, or the one-line installer. A locally
built app has no quarantine flag, so it opens without any prompt.

## What is not done yet

- **No notarized build has been produced.** No Developer ID certificate is
  installed, deliberately; `package-dmg.sh` is written and reviewed but unexecuted
  past the certificate check.
- **Receive / download in the app.** `FileEncryptor.decrypt` and
  `ShareLink(parsing:)` exist and are tested; the missing part is the UI and the
  verification-code flow.
- **The icon's largest slot is upscaled** from the 512px brand mark.

## A note on the notify path

`/api/notify` is sent the full share link, which necessarily contains the key —
that is how the recipient gets a working link, and the web app does the same.
Worth being explicit about: with "email them the link" on, the key passes
through the server and the recipient's inbox. Everything else keeps the key on
the client.
