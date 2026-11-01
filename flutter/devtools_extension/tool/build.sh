#!/usr/bin/env bash
# Builds the feeef_ui DevTools panel into ../extension/devtools/build (committed: DevTools loads it
# from the package). Same as `dart run devtools_extensions build_and_copy`, but lighter for a git
# dependency: icons are tree-shaken and CanvasKit is left out, so it loads from Google's CDN
# (Flutter web's default) instead of shipping 36 MB of renderers in the repo.
set -euo pipefail
cd "$(dirname "$0")/.."
flutter build web --release --pwa-strategy=offline-first --no-wasm-dry-run
dest=../extension/devtools/build
rm -rf "$dest"
mkdir -p "$dest"
rsync -a --exclude canvaskit build/web/ "$dest/"
du -sh "$dest"
