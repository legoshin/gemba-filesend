#!/bin/bash
# Gemba Filesend — command-line installer for macOS.
#
#   curl -fsSL https://YOUR-HOST/install.sh | bash
#   curl -fsSL https://YOUR-HOST/install.sh | bash -s -- --uninstall
#
# Options:
#   --user        install into ~/Applications instead of /Applications
#   --uninstall   remove the app and its Share Extension
#   --purge       with --uninstall, also remove the app's saved data
#   --url <url>   override the download location for this run
#   -h, --help    show this help
#
# ── Set the download location ─────────────────────────────────────────────
# Point DOWNLOAD_URL at the .zip or .dmg that make-release.sh produced. Both
# work: a .zip is extracted, a .dmg is mounted and copied from. The release
# script can write this for you: ./scripts/make-release.sh --url https://…
# GEMBA_DOWNLOAD_URL in the environment overrides it for a single run.
DOWNLOAD_URL="${GEMBA_DOWNLOAD_URL:-https://send.gemba.uk/download/GembaFilesend.zip}"
#
# Optional: pin the exact SHA-256 of that file. When pinned, anything else is
# refused. When not pinned, the installer looks for "<DOWNLOAD_URL>.sha256"
# beside the download and checks against that; if there is none it warns.
EXPECTED_SHA256="${GEMBA_SHA256:-6b1fdce4d06ded30dca6186be7acbd512c64c0504b7dfc0908d52ec331e7bf42}"
# ──────────────────────────────────────────────────────────────────────────

set -euo pipefail

APP_NAME="Gemba Filesend"
BUNDLE_ID="uk.gemba.filesend.mac"
EXTENSION_ID="$BUNDLE_ID.ShareExtension"
MIN_MACOS_MAJOR=14
LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

MODE=install
DEST_ROOT=/Applications
PURGE=0

if [ -t 1 ]; then BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'; RESET=$'\033[0m'
else BOLD=""; DIM=""; RED=""; GREEN=""; RESET=""; fi
step() { printf '%s==>%s %s\n' "$BOLD" "$RESET" "$1"; }
note() { printf '    %s%s%s\n' "$DIM" "$1" "$RESET"; }
fail() { printf '%serror:%s %s\n' "$RED" "$RESET" "$1" >&2; exit 1; }

# Inline, not read from "$0": when piped from curl there is no script file.
usage() {
  cat <<'USAGE'
Gemba Filesend installer

  curl -fsSL <url>/install.sh | bash                      install or update
  curl -fsSL <url>/install.sh | bash -s -- --uninstall    remove

Options:
  --user        install into ~/Applications instead of /Applications
  --uninstall   remove the app and its Share Extension
  --purge       with --uninstall, also remove the app's saved data
  --url <url>   override the download location for this run
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --user) DEST_ROOT="$HOME/Applications" ;;
    --uninstall) MODE=uninstall ;;
    --purge) PURGE=1 ;;
    --url) shift; [ $# -gt 0 ] || fail "--url needs a value"; DOWNLOAD_URL="$1" ;;
    -h|--help) usage; exit 0 ;;
    *) fail "unknown option: $1 (try --help)" ;;
  esac
  shift
done

[ "$(uname -s)" = "Darwin" ] || fail "this installs a macOS app; this machine is $(uname -s)."

quit_running_app() {
  if pgrep -x "$APP_NAME" >/dev/null 2>&1; then
    osascript -e "tell application \"$APP_NAME\" to quit" >/dev/null 2>&1 || true
    for _ in 1 2 3 4 5; do pgrep -x "$APP_NAME" >/dev/null 2>&1 || break; sleep 1; done
    pkill -x "$APP_NAME" 2>/dev/null || true
  fi
}

# Finder builds the Share menu from a cache, so a new or removed extension only
# shows up after it restarts. Say so rather than surprising anyone.
refresh_finder() {
  note "restarting Finder so the Share menu picks up the change (your windows come back)"
  killall Finder 2>/dev/null || true
}

# ───────────────────────────────────────────────────────────── uninstall ──
if [ "$MODE" = uninstall ]; then
  step "Uninstalling $APP_NAME"
  quit_running_app
  pluginkit -e ignore -i "$EXTENSION_ID" 2>/dev/null || true
  removed=0
  for root in /Applications "$HOME/Applications"; do
    if [ -d "$root/$APP_NAME.app" ]; then
      # Unregister the extension explicitly: otherwise the plugin database keeps
      # listing it until it notices the bundle is gone, which can take a while.
      pluginkit -r "$root/$APP_NAME.app/Contents/PlugIns/ShareExtension.appex" 2>/dev/null || true
      "$LSREGISTER" -u "$root/$APP_NAME.app" 2>/dev/null || true
      rm -rf "$root/$APP_NAME.app" && note "removed $root/$APP_NAME.app" && removed=1
    fi
  done
  [ "$removed" -eq 1 ] || note "no installed copy found"
  if [ "$PURGE" -eq 1 ]; then
    rm -rf "$HOME/Library/Containers/$BUNDLE_ID" "$HOME/Library/Containers/$EXTENSION_ID"
    note "removed saved app data"
  fi
  refresh_finder
  printf '%sDone.%s\n' "$GREEN" "$RESET"
  exit 0
fi

# ─────────────────────────────────────────────────────────────── install ──
case "$DOWNLOAD_URL" in
  __GEMBA_*|"") fail "no download URL set.
       Edit DOWNLOAD_URL at the top of this script, run it with --url <url>,
       or set GEMBA_DOWNLOAD_URL." ;;
  https://*) ;;
  http://*) fail "refusing a plain-http download: the app would arrive unauthenticated. Use https." ;;
  *) fail "DOWNLOAD_URL must be an https:// URL (got: $DOWNLOAD_URL)" ;;
esac
case "$EXPECTED_SHA256" in __GEMBA_*) EXPECTED_SHA256="" ;; esac

MACOS_MAJOR="$(sw_vers -productVersion | cut -d. -f1)"
[ "$MACOS_MAJOR" -ge "$MIN_MACOS_MAJOR" ] || fail "$APP_NAME needs macOS $MIN_MACOS_MAJOR or later (this Mac runs $(sw_vers -productVersion))."

WORK="$(mktemp -d -t gemba-install)"
MOUNT=""
cleanup() {
  if [ -n "$MOUNT" ]; then hdiutil detach "$MOUNT" -quiet 2>/dev/null || true; fi
  rm -rf "$WORK"
}
trap cleanup EXIT

FILE_NAME="$(basename "${DOWNLOAD_URL%%\?*}")"
case "$FILE_NAME" in *.zip|*.dmg) ;; *) fail "the download must be a .zip or .dmg (got: $FILE_NAME)";; esac
ARCHIVE="$WORK/$FILE_NAME"

step "Downloading $FILE_NAME"
note "$DOWNLOAD_URL"
curl -fL --retry 3 --retry-delay 2 --proto '=https' --tlsv1.2 -o "$ARCHIVE" --progress-bar "$DOWNLOAD_URL" \
  || fail "download failed."

step "Checking the download"
ACTUAL_SHA256="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"
if [ -n "$EXPECTED_SHA256" ]; then
  [ "$ACTUAL_SHA256" = "$EXPECTED_SHA256" ] || fail "checksum mismatch — refusing to install.
       expected $EXPECTED_SHA256
       got      $ACTUAL_SHA256"
  note "SHA-256 matches the pinned value"
elif curl -fsL --proto '=https' -o "$WORK/expected.sha256" "$DOWNLOAD_URL.sha256" 2>/dev/null; then
  PUBLISHED="$(awk '{print $1}' "$WORK/expected.sha256" | head -1)"
  [ "$ACTUAL_SHA256" = "$PUBLISHED" ] || fail "checksum mismatch against $FILE_NAME.sha256 — refusing to install."
  note "SHA-256 matches $FILE_NAME.sha256"
else
  printf '    %swarning:%s no checksum to verify against (no pinned value, no %s.sha256).\n' "$RED" "$RESET" "$FILE_NAME"
fi

step "Unpacking"
case "$ARCHIVE" in
  *.zip)
    ditto -x -k "$ARCHIVE" "$WORK/unpacked" || fail "could not extract the zip." ;;
  *.dmg)
    MOUNT="$WORK/mount"
    mkdir -p "$MOUNT"
    hdiutil attach "$ARCHIVE" -nobrowse -readonly -noautoopen -mountpoint "$MOUNT" -quiet \
      || fail "could not open the disk image."
    mkdir -p "$WORK/unpacked"
    ditto "$MOUNT/$APP_NAME.app" "$WORK/unpacked/$APP_NAME.app" || fail "the disk image has no $APP_NAME.app."
    hdiutil detach "$MOUNT" -quiet || true
    MOUNT="" ;;
esac
NEW_APP="$WORK/unpacked/$APP_NAME.app"
[ -d "$NEW_APP" ] || fail "the download does not contain $APP_NAME.app."

# Make sure this is the app we expect before it goes anywhere near /Applications.
GOT_ID="$(defaults read "$NEW_APP/Contents/Info" CFBundleIdentifier 2>/dev/null || true)"
[ "$GOT_ID" = "$BUNDLE_ID" ] || fail "unexpected app in the download (bundle id: ${GOT_ID:-none})."
codesign --verify --deep --strict "$NEW_APP" 2>/dev/null || fail "the app's code signature does not verify — refusing to install."
ARCHS="$(lipo -archs "$NEW_APP/Contents/MacOS/$APP_NAME" 2>/dev/null || true)"
case " $ARCHS " in *" $(uname -m) "*) ;; *) fail "this build runs on: $ARCHS — not on this Mac ($(uname -m))." ;; esac
VERSION="$(defaults read "$NEW_APP/Contents/Info" CFBundleShortVersionString 2>/dev/null || echo "?")"
# Who signed it, and whether Gatekeeper accepts it outright (a Developer ID
# signature plus a stapled notarization ticket). An older, ad-hoc signed build
# still installs — that is the owner's own choice, made by running this script.
SIGNATURE="$(codesign -dvv "$NEW_APP" 2>&1 || true)"
case "$SIGNATURE" in
  *"Authority=Developer ID Application"*) SIGNED_BY="Developer ID" ;;
  *) SIGNED_BY="ad-hoc" ;;
esac
if spctl --assess --type execute "$NEW_APP" >/dev/null 2>&1; then
  note "$APP_NAME $VERSION · $ARCHS · $SIGNED_BY, notarized — Gatekeeper accepts it"
else
  note "$APP_NAME $VERSION · $ARCHS · $SIGNED_BY, not notarized"
fi

step "Installing into $DEST_ROOT"
if [ ! -w "$DEST_ROOT" ] && [ "$DEST_ROOT" = /Applications ]; then
  DEST_ROOT="$HOME/Applications"
  note "/Applications is not writable for this account — using ~/Applications instead"
fi
mkdir -p "$DEST_ROOT"
quit_running_app
# Stage beside the destination, then swap, so an interrupted install never
# leaves a half-copied app where the old one was.
STAGED="$DEST_ROOT/.$APP_NAME.installing.app"
rm -rf "$STAGED"
ditto "$NEW_APP" "$STAGED"
# A download made by curl carries no quarantine flag, but clear it in case the
# archive was fetched another way first — which also spares an un-notarized
# build the "unidentified developer" prompt on first launch.
xattr -dr com.apple.quarantine "$STAGED" 2>/dev/null || true
rm -rf "$DEST_ROOT/$APP_NAME.app"
mv "$STAGED" "$DEST_ROOT/$APP_NAME.app"
note "$DEST_ROOT/$APP_NAME.app"

step "Registering the Share Extension"
"$LSREGISTER" -f -R -trusted "$DEST_ROOT/$APP_NAME.app"
open "$DEST_ROOT/$APP_NAME.app"
sleep 3
pluginkit -e use -i "$EXTENSION_ID" 2>/dev/null || true
refresh_finder

printf '\n%s%s %s is installed.%s\n' "$GREEN" "$APP_NAME" "$VERSION" "$RESET"
echo "Share menu: right-click any file or folder in Finder ▸ Share ▸ $APP_NAME"
echo "Uninstall:  curl -fsSL <this script's URL> | bash -s -- --uninstall"
