#!/bin/sh
# Builds LGLab.app for the iOS simulator with swiftc (no Xcode project needed) into build/.
set -e
cd "$(dirname "$0")"
SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)
ARCH=$(uname -m)
mkdir -p build/LGLab.app
xcrun --sdk iphonesimulator swiftc -O -parse-as-library -target "$ARCH-apple-ios26.0-simulator" -sdk "$SDK" \
  LGLab.swift -o build/LGLab.app/LGLab
cp Info.plist layouts.json build/LGLab.app/
codesign --force --sign - build/LGLab.app >/dev/null 2>&1
echo build/LGLab.app
