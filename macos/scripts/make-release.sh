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
#   ./scripts/make-release.sh --url https://downloads.example.com/filesend
#   ./scripts/make-release.sh                  (leaves install.sh's URL unset)
#
# --url is the folder the dist/ files will be uploaded to. It is written into
# install.sh, together with the zip's SHA-256, so the installer refuses any file
# but this exact build. Upload the whole dist/ folder together.
#
# Other options: --skip-tests, --plain-dmg (skip the Finder window styling,
# which needs permission to control Finder the first time).
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
BASE_URL=""
RUN_TESTS=1
STYLE_DMG=1

while [ $# -gt 0 ]; do
  case "$1" in
    --url) shift; BASE_URL="${1:-}"; [ -n "$BASE_URL" ] || { echo "--url needs a value" >&2; exit 2; } ;;
    --skip-tests) RUN_TESTS=0 ;;
    --plain-dmg) STYLE_DMG=0 ;;
    -h|--help) sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
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

# ------------------------------------------------------------------- tests
if [ "$RUN_TESTS" -eq 1 ]; then
  step "Testing GembaKit"
  (cd "$MACOS_DIR/GembaKit" && swift test > "$LOG" 2>&1) \
    || { grep -E "error:|failed" "$LOG" | grep -v "Build failed\|fatalError" | head -15 >&2; fail "tests failed — full output: $LOG"; }
  echo "  $(grep -cE "Test Case .* passed" "$LOG") tests passed"
fi

# ------------------------------------------------------------------- build
step "Building a universal Release (arm64 + x86_64)"
if command -v ruby >/dev/null && ruby -e "require 'xcodeproj'" 2>/dev/null; then
  ruby "$HERE/generate-project.rb" >/dev/null
fi
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
if [ -n "$BASE_URL" ]; then
  printf '\nUpload the whole folder to %s, then anyone installs with:\n\n' "$BASE_URL"
  printf '  curl -fsSL %s/install.sh | bash\n\n' "$BASE_URL"
fi
