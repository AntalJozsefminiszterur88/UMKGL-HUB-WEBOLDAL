#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo
echo "=== UMGKL HUB Frissites Indul ==="
echo

if [[ -S "${HOME}/.docker/desktop/docker.sock" ]]; then
  export DOCKER_HOST="unix://${HOME}/.docker/desktop/docker.sock"
fi

cd "${PROJECT_DIR}"

echo "[1/3] A legfrissebb kod letoltese a Git repobol..."
git pull

echo
echo "[2/3] A regi kontenerek leallitasa..."
docker compose down

echo
echo "[3/3] Az uj kontenerek epitese es inditasa..."
docker compose up -d --build

echo
echo "=== Frissites Befejezve! ==="
echo
