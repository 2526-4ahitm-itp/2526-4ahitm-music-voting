#!/usr/bin/env sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$ROOT_DIR/script"

"$SCRIPT_DIR/start-db.sh"

"$SCRIPT_DIR/start-backend.sh" &
BACKEND_PID=$!

"$SCRIPT_DIR/start-frontend.sh" &
FRONTEND_PID=$!

echo "All services started."
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

wait
