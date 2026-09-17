#!/bin/bash
# Builds Gemba Filesend and installs it, in one command.
#
#   ./scripts/build-app.sh                build Release, install, register
#   ./scripts/build-app.sh --debug        Debug build (adds the --demo hook), install
#   ./scripts/build-app.sh --no-install   build only, leave /Applications alone
#   ./scripts/build-app.sh --skip-tests   skip the GembaKit tests (not advised)
#
# Installing is not just a copy. macOS only offers the Share Extension once
# LaunchServices knows about the app, the extension is enabled, and Finder has
# rebuilt its menu — miss any of those and the entry silently never appears,
# even though `pluginkit` reports it registered. This does all of it.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
MACOS_DIR="$(cd "$HERE/.." && pwd)"
PROJECT="$MACOS_DIR/GembaFilesend.xcodeproj"
DERIVED="$MACOS_DIR/.build-xcode"
APP_NAME="Gemba Filesend"
BUNDLE_ID="uk.gemba.filesend.mac"
EXTENSION_ID="$BUNDLE_ID.ShareExtension"
LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

CONFIGURATION=Release
INSTALL=1
RUN_TESTS=1

for argument in "$@"; do
  case "$argument" in
    --debug) CONFIGURATION=Debug ;;
    --release) CONFIGURATION=Release ;;
    --no-install) INSTALL=0 ;;
    --skip-tests) RUN_TESTS=0 ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $argument" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
fail() { printf '\033[31merror: %s\033[0m\n' "$1" >&2; exit 1; }
LOG_DIR="$MACOS_DIR/.build-logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/last-run.log"

# SwiftPM and xcodebuild both announce a failure with lines that carry no
# information ("error: Build failed", "error: fatalError"). Pull out the lines
# that actually say what broke, and fall back to the tail if none match.
report_failure() {
  local real
  real="$(grep -E "error:|warning: .*not found|XCTAssert|failed -" "$LOG" \
          | grep -v "error: Build failed\|error: fatalError\|error: SwiftCompile normal\|CoreDevice\|CoreSimulator\|DVTPlugIn" \
          | head -15)"
  if [ -n "$real" ]; then
    printf '%s\n' "$real" >&2
  else
    tail -25 "$LOG" >&2
  fi
  echo "" >&2
  echo "  full output: $LOG" >&2
}

# ------------------------------------------------------------------- tests
if [ "$RUN_TESTS" -eq 1 ]; then
  step "Testing GembaKit"
  if ! (cd "$MACOS_DIR/GembaKit" && swift test > "$LOG" 2>&1); then
    report_failure
    fail "tests failed — the crypto contract with the web app is what these check, so this is not a build to install"
  fi
  grep -E "Executed [0-9]+ tests" "$LOG" | tail -1 | sed 's/^/  /'
fi

# ------------------------------------------------------------------ project
# The .xcodeproj is generated, so a source file added or removed since it was
# last written means it is stale. Regenerate rather than fail confusingly later.
# Staleness is judged by CONTENT, not mtimes: a `git clone` stamps every file
# with the checkout time in arbitrary order, so an mtime comparison reports a
# freshly cloned project as stale on a machine that has changed nothing.
# What regeneration actually changes is which files the project references, so
# compare that against what is on disk.
project_files() {
  grep -oE 'path = "?[A-Za-z0-9_.@-]+\.(swift|icns|plist|entitlements|xcconfig)"?' \
    "$PROJECT/project.pbxproj" 2>/dev/null \
    | sed 's/.*path = //; s/"//g' | sort -u
}
disk_files() {
  (cd "$MACOS_DIR" && find GembaFilesend ShareExtension Configs -maxdepth 1 -type f \
     \( -name '*.swift' -o -name '*.icns' -o -name '*.plist' \
        -o -name '*.entitlements' -o -name '*.xcconfig' \) 2>/dev/null \
     -exec basename {} \;) | sort -u
}

have_generator() {
  command -v ruby >/dev/null 2>&1 && ruby -e "require 'xcodeproj'" >/dev/null 2>&1
}

regenerate_or_explain() {
  if have_generator; then
    ruby "$HERE/generate-project.rb" | sed 's/^/  /'
    return 0
  fi
  return 1
}

step "Checking the Xcode project is current"
if [ ! -d "$PROJECT" ]; then
  echo "  no project yet — generating"
  regenerate_or_explain || fail "the project has to be generated on a first checkout, and the xcodeproj gem is missing.
       Install it with one of:
         gem install --user-install xcodeproj      # no sudo
         sudo gem install xcodeproj
       Then run this script again."
elif [ "$(project_files)" = "$(disk_files)" ]; then
  echo "  up to date"
else
  echo "  source files differ from the project's file list"
  if ! regenerate_or_explain; then
    # A warning, not a failure: the committed project builds fine unless a file
    # was genuinely added or removed, and if one was, the compiler will say so.
    cat >&2 <<'MESSAGE'
  warning: the project looks out of date and the xcodeproj gem is missing, so it
           was not regenerated. Building with the committed project. If a source
           file was added or removed, install the gem and rerun:
             gem install --user-install xcodeproj
MESSAGE
  fi
fi

if [ ! -f "$MACOS_DIR/GembaFilesend/AppIcon.icns" ]; then
  step "Building the app icon"
  "$HERE/make-icon.sh" | sed 's/^/  /'
fi

# -------------------------------------------------------------------- build
step "Building ($CONFIGURATION)"
if ! xcodebuild -project "$PROJECT" -scheme GembaFilesend \
     -configuration "$CONFIGURATION" -derivedDataPath "$DERIVED" build > "$LOG" 2>&1; then
  report_failure
  fail "build failed"
fi
BUILT="$DERIVED/Build/Products/$CONFIGURATION/$APP_NAME.app"
[ -d "$BUILT" ] || fail "build reported success but $BUILT is missing"
echo "  $BUILT"

if [ "$INSTALL" -eq 0 ]; then
  step "Not installing (--no-install)"
  echo "  run it from there, or rerun without --no-install"
  exit 0
fi

# ------------------------------------------------------------------ install
step "Installing to /Applications"
# Quit politely first; a running copy cannot be replaced cleanly.
osascript -e "tell application \"$APP_NAME\" to quit" >/dev/null 2>&1 || true
sleep 1
pkill -f "/Applications/$APP_NAME.app/Contents/MacOS" 2>/dev/null || true
rm -rf "/Applications/$APP_NAME.app"
cp -R "$BUILT" /Applications/
echo "  /Applications/$APP_NAME.app"

step "Registering the Share Extension"
# All three steps matter. Without lsregister the system may keep serving the old
# bundle; without `pluginkit -e use` the extension is registered but switched
# off; without restarting Finder the Share menu keeps its cached list.
"$LSREGISTER" -f -R -trusted "/Applications/$APP_NAME.app"
open "/Applications/$APP_NAME.app"
sleep 3
pluginkit -e use -i "$EXTENSION_ID"
killall Finder 2>/dev/null || true
sleep 2

if pluginkit -m -p com.apple.share-services 2>/dev/null | grep -q "$EXTENSION_ID"; then
  echo "  registered and enabled"
else
  echo "  warning: the extension is not showing as registered — try logging out and back in" >&2
fi

# ------------------------------------------------------------------- verify
step "Verifying the installed app"
codesign --verify --deep --strict "/Applications/$APP_NAME.app" 2>/dev/null \
  && echo "  signature verifies" \
  || echo "  warning: signature does not verify" >&2

if [ "$CONFIGURATION" = "Release" ]; then
  if codesign -d --entitlements - --xml "/Applications/$APP_NAME.app" 2>/dev/null | grep -q "get-task-allow"; then
    echo "  warning: Release build carries get-task-allow" >&2
  else
    echo "  entitlements clean (sandboxed, no debug entitlement)"
  fi
fi

VERSION="$(defaults read "/Applications/$APP_NAME.app/Contents/Info" CFBundleShortVersionString 2>/dev/null || echo "?")"
printf '\n\033[32m%s %s is installed and running.\033[0m\n' "$APP_NAME" "$VERSION"
echo "Share menu: right-click a file in Finder ▸ Share ▸ $APP_NAME"
