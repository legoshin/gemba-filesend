#!/bin/bash
# Builds, signs, notarizes and staples a distributable DMG of Gemba Filesend.
#
#   ./scripts/package-dmg.sh              archive, sign, notarize, staple, verify
#   ./scripts/package-dmg.sh --no-notarize   stop after signing (no Apple round trip)
#
# Signing identity and Team ID are read from the keychain, not hardcoded: this
# finds the "Developer ID Application" certificate and takes the Team ID from
# the parenthesised suffix of its common name. Nothing to edit when the
# certificate is installed on a new machine.
#
# Notarization credentials — either form works, checked in this order:
#
#   1. App Store Connect API key (preferred; no password, works in CI)
#        export GEMBA_NOTARY_KEY=~/private_keys/AuthKey_XXXXXXXXXX.p8
#        export GEMBA_NOTARY_KEY_ID=XXXXXXXXXX
#        export GEMBA_NOTARY_ISSUER=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
#
#   2. A stored notarytool keychain profile
#        xcrun notarytool store-credentials gemba-notary \
#          --apple-id you@example.com --team-id ABCDE12345 --password <app-specific-password>
#        export GEMBA_NOTARY_PROFILE=gemba-notary
#
# Without either, the script still produces a signed DMG and tells you what to
# set — a signed-but-unnotarized build runs on your own machines, but Gatekeeper
# will block it on anyone else's.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
MACOS_DIR="$(cd "$HERE/.." && pwd)"
BUILD_DIR="$MACOS_DIR/.build-dist"
ARCHIVE="$BUILD_DIR/GembaFilesend.xcarchive"
EXPORT_DIR="$BUILD_DIR/export"
APP_NAME="Gemba Filesend"
NOTARIZE=1
TMPLOG="$(mktemp -t gemba-package)"
trap 'rm -f "$TMPLOG"' EXIT

for argument in "$@"; do
  case "$argument" in
    --no-notarize) NOTARIZE=0 ;;
    -h|--help) sed -n '2,32p' "$0"; exit 0 ;;
    *) echo "unknown option: $argument" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
fail() { printf '\033[31merror: %s\033[0m\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------- identity
step "Finding the Developer ID certificate"
IDENTITY_LINE="$(security find-identity -v -p codesigning 2>/dev/null | grep "Developer ID Application" | head -1 || true)"
if [ -z "$IDENTITY_LINE" ]; then
  cat >&2 <<'MESSAGE'
error: no "Developer ID Application" certificate in the keychain.

  Having an Apple Developer account is not enough — the certificate has to be
  on this Mac. Either:

    - Xcode ▸ Settings ▸ Accounts ▸ (your team) ▸ Manage Certificates ▸
      + ▸ Developer ID Application, or
    - export it as a .p12 from the Mac that has it and double-click to import.

  Then run this script again. `security find-identity -v -p codesigning`
  should list it.
MESSAGE
  exit 1
fi

IDENTITY_HASH="$(echo "$IDENTITY_LINE" | awk '{print $2}')"
IDENTITY_NAME="$(echo "$IDENTITY_LINE" | sed -n 's/.*"\(.*\)".*/\1/p')"
TEAM_ID="$(echo "$IDENTITY_NAME" | sed -n 's/.*(\([A-Z0-9]\{10\}\))$/\1/p')"
[ -n "$TEAM_ID" ] || fail "could not read a Team ID out of: $IDENTITY_NAME"
echo "  $IDENTITY_NAME"
echo "  team $TEAM_ID"

# ------------------------------------------------------------------ inputs
step "Checking the crypto interop tests still pass"
if ! (cd "$MACOS_DIR/GembaKit" && swift test > "$TMPLOG" 2>&1); then
  tail -20 "$TMPLOG" >&2
  fail "the GembaKit tests do not pass — not packaging a build whose crypto contract is unverified"
fi
grep -E "Executed [0-9]+ tests" "$TMPLOG" | tail -1 | sed 's/^/  /'

if [ ! -f "$MACOS_DIR/GembaFilesend/AppIcon.icns" ]; then
  step "Building the app icon"
  "$HERE/make-icon.sh"
fi

# ----------------------------------------------------------------- archive
step "Archiving (Release, Developer ID)"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
xcodebuild archive \
  -project "$MACOS_DIR/GembaFilesend.xcodeproj" \
  -scheme GembaFilesend \
  -configuration Release \
  -archivePath "$ARCHIVE" \
  CODE_SIGN_IDENTITY="$IDENTITY_HASH" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CODE_SIGN_STYLE=Manual \
  OTHER_CODE_SIGN_FLAGS="--timestamp" \
  | grep -E "error:|warning: (unused|deprecated)|ARCHIVE " || true
[ -d "$ARCHIVE" ] || fail "archive failed"

step "Exporting a Developer ID build"
cat > "$BUILD_DIR/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>developer-id</string>
    <key>teamID</key>
    <string>$TEAM_ID</string>
    <key>signingStyle</key>
    <string>manual</string>
    <key>signingCertificate</key>
    <string>Developer ID Application</string>
    <key>destination</key>
    <string>export</string>
</dict>
</plist>
PLIST

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$BUILD_DIR/ExportOptions.plist" \
  | grep -E "error:|EXPORT " || true

APP="$EXPORT_DIR/$APP_NAME.app"
[ -d "$APP" ] || fail "export failed — no $APP_NAME.app in $EXPORT_DIR"

# ------------------------------------------------------------ verify signing
step "Verifying the signature"
codesign --verify --deep --strict --verbose=2 "$APP" > "$TMPLOG" 2>&1 \
  || { sed 's/^/  /' "$TMPLOG" >&2; fail "the signature does not verify"; }

# The extension is signed as part of the app, but check it on its own: a broken
# nested signature shows up only as the Share menu silently omitting the entry.
codesign --verify --strict --verbose=2 "$APP/Contents/PlugIns/ShareExtension.appex" > "$TMPLOG" 2>&1 \
  || { sed 's/^/  /' "$TMPLOG" >&2; fail "the Share Extension signature does not verify"; }

codesign -dv --verbose=4 "$APP" > "$TMPLOG" 2>&1 || true
grep -E "Authority|TeamIdentifier|flags=|Timestamp" "$TMPLOG" | sed 's/^/  /' || true

# Two things notarization rejects outright, caught here rather than after a
# round trip to Apple. Both are written as `if`, not `cmd && fail`: under
# `set -e` a non-matching grep in an && chain would abort the script on the
# path where everything is fine.
if ! grep -q "flags=.*runtime" "$TMPLOG"; then
  fail "the hardened runtime is not enabled — notarization would be rejected"
fi
if codesign -d --entitlements - --xml "$APP" 2>/dev/null | grep -q "get-task-allow"; then
  fail "get-task-allow is present (a Debug artifact) — notarization would be rejected"
fi
echo "  hardened runtime on, no debug entitlement"

# The signature must carry a secure timestamp, or notarization fails later.
if ! grep -qi "Timestamp=" "$TMPLOG"; then
  echo "  warning: no secure timestamp on the signature — notarization may be rejected" >&2
fi

# ---------------------------------------------------------------------- dmg
step "Building the disk image"
VERSION="$(defaults read "$APP/Contents/Info" CFBundleShortVersionString 2>/dev/null || echo 1.0)"
DMG="$BUILD_DIR/GembaFilesend-$VERSION.dmg"
STAGE="$BUILD_DIR/dmg"
rm -rf "$STAGE"; mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname "$APP_NAME" -srcfolder "$STAGE" -ov -format UDZO "$DMG" | sed 's/^/  /'
codesign --sign "$IDENTITY_HASH" --timestamp "$DMG"

# --------------------------------------------------------------- notarize
if [ "$NOTARIZE" -eq 0 ]; then
  step "Skipping notarization (--no-notarize)"
  echo "  signed, un-notarized: $DMG"
  echo "  Gatekeeper will block this on machines other than your own."
  exit 0
fi

NOTARY_ARGS=()
if [ -n "${GEMBA_NOTARY_KEY:-}" ] && [ -n "${GEMBA_NOTARY_KEY_ID:-}" ] && [ -n "${GEMBA_NOTARY_ISSUER:-}" ]; then
  echo "  using the App Store Connect API key"
  NOTARY_ARGS=(--key "$GEMBA_NOTARY_KEY" --key-id "$GEMBA_NOTARY_KEY_ID" --issuer "$GEMBA_NOTARY_ISSUER")
elif [ -n "${GEMBA_NOTARY_PROFILE:-}" ]; then
  echo "  using the notarytool keychain profile '$GEMBA_NOTARY_PROFILE'"
  NOTARY_ARGS=(--keychain-profile "$GEMBA_NOTARY_PROFILE")
else
  step "No notarization credentials — stopping with a signed DMG"
  cat <<MESSAGE
  $DMG is signed but not notarized, so it runs on your machines only.

  To notarize, set either the API key trio or a keychain profile (see the
  comment at the top of this script), then rerun. Nothing else changes.
MESSAGE
  exit 0
fi

step "Notarizing (this waits for Apple)"
xcrun notarytool submit "$DMG" "${NOTARY_ARGS[@]}" --wait 2>&1 | sed 's/^/  /'

step "Stapling"
xcrun stapler staple "$DMG" | sed 's/^/  /'
xcrun stapler validate "$DMG" | sed 's/^/  /'

step "Gatekeeper check"
spctl -a -t open --context context:primary-signature -vvv "$DMG" 2>&1 | sed 's/^/  /' || true

printf '\n\033[32mReady: %s\033[0m\n' "$DMG"
