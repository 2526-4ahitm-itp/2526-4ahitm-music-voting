#!/bin/bash

if [ "$EUID" -eq 0 ]; then
    echo "Error: Do not run this script with sudo!"
    echo "If you get permission errors, run: chmod +x *.sh"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Script directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"

# --- IP automatisch auslesen auskommentiert ---
# export IP_ADDRESS=$(ip -4 addr show enp62s0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}')

# if [ -z "$IP_ADDRESS" ]; then
#     echo "Error: Could not detect IP address from enp62s0"
#     echo "Available interfaces:"
#     ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1
#
#     export IP_ADDRESS=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)
#
#     if [ -z "$IP_ADDRESS" ]; then
#         echo "Error: No IP address found. Exiting."
#         exit 1
#     fi
#     echo "Using fallback IP: $IP_ADDRESS"
# else
#     echo "Using IP: $IP_ADDRESS"
# fi

# --- Auf localhost setzen ---
export IP_ADDRESS="127.0.0.1"
echo "Using IP: $IP_ADDRESS (localhost)"

echo "Making scripts executable..."
chmod +x "$PROJECT_ROOT/server/mvnw" 2>/dev/null || true
chmod +x "$PROJECT_ROOT/server/derby-start.sh" 2>/dev/null || true
chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true

echo "Updating environment files..."

sed -i "s|localhost:8080|$IP_ADDRESS:8080|g" "$PROJECT_ROOT/addMusic/src/environments/environment.ts"
sed -i "s|localhost:8080|$IP_ADDRESS:8080|g" "$PROJECT_ROOT/showMusic/src/environments/environment.ts"

sed -r -i "s|https?://([0-9]{1,3}\.){3}[0-9]{1,3}:8080|http://$IP_ADDRESS:8080|g" "$PROJECT_ROOT/addMusic/src/environments/environment.ts"
sed -r -i "s|wss?://([0-9]{1,3}\.){3}[0-9]{1,3}:8080|ws://$IP_ADDRESS:8080|g" "$PROJECT_ROOT/addMusic/src/environments/environment.ts"

sed -r -i "s|https?://([0-9]{1,3}\.){3}[0-9]{1,3}:8080|http://$IP_ADDRESS:8080|g" "$PROJECT_ROOT/showMusic/src/environments/environment.ts"
sed -r -i "s|wss?://([0-9]{1,3}\.){3}[0-9]{1,3}:8080|ws://$IP_ADDRESS:8080|g" "$PROJECT_ROOT/showMusic/src/environments/environment.ts"

sed -i "s/--host [0-9.]*\b/--host $IP_ADDRESS/" "$SCRIPT_DIR/showmusic.sh"
sed -i "s/--host [0-9.]*\b/--host $IP_ADDRESS/" "$SCRIPT_DIR/addmusic.sh"

export QUARKUS_HTTP_HOST=$IP_ADDRESS

echo "Starting services..."

if lsof -i :1527 > /dev/null 2>&1; then
    echo "1. Database already running on port 1527 - skipping"
else
    echo "1. Starting database..."
    kitty --hold --title "Database" --working-directory="$SCRIPT_DIR" sh -c "./database.sh; exec bash" &
    sleep 3
fi

echo "2. Starting Quarkus backend..."
kitty --hold --title "Quarkus" --working-directory="$SCRIPT_DIR" sh -c "./quarkus.sh; exec bash" &
sleep 3

echo "3. Starting showMusic frontend..."
kitty --hold --title "ShowMusic" --working-directory="$SCRIPT_DIR" sh -c "./showmusic.sh; exec bash" &
sleep 2

echo "4. Starting addMusic frontend..."
kitty --hold --title "AddMusic" --working-directory="$SCRIPT_DIR" sh -c "./addmusic.sh; exec bash" &

echo ""
echo "All services launched!"
echo "Access at:"
echo "  - showMusic: http://$IP_ADDRESS:8081"
echo "  - addMusic:  http://$IP_ADDRESS:8082"
