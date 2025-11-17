#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT/server" || {
    echo "Error: Cannot find server directory"
    exit 1
}

echo "Starting Quarkus from: $(pwd)"
echo "Host IP: ${QUARKUS_HTTP_HOST:-localhost}"

chmod +x ./mvnw 2>/dev/null || true

if [ -n "$QUARKUS_HTTP_HOST" ]; then
    echo "Binding to: $QUARKUS_HTTP_HOST:8080"
    ./mvnw clean compile quarkus:dev -Dquarkus.http.host="$QUARKUS_HTTP_HOST"
else
    echo "No QUARKUS_HTTP_HOST set, using default (localhost)"
    ./mvnw clean compile quarkus:dev
fi