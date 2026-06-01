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

systemctl stop stargate.service || true
python3 "$SCRIPT_DIR/patch_retro_visuals.py" restore "$APP_DIR" "$SCRIPT_DIR/files"
systemctl start stargate.service || true

echo "=== RETRO VISUALS RESTORE COMPLETE ==="

