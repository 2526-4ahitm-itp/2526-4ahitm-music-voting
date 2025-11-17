#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT/server" || {
    echo "Error: Cannot find server directory"
    exit 1
}

echo "Starting Derby database from: $(pwd)"

chmod +x ./db-derby-10.15.2.0-bin/bin/startNetworkServer 2>/dev/null || true
chmod +x ./derby-start.sh 2>/dev/null || true

./derby-start.sh