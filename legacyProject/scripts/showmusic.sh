#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Script dir: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"
echo "Target: $PROJECT_ROOT/showMusic"

if [ ! -d "$PROJECT_ROOT/showMusic" ]; then
    echo "Error: Cannot find showMusic directory at $PROJECT_ROOT/showMusic"
    echo "Contents of PROJECT_ROOT:"
    ls -la "$PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT/showMusic" || exit 1

if [ ! -f "angular.json" ]; then
    echo "Error: Not in an Angular workspace (no angular.json found)"
    echo "Current directory: $(pwd)"
    ls -la
    exit 1
fi

echo "Starting showMusic from: $(pwd)"
echo "Using IP: 127.0.0.1"

# Immer auf localhost laufen lassen
npx ng serve --port 8081 --host 127.0.0.1 --disable-host-check -o
