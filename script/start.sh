#!/bin/bash

# Zum Root-Verzeichnis navigieren
cd "$(dirname "$0")/.." || exit

echo "--- Starte Music-Voting App ---"

# 1. Backend starten (Quarkus Dev Mode)
echo "Starte Quarkus Backend..."
cd musicvoting/backend || exit
./mvnw quarkus:dev &
BACKEND_PID=$!

# 2. Frontend starten (Angular)
echo "Starte Angular Frontend..."
cd ../frontend || exit
# npm install muss nicht jedes Mal laufen,
# aber 'npm start' triggert 'ng serve'
npm start &
FRONTEND_PID=$!

echo "--- App läuft! ---"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Warten auf Logs
wait