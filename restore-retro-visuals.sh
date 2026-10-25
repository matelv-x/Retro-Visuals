#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/pi/sg1_v4}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$APP_DIR" ]; then
  echo "SG1 app folder not found: $APP_DIR" >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  exec sudo APP_DIR="$APP_DIR" bash "$0"
fi

if [ "${STARGATE_ADDON_NO_RESTART:-0}" != "1" ]; then
  systemctl stop stargate.service || true
fi
python3 "$SCRIPT_DIR/patch_retro_visuals.py" restore "$APP_DIR" "$SCRIPT_DIR/files"
if [ "${STARGATE_ADDON_NO_RESTART:-0}" != "1" ]; then
  systemctl start stargate.service || true
else
  echo "Stargate restart deferred by add-on manager."
fi

echo "=== RETRO VISUALS RESTORE COMPLETE ==="

