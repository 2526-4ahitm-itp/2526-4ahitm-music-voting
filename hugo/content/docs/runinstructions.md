---
title: How To Run
description: Die App ist bereits deployed – und so startet man sie lokal
tags: [ Developer ]
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
---

## Live-Deployment (Kubernetes)

Die Anwendung ist **bereits deployed** und unter folgender URL erreichbar:

> **https://it220241.cloud.htl-leonding.ac.at**

Man muss also nichts lokal starten, um die App zu benutzen – einfach die URL im Browser öffnen.

> [!NOTE]
> Das Live-Deployment ist die einfachste Art, die App auszuprobieren.
> Die folgenden Schritte sind nur für die **lokale Entwicklung** nötig.

---

## Lokal starten

Es gibt zwei Wege:

- **Variante A – Fertige Images aus GHCR (nur Docker):** am einfachsten, ohne Java/Node und ohne Bauen.
- **Variante B – Aus dem Quellcode bauen:** für die aktive Entwicklung am Backend/Frontend.

---

## Variante A: Fertige Images (Docker Compose)

Diese Variante zieht die vorgebauten Images aus GHCR
(`ghcr.io/2526-4ahitm-itp/music-voting-backend` und `…-frontend`) und startet
zusammen mit PostgreSQL die ganze Anwendung. Du brauchst dafür **nur Docker** –
kein Java, kein Node, kein `application.properties` editieren.

1. Stack starten:
   ```bash
   cd compose
   docker compose up -d
   ```
2. Öffnen:
   - Frontend: **http://localhost:4200**
   - Backend-API: **http://localhost:8080/api**

> [!NOTE]
> Sind die GHCR-Pakete privat, vorher einmalig anmelden:
> `docker login ghcr.io` (GitHub-Username + Personal Access Token mit `read:packages`).
> Mit `docker compose pull` holst du die jeweils neuesten `:latest`-Images.

> [!IMPORTANT]
> Für den **Spotify-Login** musst du dem Backend deine Zugangsdaten als Umgebungsvariablen
> mitgeben (die Compose-Datei setzt sie nicht). Lege dazu im Ordner `compose` eine Datei
> `docker-compose.override.yaml` an:
> ```yaml
> services:
>   backend:
>     environment:
>       - SPOTIFY_CLIENT_ID=deine_client_id
>       - SPOTIFY_CLIENT_SECRET=dein_client_secret
> ```
> Ohne diese Werte läuft die App, aber Anmeldung und Wiedergabe über Spotify funktionieren nicht.

> [!TIP]
> Vor dem Start kannst du die zusammengeführte Konfiguration prüfen – so siehst du,
> ob deine Spotify-Variablen wirklich beim `backend`-Service ankommen:
> ```bash
> docker compose config
> ```

---

## Variante B: Aus dem Quellcode bauen

### Voraussetzungen

1. **Docker** (für die PostgreSQL-Datenbank).
2. **Java 21** und **Node.js** (für Backend bzw. Frontend).
3. In `application.properties` die Spotify-Daten eintragen
   (`Client ID`, `Client Secret`, `Redirect URI`) – Datei:
   `musicvoting/backend/src/main/resources/application.properties`.

(Für die Daten muss ein Spotify Developer Konto angelegt werden:
https://developer.spotify.com/dashboard/applications – siehe *How To Develop*.)

Den **vollständigen** Block brauchst du nicht selbst zu schreiben: Nur die beiden Spotify-Zugangsdaten musst du eintragen, der Rest sind funktionierende Standardwerte für die lokale Entwicklung. Die optionalen Zeilen sind unten auskommentiert und mit „Nur wenn …“ markiert.

```properties
# === Pflicht: deine eigenen Spotify-Zugangsdaten ===
spotify.client.id=##Client ID hier eintragen
spotify.client.secret=##Client Secret hier eintragen

# === Standardwerte für lokale Entwicklung (so lassen) ===
app.public.host=127.0.0.1
app.public.port=8080
app.web.port=4200
spotify.redirect.uri=http://${app.public.host}:${app.public.port}/api/spotify/callback
spotify.web.redirect.uri=http://${app.public.host}:${app.web.port}/dashboard
quarkus.http.host=0.0.0.0
quarkus.http.port=${app.public.port}
quarkus.datasource.db-kind=postgresql
quarkus.datasource.username=musicvoting
quarkus.datasource.password=musicvoting
quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/musicvoting
quarkus.hibernate-orm.database.generation=none
musicvoting.join.base-url=http://localhost:4200/join

# === Automatisches Nachfüllen der Warteschlange (Auto-Refill) ===
# Markt (ISO-Land) für die "ähnlichen Songs" (Top-Tracks der gespielten Künstler),
# wenn keine Standard-Playlist gesetzt ist. Standard: AT.
spotify.market=AT
# Optionale Fallback-Playlist, falls weder eine Standard-Playlist noch ähnliche Songs
# etwas liefern. Leer lassen zum Deaktivieren. WICHTIG: Spotify sperrt für neue Apps
# den Zugriff auf seine EIGENEN Editorial-Playlists (IDs mit 37i9dQZEV...), die liefern
# dann 0 Tracks – hier am besten die ID einer ÖFFENTLICHEN, EIGENEN Playlist eintragen.
# (Selbst wenn diese leer ist, sorgt die eingebaute Spotify-Suche dafür, dass immer ein
# nächster Song gefunden wird.)
spotify.topcharts.playlist.id=

# Nur wenn du die iOS-App nutzt: Redirect-URI der App
#spotify.ios.redirect.uri=musicvotingapp://callback

# Nur wenn die Swift-App per Xcode auf einem echten iPhone läuft:
# Hotspot am Handy aktivieren und die AKTUELLE IP-Adresse des Handys als Host eintragen
# (überschreibt app.public.host oben). <HANDY-IP> durch die echte Adresse ersetzen,
# z. B. 172.20.10.2 beim iPhone-Hotspot – die genaue IP findest du in den Hotspot-Einstellungen.
#app.public.host=<HANDY-IP>
```

### Alles auf einmal starten

> [!IMPORTANT]
> **Docker muss laufen** – das Skript startet die PostgreSQL-Datenbank per Docker.
> Unter Docker Desktop also vorher die Docker-Engine starten.

1. Navigieren Sie zum Skript-Verzeichnis:
   ```bash
   cd script/
   ```

2. Die ganze Anwendung (DB, Backend, Frontend) starten:
   ```bash
   ./start.sh
   ```

### Einzeln starten

#### Datenbank (PostgreSQL via Docker)

Die DB heißt `musicvoting` (User/Passwort `musicvoting`, Port `5432`).
Das Schema wird beim ersten Start aus `musicvoting/backend/setup.sql` initialisiert.

1. Navigieren Sie zum MusicVoting-Verzeichnis:
    ```bash
    cd musicvoting
    ```
2. Starten Sie die Datenbank mit Docker:
    ```bash
    docker compose up -d
    ```

#### Backend

1. Navigieren Sie zum Backend-Verzeichnis:
   ```bash
   cd musicvoting/backend
   ```
2. Starten Sie das Backend mit dem Maven-Wrapper:
   ```bash
   ./mvnw quarkus:dev
   ```

#### Frontend

1. Navigieren Sie zum Frontend-Verzeichnis:
   ```bash
   cd musicvoting/frontend
   ```
2. Installieren Sie die Abhängigkeiten:
   ```bash
   npm install
   ```
3. Starten Sie das Frontend:
   ```bash
   npm start
   ```
