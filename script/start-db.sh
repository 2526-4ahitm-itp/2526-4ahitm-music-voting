#!/usr/bin/env sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/musicvoting/docker-compose.yaml"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "docker-compose.yaml not found at $COMPOSE_FILE" >&2
  exit 1
fi

echo "Starting database with Docker Compose..."
docker compose -f "$COMPOSE_FILE" up -d
