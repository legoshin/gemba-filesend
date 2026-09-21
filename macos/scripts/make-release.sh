#!/bin/bash
# Builds everything needed to distribute Gemba Filesend, into macos/dist/:
#
#   GembaFilesend-<version>.dmg    drag-to-Applications disk image
#   GembaFilesend-<version>.zip    the app, zipped — what install.sh downloads
#   GembaFilesend.dmg / .zip       the same files under stable names, so a
#                                  hosted install.sh URL never has to change
#   *.sha256                       checksums beside each file
#   install.sh                     the command-line installer
#
#   ./scripts/make-release.sh --publish        build, then copy into public/download/
#   ./scripts/make-release.sh --url https://downloads.example.com/filesend
#
# The files are hosted by the web app itself, at https://send.gemba.uk/download/
# (served from the repo's public/download/ folder). That is the default --url:
# it is written into install.sh, together with the zip's SHA-256, so the
# installer refuses any file but this exact build.
#
# --publish copies the stable-named files (GembaFilesend.dmg/.zip, their .sha256
# and install.sh) into public/download/. Commit them and deploy the site, and
#   curl -fsSL https://send.gemba.uk/download/install.sh | bash
# installs this build.
#
# --version 1.2.0 sets the app's version (both Info.plists) and bumps the build
# number, so installed copies see the release as an update. Every release is
# also described by version.json, signed with the update key (see
# scripts/update-key.swift), which is what the app's auto-updater reads;
# --notes "…" adds a line of release notes to it.
#
# Other options: --skip-tests, --plain-dmg (skip the Finder window styling,
# which needs permission to control Finder the first time), --no-url (leave
# install.sh's URL unset).
#
# The build is universal (Apple silicon + Intel) and ad-hoc signed, not
# notarized — see "Gatekeeper" in macos/README.md for what that means for the
# DMG versus the command-line installer.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
MACOS_DIR="$(cd "$HERE/.." && pwd)"
DIST="$MACOS_DIR/dist"
BUILD="$MACOS_DIR/.build-release"
APP_NAME="Gemba Filesend"
BASE_URL="https://send.gemba.uk/download"
PUBLISH=0
NEW_VERSION=""
NOTES=""
RUN_TESTS=1
STYLE_DMG=1

while [ $# -gt 0 ]; do
  case "$1" in
    --url) shift; BASE_URL="${1:-}"; [ -n "$BASE_URL" ] || { echo "--url needs a value" >&2; exit 2; } ;;
    --no-url) BASE_URL="" ;;
    --publish) PUBLISH=1 ;;
    --version) shift; NEW_VERSION="${1:-}"; [[ "$NEW_VERSION" =~ ^[0-9]+(\.[0-9]+){0,3}$ ]] || { echo "--version needs a number like 1.2.0" >&2; exit 2; } ;;
    --notes) shift; NOTES="${1:-}" ;;
    --skip-tests) RUN_TESTS=0 ;;
    --plain-dmg) STYLE_DMG=0 ;;
    -h|--help) sed -n '2,36p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done
case "$BASE_URL" in ""|https://*) ;; *) echo "--url must start with https://" >&2; exit 2 ;; esac
BASE_URL="${BASE_URL%/}"

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
fail() { printf '\033[31merror: %s\033[0m\n' "$1" >&2; exit 1; }
LOG="$MACOS_DIR/.build-logs/release.log"
mkdir -p "$(dirname "$LOG")"

# The update key signs version.json's download. Publishing without it would
# ship a release no installed app can verify, so check before building.
UPDATE_KEY="${GEMBA_UPDATE_KEY:-$HOME/.config/gemba-filesend/update-signing.key}"
if [ "$PUBLISH" = 1 ] && [ ! -f "$UPDATE_KEY" ]; then
  fail "no update signing key at $UPDATE_KEY — restore it from your backup (or, for the very first release, run: swift scripts/update-key.swift generate)"
fi

# ------------------------------------------------------------------ version
set_plist_string() {  # file key value — edits the text, keeping the file's layout
  python3 - "$1" "$2" "$3" <<'PY'
import re, sys
path, key, value = sys.argv[1:]
text = open(path).read()
new, n = re.subn(r"(<key>%s</key>\s*<string>)[^<]*(</string>)" % re.escape(key), lambda m: m.group(1) + value + m.group(2), text)
if n != 1: sys.exit("%s: %s not found" % (path, key))
open(path, "w").write(new)
PY
}
if [ -n "$NEW_VERSION" ]; then
  step "Version $NEW_VERSION"
  OLD_BUILD="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$MACOS_DIR/GembaFilesend/Info.plist")"
  NEW_BUILD=$((OLD_BUILD + 1))
  for plist in "$MACOS_DIR/GembaFilesend/Info.plist" "$MACOS_DIR/ShareExtension/Info.plist" "$MACOS_DIR/UpdateHelper/Info.plist"; do
    set_plist_string "$plist" CFBundleShortVersionString "$NEW_VERSION"
    set_plist_string "$plist" CFBundleVersion "$NEW_BUILD"
  done
  echo "  $NEW_VERSION (build $NEW_BUILD) — commit the three Info.plists with the release"
fi

# ------------------------------------------------------------------- tests
if [ "$RUN_TESTS" -eq 1 ]; then
  step "Testing GembaKit"
  (cd "$MACOS_DIR/GembaKit" && swift test > "$LOG" 2>&1) \
    || { grep -E "error:|failed" "$LOG" | grep -v "Build failed\|fatalError" | head -15 >&2; fail "tests failed — full output: $LOG"; }
  echo "  $(grep -cE "Test Case .* passed" "$LOG") tests passed"
fi

# ------------------------------------------------------------------- build
step "Building a universal Release (arm64 + x86_64)"
for ruby in ruby /usr/bin/ruby; do
  if command -v "$ruby" >/dev/null && "$ruby" -e "require 'xcodeproj'" 2>/dev/null; then
    "$ruby" "$HERE/generate-project.rb" >/dev/null
    break
  fi
done
xcodebuild -project "$MACOS_DIR/GembaFilesend.xcodeproj" -scheme GembaFilesend \
  -configuration Release -derivedDataPath "$BUILD" \
  ARCHS="arm64 x86_64" ONLY_ACTIVE_ARCH=NO build > "$LOG" 2>&1 \
  || { grep -E "error:" "$LOG" | grep -v "CoreDevice\|CoreSimulator\|DVTPlugIn\|SwiftCompile normal" | head -15 >&2; fail "build failed — full output: $LOG"; }
APP="$BUILD/Build/Products/Release/$APP_NAME.app"
[ -d "$APP" ] || fail "no app at $APP"
codesign --verify --deep --strict "$APP" || fail "the built app's signature does not verify"
if codesign -d --entitlements - --xml "$APP" 2>/dev/null | grep -q get-task-allow; then
  fail "Release build carries get-task-allow"
fi
VERSION="$(defaults read "$APP/Contents/Info" CFBundleShortVersionString)"
# LaunchServices registers any app it notices, build products included. A
# second registered copy of the Share Extension can shadow the installed one,
# so take this build copy out of both registries — it is only ever packaged.
LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
pluginkit -r "$APP/Contents/PlugIns/ShareExtension.appex" 2>/dev/null || true
"$LSREGISTER" -u "$APP" 2>/dev/null || true
# The updater helper is built both standalone and embedded; neither build copy
# should stay registered (it handles the gemba-filesend-updater: URL).
"$LSREGISTER" -u "$APP/Contents/Helpers/Gemba Filesend Updater.app" 2>/dev/null || true
"$LSREGISTER" -u "$(dirname "$APP")/Gemba Filesend Updater.app" 2>/dev/null || true
# Unregistering the build copy can drop the installed app's extension too (same
# bundle id), so put an installed copy back and keep it switched on.
INSTALLED="/Applications/$APP_NAME.app"
if [ -d "$INSTALLED" ]; then
  "$LSREGISTER" -f -R -trusted "$INSTALLED" 2>/dev/null || true
  pluginkit -a "$INSTALLED/Contents/PlugIns/ShareExtension.appex" 2>/dev/null || true
  pluginkit -e use -i uk.gemba.filesend.mac.ShareExtension 2>/dev/null || true
fi
echo "  $APP_NAME $VERSION · $(lipo -archs "$APP/Contents/MacOS/$APP_NAME") · $(du -sh "$APP" | cut -f1)"

rm -rf "$DIST"; mkdir -p "$DIST"
STEM="GembaFilesend-$VERSION"

# --------------------------------------------------------------------- zip
step "Zipping"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$DIST/$STEM.zip"
echo "  $STEM.zip ($(du -h "$DIST/$STEM.zip" | cut -f1 | tr -d ' '))"

# --------------------------------------------------------------------- dmg
step "Building the disk image"
WORK="$(mktemp -d -t gemba-dmg)"
DEVICE=""
cleanup() {
  if [ -n "$DEVICE" ]; then hdiutil detach "$DEVICE" -force -quiet 2>/dev/null || true; fi
  rm -rf "$WORK"
}
trap cleanup EXIT

STAGE="$WORK/stage"
mkdir -p "$STAGE/.background"
ditto "$APP" "$STAGE/$APP_NAME.app"
ln -s /Applications "$STAGE/Applications"
cp "$MACOS_DIR/installer/dmg-background.tiff" "$STAGE/.background/background.tiff"
cp "$MACOS_DIR/GembaFilesend/AppIcon.icns" "$STAGE/.VolumeIcon.icns"

# Build writable first so Finder can lay the window out, then compress.
VOLUME="$APP_NAME"
hdiutil create -volname "$VOLUME" -srcfolder "$STAGE" -fs HFS+ -format UDRW -ov "$WORK/rw.dmg" -quiet
ATTACH="$(hdiutil attach "$WORK/rw.dmg" -readwrite -noverify -noautoopen)"
DEVICE="$(echo "$ATTACH" | awk '/Apple_HFS/ {print $1}' | head -1)"
MOUNTED="$(echo "$ATTACH" | awk -F'\t' '/Apple_HFS/ {print $NF}' | head -1)"
[ -n "$MOUNTED" ] || fail "could not mount the working image"

# Address the volume by the name it actually mounted under: if a copy of this
# DMG is already open, macOS mounts this one as "Gemba Filesend 1".
DISK_NAME="$(basename "$MOUNTED")"

# The volume uses the app icon. SetFile ships with Xcode's command-line tools.
if command -v SetFile >/dev/null; then SetFile -a C "$MOUNTED"; fi

STYLED=0
if [ "$STYLE_DMG" -eq 1 ]; then
  # A just-attached volume exists on disk before Finder knows about it; ask
  # Finder too early and it answers "Can't get disk". Wait until it can see it.
  for _ in $(seq 1 20); do
    [ "$(osascript -e "tell application \"Finder\" to exists disk \"$DISK_NAME\"" 2>/dev/null)" = "true" ] && break
    sleep 0.5
  done
  # Layout contract with installer/make-dmg-background.swift: 660×420 window,
  # icons 112pt at (170,190) and (490,190).
  if osascript <<APPLESCRIPT >/dev/null 2>"$WORK/osa.err"
tell application "Finder"
  tell disk "$DISK_NAME"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    try
      set pathbar visible of container window to false
    end try
    try
      set sidebar width of container window to 0
    end try
    set the bounds of container window to {200, 120, 860, 562}
    set viewOptions to the icon view options of container window
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to 112
    set text size of viewOptions to 12
    set background picture of viewOptions to file ".background:background.tiff"
    set position of item "$APP_NAME.app" of container window to {170, 190}
    set position of item "Applications" of container window to {490, 190}
    -- Close and reopen before the final close: Finder only writes the window
    -- geometry into .DS_Store reliably on a second pass (what create-dmg does).
    close
    open
    set the bounds of container window to {200, 120, 860, 562}
    update without registering applications
    delay 2
    close
  end tell
end tell
APPLESCRIPT
  then
    STYLED=1
    echo "  window styled: background, icon layout, drag-to-Applications"
  else
    echo "  note: couldn't style the window ($(head -1 "$WORK/osa.err")). The DMG still works;"
    echo "        allow this terminal to control Finder (System Settings ▸ Privacy & Security"
    echo "        ▸ Automation) and rerun for the styled window, or pass --plain-dmg."
  fi
fi

sync
hdiutil detach "$DEVICE" -quiet
DEVICE=""
hdiutil convert "$WORK/rw.dmg" -format UDZO -imagekey zlib-level=9 -o "$DIST/$STEM.dmg" -quiet
hdiutil verify "$DIST/$STEM.dmg" -quiet || fail "the finished disk image does not verify"
echo "  $STEM.dmg ($(du -h "$DIST/$STEM.dmg" | cut -f1 | tr -d ' '))$( [ $STYLED -eq 1 ] || echo ', unstyled')"

# ----------------------------------------------------- stable names + sums
step "Checksums"
cp "$DIST/$STEM.zip" "$DIST/GembaFilesend.zip"
cp "$DIST/$STEM.dmg" "$DIST/GembaFilesend.dmg"
for f in "$STEM.zip" "$STEM.dmg" GembaFilesend.zip GembaFilesend.dmg; do
  (cd "$DIST" && shasum -a 256 "$f" > "$f.sha256")
done
ZIP_SHA="$(awk '{print $1}' "$DIST/GembaFilesend.zip.sha256")"
DMG_SHA="$(awk '{print $1}' "$DIST/GembaFilesend.dmg.sha256")"
echo "  zip  $ZIP_SHA"
echo "  dmg  $DMG_SHA"

# ------------------------------------------------------------ version.json
step "Update manifest"
BUILD_NUMBER="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP/Contents/Info.plist")"
if [ -f "$UPDATE_KEY" ]; then
  SIGNATURE="$(GEMBA_UPDATE_KEY="$UPDATE_KEY" swift "$HERE/update-key.swift" sign "$DIST/GembaFilesend.zip")" \
    || fail "couldn't sign the zip"
  GEMBA_NOTES="$NOTES" python3 - "$DIST/version.json" <<PY
import json, sys, os, datetime
json.dump({
    "version": "$VERSION",
    "build": int("$BUILD_NUMBER"),
    "url": "${BASE_URL:-https://send.gemba.uk/download}/GembaFilesend.zip?build=$BUILD_NUMBER",
    "size": os.path.getsize("$DIST/GembaFilesend.zip"),
    "sha256": "$ZIP_SHA",
    "signature": "$SIGNATURE",
    "minimumSystemVersion": "14.0",
    "notes": os.environ.get("GEMBA_NOTES") or None,
    "published": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
}, open(sys.argv[1], "w"), indent=2)
PY
  echo "  $VERSION (build $BUILD_NUMBER), signed"
else
  echo "  skipped — no update signing key at $UPDATE_KEY"
fi

# ------------------------------------------------------------- installer
step "Command-line installer"
cp "$MACOS_DIR/installer/install.sh" "$DIST/install.sh"
if [ -n "$BASE_URL" ]; then
  # Stamp the stable zip name, so this install.sh keeps working until the next
  # release replaces it — and pin this build's hash, so it installs nothing else.
  sed -i '' \
    -e "s|__GEMBA_DOWNLOAD_URL__|$BASE_URL/GembaFilesend.zip|" \
    -e "s|__GEMBA_SHA256__|$ZIP_SHA|" \
    "$DIST/install.sh"
  echo "  download URL: $BASE_URL/GembaFilesend.zip (hash pinned)"
else
  echo "  download URL not set — pass --url, or edit DOWNLOAD_URL at the top of dist/install.sh"
fi
chmod +x "$DIST/install.sh"

step "Ready: $DIST"
(cd "$DIST" && ls -1 | sed 's/^/  /')

if [ "$PUBLISH" = 1 ]; then
  PUBLIC="$(cd "$MACOS_DIR/.." && pwd)/public/download"
  step "Publishing to $PUBLIC"
  mkdir -p "$PUBLIC"
  # Installed apps only update to a higher build; republishing the same one
  # would change the download under them without them ever noticing.
  if [ -f "$PUBLIC/version.json" ]; then
    LIVE_BUILD="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["build"])' "$PUBLIC/version.json")"
    [ "$BUILD_NUMBER" -gt "$LIVE_BUILD" ] \
      || fail "build $BUILD_NUMBER isn't newer than the published build $LIVE_BUILD — pass --version to make a new release"
  fi
  for f in GembaFilesend.dmg GembaFilesend.dmg.sha256 GembaFilesend.zip GembaFilesend.zip.sha256 install.sh version.json; do
    cp "$DIST/$f" "$PUBLIC/$f"
    echo "  $f"
  done
  printf '\nCommit public/download/ and deploy the site. Then:\n'
fi
if [ -n "$BASE_URL" ]; then
  [ "$PUBLISH" = 1 ] || printf '\nUpload these to %s:\n  GembaFilesend.dmg, GembaFilesend.zip, their .sha256 files, install.sh\nThen:\n' "$BASE_URL"
  printf '\n  DMG:        %s/GembaFilesend.dmg\n' "$BASE_URL"
  printf '  Installer:  curl -fsSL %s/install.sh | bash\n\n' "$BASE_URL"
fi
