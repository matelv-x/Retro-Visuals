#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/pi/sg1_v4}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$APP_DIR/web/retro" ]; then
  echo "Retro folder not found: $APP_DIR/web/retro" >&2
  echo "Install Retro before installing Retro Visuals." >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  exec sudo APP_DIR="$APP_DIR" bash "$0"
fi

PYTHON_BIN="$APP_DIR/../venv_v4/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN="$(command -v python3)"
fi

if ! "$PYTHON_BIN" - <<'PY' >/dev/null 2>&1
from PIL import Image
PY
then
  echo "Installing Pillow for automatic background resizing..."
  if ! "$PYTHON_BIN" -m pip install Pillow; then
    echo "Warning: Pillow could not be installed. Custom background upload will still work,"
    echo "but automatic resolution generation will be skipped."
  fi
fi

python3 "$SCRIPT_DIR/patch_retro_visuals.py" install "$APP_DIR" "$SCRIPT_DIR/files"

if command -v systemctl >/dev/null 2>&1; then
  systemctl restart stargate.service || true
fi

echo "=== RETRO VISUALS INSTALL COMPLETE ==="
echo "Settings: /retro/visual_settings.html"
