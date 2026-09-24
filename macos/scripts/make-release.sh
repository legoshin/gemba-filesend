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
# The build is universal (Apple silicon + Intel). It is signed with the
# "Developer ID Application" certificate when one is in the keychain (nothing to
# configure — the Team ID comes from the certificate), and ad-hoc otherwise.
#
# It is also notarized and stapled when notarization credentials are available,
# which is what lets anyone open it with no Gatekeeper warning. Credentials, in
# the order they are tried:
#
#   1. ~/.config/gemba-filesend/notary.env — sourced if present, and the place
#      to keep the three values below so a release needs no arguments.
#   2. An App Store Connect API key:
#        GEMBA_NOTARY_KEY=~/private_keys/AuthKey_XXXXXXXXXX.p8
#        GEMBA_NOTARY_KEY_ID=XXXXXXXXXX
#        GEMBA_NOTARY_ISSUER=aaaaaaaa-bbbb-…
#   3. A stored notarytool keychain profile: GEMBA_NOTARY_PROFILE=<name>
#
# --no-notarize skips the Apple round trip. Without credentials the release is
# still signed, and the script says what is missing.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
MACOS_DIR="$(cd "$HERE/.." && pwd)"
DIST="$MACOS_DIR/dist"
BUILD="$MACOS_DIR/.build-release"
APP_NAME="Gemba Filesend"
BASE_URL="https://send.gemba.uk/download"
PUBLISH=0
NOTARIZE=1
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
    --no-notarize) NOTARIZE=0 ;;
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

# ----------------------------------------------------------------- identity
# Signing identity and Team ID come from the keychain, never from a file, so
# there is nothing to edit on a new machine and nothing secret in the repo.
IDENTITY_LINE="$(security find-identity -v -p codesigning 2>/dev/null | grep "Developer ID Application" | head -1 || true)"
if [ -n "$IDENTITY_LINE" ]; then
  IDENTITY_NAME="$(echo "$IDENTITY_LINE" | sed -E 's/.*"(.*)"$/\1/')"
  TEAM_ID="$(echo "$IDENTITY_NAME" | sed -E 's/.*\(([A-Z0-9]+)\)$/\1/')"
  SIGNING=(CODE_SIGN_IDENTITY="Developer ID Application" DEVELOPMENT_TEAM="$TEAM_ID"
           CODE_SIGN_STYLE=Manual OTHER_CODE_SIGN_FLAGS="--timestamp")
else
  IDENTITY_NAME=""
  TEAM_ID=""
  # Ad-hoc, as Configs/Signing.xcconfig already says — spelled out because
  # /bin/bash 3.2 (what macOS ships) can't expand an empty array under `set -u`.
  SIGNING=(CODE_SIGN_IDENTITY="-")
fi

# Notarization credentials: a file first, then the environment.
NOTARY_ENV="${GEMBA_NOTARY_ENV:-$HOME/.config/gemba-filesend/notary.env}"
# shellcheck disable=SC1090
[ -f "$NOTARY_ENV" ] && . "$NOTARY_ENV"
NOTARY_ARGS=()
if [ -n "${GEMBA_NOTARY_KEY:-}" ] && [ -n "${GEMBA_NOTARY_KEY_ID:-}" ] && [ -n "${GEMBA_NOTARY_ISSUER:-}" ]; then
  NOTARY_ARGS=(--key "${GEMBA_NOTARY_KEY/#\~/$HOME}" --key-id "$GEMBA_NOTARY_KEY_ID" --issuer "$GEMBA_NOTARY_ISSUER")
elif [ -n "${GEMBA_NOTARY_PROFILE:-}" ]; then
  NOTARY_ARGS=(--keychain-profile "$GEMBA_NOTARY_PROFILE")
fi
[ "$NOTARIZE" = 1 ] && [ -n "$IDENTITY_NAME" ] && [ ${#NOTARY_ARGS[@]} -gt 0 ] && NOTARIZE=1 || NOTARIZE=0

# Submits one file and waits. Apple usually answers in a minute or two.
notarize_file() {
  local file="$1"
  xcrun notarytool submit "$file" "${NOTARY_ARGS[@]}" --wait --timeout 30m > "$LOG" 2>&1 || {
    sed -n '1,40p' "$LOG" >&2
    fail "notarization failed for $(basename "$file") — full output: $LOG"
  }
  grep -qiE "status: Accepted" "$LOG" || {
    sed -n '1,40p' "$LOG" >&2
    SUBMISSION="$(grep -m1 -oE '[0-9a-f-]{36}' "$LOG" || true)"
    [ -n "$SUBMISSION" ] && xcrun notarytool log "$SUBMISSION" "${NOTARY_ARGS[@]}" 2>/dev/null | head -40 >&2
    fail "Apple did not accept $(basename "$file")"
  }
}

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
  ARCHS="arm64 x86_64" ONLY_ACTIVE_ARCH=NO "${SIGNING[@]}" build > "$LOG" 2>&1 \
  || { grep -E "error:" "$LOG" | grep -v "CoreDevice\|CoreSimulator\|DVTPlugIn\|SwiftCompile normal" | head -15 >&2; fail "build failed — full output: $LOG"; }
APP="$BUILD/Build/Products/Release/$APP_NAME.app"
[ -d "$APP" ] || fail "no app at $APP"
codesign --verify --deep --strict "$APP" || fail "the built app's signature does not verify"
# Note: `… | grep -q` would be wrong here. grep exits at the first match and
# `set -o pipefail` then reports the SIGPIPE from codesign, so a match would
# look like a failure. Read the output into a variable and match on that.
ENTITLEMENTS="$(codesign -d --entitlements - --xml "$APP" 2>/dev/null || true)"
case "$ENTITLEMENTS" in
  *get-task-allow*) fail "Release build carries get-task-allow" ;;
esac
VERSION="$(defaults read "$APP/Contents/Info" CFBundleShortVersionString)"
if [ -n "$IDENTITY_NAME" ]; then
  SIGNATURE="$(codesign -dvv "$APP" 2>&1 || true)"
  case "$SIGNATURE" in
    *"Authority=Developer ID Application"*) ;;
    *) fail "the app is not signed with the Developer ID certificate" ;;
  esac
  echo "  signed: $IDENTITY_NAME"
else
  echo "  ad-hoc signed — no \"Developer ID Application\" certificate in the keychain"
fi
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

# -------------------------------------------------------------- notarization
if [ "$NOTARIZE" = 1 ]; then
  step "Notarizing the app"
  SUBMIT_ZIP="$(mktemp -d -t gemba-notarize)/app.zip"
  ditto -c -k --sequesterRsrc --keepParent "$APP" "$SUBMIT_ZIP"
  notarize_file "$SUBMIT_ZIP"
  # The ticket is stapled into the bundle, so Gatekeeper can check it with no
  # network — and everything packaged below carries it.
  xcrun stapler staple "$APP" >/dev/null || fail "couldn't staple the ticket to the app"
  rm -rf "$(dirname "$SUBMIT_ZIP")"
  spctl --assess --type execute "$APP" >/dev/null 2>&1 \
    && echo "  notarized and stapled — Gatekeeper accepts it" \
    || fail "Gatekeeper still rejects the app after stapling"
elif [ -n "$IDENTITY_NAME" ]; then
  step "Notarization skipped"
  if [ ${#NOTARY_ARGS[@]} -eq 0 ]; then
    echo "  no credentials — put GEMBA_NOTARY_KEY / _KEY_ID / _ISSUER in $NOTARY_ENV"
  else
    echo "  --no-notarize"
  fi
  echo "  the build is signed but not notarized: it opens on this Mac, and"
  echo "  Gatekeeper blocks a browser-downloaded copy on anyone else's."
fi

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

if [ -n "$IDENTITY_NAME" ]; then
  # Sign the image itself too. A stapled ticket alone leaves Gatekeeper with
  # "no usable signature" when the DMG is opened from a browser download.
  codesign --force --sign "$IDENTITY_NAME" --timestamp "$DIST/$STEM.dmg" >/dev/null 2>&1 \
    || fail "couldn't sign the disk image"
fi
if [ "$NOTARIZE" = 1 ]; then
  step "Notarizing the disk image"
  # The app inside is stapled already; stapling the DMG itself means the image
  # also passes when it is checked before being opened.
  notarize_file "$DIST/$STEM.dmg"
  xcrun stapler staple "$DIST/$STEM.dmg" >/dev/null || fail "couldn't staple the ticket to the DMG"
  # As a browser-downloaded copy is judged: signed, notarized, ticket attached.
  spctl --assess --type open --context context:primary-signature "$DIST/$STEM.dmg" >/dev/null 2>&1 \
    && echo "  signed, notarized and stapled — Gatekeeper accepts the image too" \
    || fail "Gatekeeper rejects the disk image after stapling"
fi

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
