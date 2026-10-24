#!/bin/sh
# Builds ../flutter_compare/figma27.dart as a Flutter web app (a throwaway project in $WORK) into $OUT.
#   OUT=<dir> WORK=<dir> tools/figma27_flutter.sh
set -e
HERE="$(cd "$(dirname "$0")/.." && pwd)"
KIT="$(cd "$HERE/../../flutter" && pwd)"
FLUTTER="${FLUTTER:-/Users/mohamad/dev/flutter/bin/flutter}"
WORK="${WORK:?set WORK}"
OUT="${OUT:?set OUT}"
if [ ! -d "$WORK/lgfigma" ]; then
  (cd "$WORK" && "$FLUTTER" create --platforms web --org org.feeef lgfigma >/dev/null)
fi
cp "$HERE/flutter_compare/figma27.dart" "$WORK/lgfigma/lib/main.dart"
cat > "$WORK/lgfigma/pubspec.yaml" <<YAML
name: lgfigma
publish_to: none
environment:
  sdk: ^3.9.0
dependencies:
  flutter:
    sdk: flutter
  feeef_ui:
    path: $KIT
YAML
rm -rf "$WORK/lgfigma/test"
(cd "$WORK/lgfigma" && "$FLUTTER" pub get >/dev/null && "$FLUTTER" build web --release --output "$OUT" 2>&1 | tail -1)
echo "$OUT"
