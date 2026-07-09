#!/usr/bin/env bash
# Empaqueta el motor a un binario único y lo coloca como sidecar de Tauri.
# Requiere: venv en apps/engine/.venv con pyinstaller instalado, y rustc en PATH
# (para resolver el target triple que Tauri espera en el nombre del binario).
set -euo pipefail
cd "$(dirname "$0")"

TRIPLE=$(rustc -vV | awk '/^host:/ { print $2 }')
if [ -z "$TRIPLE" ]; then
  echo "No se pudo resolver el target triple (¿rustc en PATH?)" >&2
  exit 1
fi

.venv/bin/pyinstaller --onefile --name ultrathing-engine \
  --collect-all uvicorn \
  --collect-all fastapi \
  --collect-all yt_dlp \
  --collect-all supabase \
  --collect-submodules app \
  app/__main__.py

DEST="../desktop/src-tauri/binaries"
mkdir -p "$DEST"
EXT=""
[ -f "dist/ultrathing-engine.exe" ] && EXT=".exe"
cp "dist/ultrathing-engine${EXT}" "$DEST/ultrathing-engine-${TRIPLE}${EXT}"
echo "Sidecar listo en $DEST/ultrathing-engine-${TRIPLE}${EXT}"
