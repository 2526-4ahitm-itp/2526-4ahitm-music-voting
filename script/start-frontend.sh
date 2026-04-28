#!/usr/bin/env sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/musicvoting/frontend"

cd "$FRONTEND_DIR"
echo "Starting frontend (Angular)..."
exec npm start
