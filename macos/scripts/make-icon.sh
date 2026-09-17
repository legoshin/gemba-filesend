#!/bin/bash
# Builds GembaFilesend/AppIcon.icns from the brand mark.
#
# Source: design-system/assets/gemba-mark-512.png (512x512). macOS wants a
# 1024x1024 top size, so that one slot is upscaled — replace the source with a
# 1024px (or vector) export of the mark and rerun to get a sharper icon.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
SOURCE="$REPO/design-system/assets/gemba-mark-512.png"
OUT="$HERE/../GembaFilesend/AppIcon.icns"
WORK="$(mktemp -d)/AppIcon.iconset"

[ -f "$SOURCE" ] || { echo "missing brand mark: $SOURCE" >&2; exit 1; }
mkdir -p "$WORK"

for spec in "16 icon_16x16" "32 icon_16x16@2x" "32 icon_32x32" "64 icon_32x32@2x" \
            "128 icon_128x128" "256 icon_128x128@2x" "256 icon_256x256" \
            "512 icon_256x256@2x" "512 icon_512x512" "1024 icon_512x512@2x"; do
  size="${spec% *}"; name="${spec#* }"
  sips -s format png -z "$size" "$size" "$SOURCE" --out "$WORK/$name.png" >/dev/null
done

iconutil -c icns "$WORK" -o "$OUT"
rm -rf "$(dirname "$WORK")"
echo "wrote $OUT"
