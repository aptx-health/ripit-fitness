#!/usr/bin/env bash
# Build Ripit for a connected iPhone and install it (work item 154).
# Run it yourself with the phone plugged in and unlocked: signing can ask for the Mac password,
# so agents must not run it unattended.
#
#   scripts/ios/install.sh                 # the first connected iPhone
#   scripts/ios/install.sh <device-id>     # a specific device (from `xcrun devicectl list devices`)
set -euo pipefail

cd "$(dirname "$0")/../.."

device="${1:-}"
if [ -z "$device" ]; then
  list="$(mktemp -t ripit-devices)"
  xcrun devicectl list devices --json-output "$list" >/dev/null
  device="$(python3 -c '
import json, sys
devices = json.load(open(sys.argv[1]))["result"]["devices"]
phones = [d for d in devices
          if d["hardwareProperties"].get("deviceType") == "iPhone"
          and d.get("connectionProperties", {}).get("pairingState") == "paired"]
print(phones[0]["hardwareProperties"]["udid"] if phones else "")
' "$list")"
  if [ -z "$device" ]; then
    echo "install: no paired iPhone found. Plug it in, unlock it, trust this Mac, then retry." >&2
    exit 1
  fi
fi
echo "install: device $device"

xcodegen generate --spec ios/project.yml --project ios
xcodebuild -project ios/Ripit.xcodeproj -scheme Ripit -configuration Debug \
  -destination "id=$device" -derivedDataPath ios/build -allowProvisioningUpdates -quiet build

app="ios/build/Build/Products/Debug-iphoneos/Ripit.app"
xcrun devicectl device install app --device "$device" "$app"
echo "install: done. If the phone says Untrusted Developer: Settings > General > VPN & Device Management > Trust."
