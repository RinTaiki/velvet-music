#!/bin/bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This build needs macOS/Xcode. On Windows, use the manual GitHub workflow."
  exit 1
fi

export VELVET_WIDGETS=0
export CI=1
export EXPO_NO_TELEMETRY=1

npx expo prebuild --platform ios --no-install
pod install --project-directory=ios

xcodebuild \
  -workspace ios/Velvet.xcworkspace \
  -scheme Velvet \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -archivePath build/Velvet.xcarchive \
  -derivedDataPath build/DerivedData \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY='' \
  DEVELOPMENT_TEAM='' \
  archive

APP_PATH="$PWD/build/Velvet.xcarchive/Products/Applications/Velvet.app"
if [[ ! -d "$APP_PATH" ]]; then
  echo "The iPhone app was not produced. Check the Xcode build log."
  exit 1
fi
if [[ -d "$APP_PATH/PlugIns" ]] && find "$APP_PATH/PlugIns" -name '*.appex' -print -quit | grep -q .; then
  echo "Unexpected app extension: the free build must not contain widgets."
  exit 1
fi
/usr/libexec/PlistBuddy -c 'Print :UIBackgroundModes' "$APP_PATH/Info.plist"

mkdir -p build/package/Payload
ditto "$APP_PATH" build/package/Payload/Velvet.app
(
  cd build/package
  /usr/bin/zip -qry ../Velvet-unsigned.ipa Payload
)
shasum -a 256 build/Velvet-unsigned.ipa > build/Velvet-unsigned.ipa.sha256
echo "Created build/Velvet-unsigned.ipa. Sign/install using AltStore Classic on your own computer."
