#!/usr/bin/env bash
# Flutter frame-timing bench: the docs' Dart examples in a small self-driving profile-mode macOS app
# (bench/flutter/lib/bench_main.dart).
#   bench/flutter.sh [--label baseline] [--reps 3] [--pages a,b] [--scenarios idle,scroll,…] [--out DIR]
# Writes <out>/flutter.json and refreshes <out>/summary.md. Default out: bench/out/<date>-<label>.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
label=run; reps=3; out=""; scenarios="idle,scroll,pointer,menu,drag,split"
pages="components/glass-container,components/actions-bar,components/segmented-control,components/toolbar,components/switch,guidelines/patterns"
while [ $# -gt 0 ]; do
  case "$1" in
    --label) label="$2"; shift 2;;
    --reps) reps="$2"; shift 2;;
    --out) out="$2"; shift 2;;
    --pages) pages="$2"; shift 2;;
    --scenarios) scenarios="$2"; shift 2;;
    *) echo "unknown option $1" >&2; exit 2;;
  esac
done
out="${out:-$here/out/$(date +%F)-$label}"
mkdir -p "$out"
out="$(cd "$out" && pwd)"
app="$here/flutter"

node "$app/tool/sync_examples.mjs" "$pages"
cd "$app"
# The macOS runner is generated on first use (gitignored): 1280×800 like the web bench, and no App
# Sandbox so the app can write its report.
if [ ! -d macos ]; then
  flutter create --platforms=macos --project-name feeef_ui_bench --org dev.feeef.bench . >/dev/null
  rm -rf test README.md .idea .metadata .gitignore analysis_options.yaml ./*.iml
  sed -i '' 's/self.setFrame(windowFrame, display: true)/self.setFrame(windowFrame, display: true)\
    self.setContentSize(NSSize(width: 1280, height: 800))/' macos/Runner/MainFlutterWindow.swift
  /usr/libexec/PlistBuddy -c 'Set :com.apple.security.app-sandbox false' macos/Runner/DebugProfile.entitlements
fi
flutter pub get >/dev/null

rm -f "$out/flutter.json"
flutter run --profile -d macos -t lib/bench_main.dart \
  --dart-define=BENCH_REPS="$reps" --dart-define=BENCH_LABEL="$label" \
  --dart-define=BENCH_SCENARIOS="$scenarios" --dart-define=BENCH_OUT="$out/flutter.json" </dev/null \
  | grep --line-buffered -E '\[flutter bench\]|rror|Exception' || true
[ -f "$out/flutter.json" ] || { echo "flutter bench produced no report" >&2; exit 1; }
node "$here/summarize.mjs" "$out"
