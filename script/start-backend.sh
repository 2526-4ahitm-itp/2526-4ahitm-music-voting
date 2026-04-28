#!/usr/bin/env sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/musicvoting/backend"

cd "$BACKEND_DIR"
echo "Starting backend (Quarkus dev mode)..."
exec ./mvnw quarkus:dev
