#!/bin/sh
# Builds CtlLab.app (controls measurement app) for the iOS simulator with swiftc into build/.
set -e
cd "$(dirname "$0")"
SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)
ARCH=$(uname -m)
mkdir -p build/CtlLab.app
xcrun --sdk iphonesimulator swiftc -O -parse-as-library -target "$ARCH-apple-ios26.0-simulator" -sdk "$SDK" \
  CtlLab.swift -o build/CtlLab.app/CtlLab
cp Info.plist build/CtlLab.app/
codesign --force --sign - build/CtlLab.app >/dev/null 2>&1
echo build/CtlLab.app
