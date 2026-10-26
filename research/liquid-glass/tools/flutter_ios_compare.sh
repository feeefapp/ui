#!/bin/sh
# Builds ../flutter_compare as an iOS simulator app (a throwaway Flutter project in $WORK, default
# a temp dir), installs it on the booted simulator and captures every reference scene into $OUT.
#   OUT=<dir> [WORK=<dir>] tools/flutter_ios_compare.sh
set -e
HERE="$(cd "$(dirname "$0")/.." && pwd)"
KIT="$(cd "$HERE/../../flutter" && pwd)"
FLUTTER="${FLUTTER:-/Users/mohamad/dev/flutter/bin/flutter}"
WORK="${WORK:-$(mktemp -d)}"
OUT="${OUT:?set OUT}"
if [ ! -d "$WORK/lgcompare" ]; then
  (cd "$WORK" && "$FLUTTER" create --platforms ios --org org.feeef lgcompare >/dev/null)
fi
cp "$HERE/flutter_compare/main.dart" "$HERE/flutter_compare/layouts.dart" "$WORK/lgcompare/lib/"
cat > "$WORK/lgcompare/pubspec.yaml" <<YAML
name: lgcompare
publish_to: none
environment:
  sdk: ^3.9.0
dependencies:
  flutter:
    sdk: flutter
  feeef_ui:
    path: $KIT
YAML
rm -rf "$WORK/lgcompare/test"
(cd "$WORK/lgcompare" && "$FLUTTER" pub get >/dev/null && "$FLUTTER" build ios --simulator --debug --no-codesign >/dev/null)
APP="$WORK/lgcompare/build/ios/iphonesimulator/Runner.app"
xcrun simctl terminate booted org.feeef.lgcompare >/dev/null 2>&1 || true
xcrun simctl install booted "$APP"
xcrun simctl launch booted org.feeef.lgcompare >/dev/null
sleep 6
TMP="$(xcrun simctl get_app_container booted org.feeef.lgcompare data)/tmp"
mkdir -p "$OUT"
for theme in light dark; do
  for bg in photo stripes12 flat-808080 flat-ffffff flat-1a1a1a; do
    q="bg=$bg&theme=$theme&renderer=${RENDERER:-canvas}"
    rm -f "$TMP/shown.txt"
    printf '%s' "$q" > "$TMP/scene.txt"
    i=0
    until [ "$(cat "$TMP/shown.txt" 2>/dev/null)" = "$q" ] || [ $i -gt 200 ]; do sleep 0.1; i=$((i+1)); done
    xcrun simctl io booted screenshot --type=png "$OUT/${RENDERER:-canvas}-$theme-$bg.png" >/dev/null 2>&1
  done
done
echo "$OUT"
