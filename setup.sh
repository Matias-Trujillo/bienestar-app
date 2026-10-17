#!/usr/bin/env bash
# Instala las dependencias locales para que el editor no muestre errores falsos.
# Uso (desde la carpeta bienestar-app):  bash setup.sh
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

for cmd in node npm python3; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Falta '$cmd'. Ver README, seccion Requisitos."; exit 1; }
done

echo "== Frontend: npm install =="
(cd "$ROOT/frontend" && npm install)

echo "== Backend: entorno virtual + pip install =="
cd "$ROOT/backend"
[ -d venv ] || python3 -m venv venv
./venv/bin/python -m pip install --upgrade pip
./venv/bin/python -m pip install -r requirements.txt

echo "Listo. Recarga el editor. Para levantar el proyecto: docker compose up --build"
