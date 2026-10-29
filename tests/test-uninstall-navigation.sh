#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$(mktemp -d "${TMPDIR:-/tmp}/retro-visuals-uninstall.XXXXXX")"
trap 'find "$TARGET" -depth -delete' EXIT

mkdir -p "$TARGET/web/retro/js" \
  "$TARGET/web/.stellar-archive-addon/managed" \
  "$TARGET/web/.stellar-archive-addon/originals"

cat > "$TARGET/web/retro/js/navigation.js" <<'JS'
import './retro_visuals.js';import { config } from './config.js';
<a ${isActive('/retro/visual_settings.html')}>Visuals</a>
<a href="/help.htm">Help</a>
JS
cp "$TARGET/web/retro/js/navigation.js" "$TARGET/web/.stellar-archive-addon/managed/retro-navigation.js"
cp "$TARGET/web/retro/js/navigation.js" "$TARGET/web/.stellar-archive-addon/originals/retro-navigation.js"

python3 "$ROOT/patch_retro_visuals.py" restore "$TARGET" "$ROOT/files"

if grep -R -n -E 'retro_visuals\.js|visual_settings\.html|>Visuals<' "$TARGET/web"; then
  echo "Retro Visuals navigation survived uninstall" >&2
  exit 1
fi
grep -q 'config.js' "$TARGET/web/retro/js/navigation.js"
grep -q 'help.htm' "$TARGET/web/retro/js/navigation.js"
echo "Retro Visuals navigation uninstall test: PASS"
