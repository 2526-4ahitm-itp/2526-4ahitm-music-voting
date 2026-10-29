---
title: How To Run
description: Die App ist bereits deployed – und so startet man sie lokal
tags: [ Developer ]
showDate: true
date: 2026-06-23
lastmod: 2026-10-29
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

Es gibt drei Wege:

- **Variante A – Fertige Images aus GHCR (nur Docker):** am einfachsten, ohne Java/Node und ohne Bauen.
- **Variante B – Aus dem Quellcode bauen:** für die aktive Entwicklung am Backend/Frontend.
- **Variante C – In der Superbox/Devbox auf LeoCloud (ohne Docker):** Entwicklung im Cluster,
  Zugriff vom Laptop per `kubectl port-forward`.

Wer die App auf einem **eigenen Server mit HTTPS** betreiben will, nimmt den Stack unter `deployment/server/`
(Caddy + Let's Encrypt) – siehe [CI/CD & Deployment](../../dev/ci-cd-deployment/#eigener-server-mit-https-deploy).

---

## Variante A: Fertige Images (Docker Compose)

Diese Variante zieht die vorgebauten Images aus GHCR
(`ghcr.io/2526-4ahitm-itp/music-voting-backend` und `…-frontend`) und startet
zusammen mit PostgreSQL die ganze Anwendung. Du brauchst dafür **nur Docker** –
kein Java, kein Node, kein `application.properties` editieren.

1. Stack starten:
   ```bash
   cd deployment/compose
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
> Das Backend-Image enthält **keine** `application.properties`. Spotify-Zugangsdaten und
> Redirect-URIs musst du als Umgebungsvariablen mitgeben – ohne `SPOTIFY_REDIRECT_URI` startet das
> Backend nicht. Lege dazu im Ordner `deployment/compose` eine Datei `docker-compose.override.yaml` an:
> ```yaml
> services:
>   backend:
>     environment:
>       - SPOTIFY_CLIENT_ID=deine_client_id
>       - SPOTIFY_CLIENT_SECRET=dein_client_secret
>       - SPOTIFY_REDIRECT_URI=http://127.0.0.1:8080/api/spotify/callback
>       - SPOTIFY_WEB_REDIRECT_URI=http://127.0.0.1:4200/select-playlist
> ```
> Beide Redirect-URIs müssen auch im Spotify-Dashboard eingetragen sein (siehe *How To Develop*).

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
spotify.web.redirect.uri=http://${app.public.host}:${app.web.port}/select-playlist
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

---

## Variante C: In der Superbox/Devbox (LeoCloud, ohne Docker)

In der Superbox läuft der Code in einem Devbox-Pod (`devbox-<n>-0`, die Nummer steht in
`/workspace/.sb/slots`). Gebaut und gestartet wird dort mit `dbx "<befehl>"`. Die Devbox hat Java,
Maven und Node, aber **kein Docker** – die Datenbank läuft deshalb als eigenes PostgreSQL ohne Container,
und die Konfiguration kommt aus Umgebungsvariablen statt aus `application.properties`.

Alle Hilfsdateien liegen in `ai/scratch/` – der Ordner ist git-ignored, Zugangsdaten landen also nie im Repo.

### 1. Datenbank einrichten (einmalig)

Die Server-Binaries kommen von Maven Central (zonky), `psql` aus dem Debian-Paket. `nss_wrapper` ist nötig,
weil der Devbox-User (UID 1000) nicht in `/etc/passwd` steht – ohne ihn bricht `initdb` ab.

```bash
mkdir -p ai/scratch/postgres && cd ai/scratch/postgres
dbx 'V=16.15.0; curl -sfLo pg.jar https://repo1.maven.org/maven2/io/zonky/test/postgres/embedded-postgres-binaries-linux-amd64/$V/embedded-postgres-binaries-linux-amd64-$V.jar \
  && unzip -oq pg.jar "*.txz" && python3 -c "import tarfile,glob; tarfile.open(glob.glob(\"*.txz\")[0]).extractall(\"dist\")" && rm pg.jar *.txz'
dbx 'M=https://deb.debian.org/debian/pool/main; mkdir -p client nss \
  && for f in p/postgresql-17/libpq5_17.11-0+deb13u1_amd64.deb p/postgresql-17/postgresql-client-17_17.11-0+deb13u1_amd64.deb; do curl -sfL $M/$f -o c.deb && dpkg-deb -x c.deb client/x; done \
  && curl -sfL $M/n/nss-wrapper/libnss-wrapper_1.1.16-5+b2_amd64.deb -o n.deb && dpkg-deb -x n.deb nss/x && rm *.deb \
  && echo "musicvoting:x:1000:1000::/tmp/home:/bin/bash" > nss/passwd && echo "musicvoting:x:1000:" > nss/group'
```

> [!NOTE]
> Die Versionen in den Debian-URLs ändern sich mit Sicherheitsupdates. Liefert `curl` einen Fehler,
> die aktuelle Datei unter `https://deb.debian.org/debian/pool/main/p/postgresql-17/` bzw. `…/n/nss-wrapper/` nachsehen.

Dann das Steuerskript `ai/scratch/postgres/pg.sh` anlegen (`chmod +x`):

```bash
#!/bin/bash
# Lokales PostgreSQL 16 für die Devbox: ./pg.sh init|start|stop|status|psql
set -e
D="$(cd "$(dirname "$0")" && pwd)"
export LD_PRELOAD="$D/nss/x/usr/lib/x86_64-linux-gnu/libnss_wrapper.so"
export NSS_WRAPPER_PASSWD="$D/nss/passwd" NSS_WRAPPER_GROUP="$D/nss/group"
export LD_LIBRARY_PATH="$D/client/x/usr/lib/x86_64-linux-gnu" PGPASSWORD=musicvoting
B="$D/dist/bin"; C="$D/client/x/usr/lib/postgresql/17/bin"
case "$1" in
  init)
    printf musicvoting > "$D/pw"
    "$B/initdb" -D "$D/data" -U musicvoting --pwfile="$D/pw" -A scram-sha-256 -E UTF8 --locale=C
    rm -f "$D/pw"
    # Nur TCP – Unix-Sockets auf dem NFS-Workspace sind unzuverlässig.
    printf "listen_addresses = 'localhost'\nport = 5432\nunix_socket_directories = ''\n" >> "$D/data/postgresql.conf"
    "$0" start
    "$C/createdb" -h localhost -U musicvoting musicvoting
    "$C/psql" -h localhost -U musicvoting -d musicvoting -q -f "$D/../../../musicvoting/backend/setup.sql" ;;
  start)  "$B/pg_ctl" -D "$D/data" -l "$D/postgres.log" -w start ;;
  stop)   "$B/pg_ctl" -D "$D/data" -w stop ;;
  status) "$B/pg_ctl" -D "$D/data" status ;;
  psql)   shift; "$C/psql" -h localhost -U musicvoting -d musicvoting "$@" ;;
esac
```

Datenbank anlegen (legt DB `musicvoting` an und lädt `setup.sql`):

```bash
dbx "ai/scratch/postgres/pg.sh init"
```

Später reicht `dbx "ai/scratch/postgres/pg.sh start"` (z. B. nach einem Neustart der Devbox).

### 2. Backend-Konfiguration

`ai/scratch/backend.env` – entspricht den Standardwerten aus Variante B:

```bash
export QUARKUS_DATASOURCE_DB_KIND=postgresql
export QUARKUS_DATASOURCE_USERNAME=musicvoting
export QUARKUS_DATASOURCE_PASSWORD=musicvoting
export QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://localhost:5432/musicvoting
export QUARKUS_DATASOURCE_DEVSERVICES_ENABLED=false   # sonst sucht Quarkus nach Docker
export QUARKUS_HIBERNATE_ORM_DATABASE_GENERATION=none
export QUARKUS_HTTP_HOST=0.0.0.0
export QUARKUS_HTTP_PORT=8080
export SPOTIFY_REDIRECT_URI=http://127.0.0.1:8080/api/spotify/callback
export SPOTIFY_WEB_REDIRECT_URI=http://127.0.0.1:4200/select-playlist
export MUSICVOTING_JOIN_BASE_URL=http://localhost:4200/join
export SPOTIFY_TOPCHARTS_PLAYLIST_ID=
export SPOTIFY_CLIENT_ID=dummy        # Platzhalter, reicht für die Tests
export SPOTIFY_CLIENT_SECRET=dummy
D="$(dirname "${BASH_SOURCE[0]}")"
[ -f "$D/spotify.env" ] && . "$D/spotify.env"
```

Die echten Spotify-Zugangsdaten kommen in eine eigene Datei `ai/scratch/spotify.env`. Am einfachsten vom
Laptop aus mit `nano` in der Devbox anlegen:

```bash
kubectl exec -it devbox-<n>-0 -- nano /workspace/<projekt>/ai/scratch/spotify.env
```

```bash
export SPOTIFY_CLIENT_ID=deine_client_id
export SPOTIFY_CLIENT_SECRET=dein_client_secret
```

Danach `chmod 600 ai/scratch/spotify.env`. Im Spotify-Dashboard müssen die beiden Redirect-URIs
`http://127.0.0.1:8080/api/spotify/callback` und `http://127.0.0.1:4200/select-playlist` eingetragen sein.

### 3. Backend und Frontend starten

Jeder Server in einem **eigenen** `dbx`-Aufruf, der sofort zurückkehrt:

```bash
# Backend (Port 8080)
cd musicvoting/backend
dbx ". ../../ai/scratch/backend.env; nohup ./mvnw -B quarkus:dev -Dquarkus.console.enabled=false > target/app.log 2>&1 < /dev/null & echo \$! > target/app.pid"

# Frontend (Port 4200) – beim ersten Mal vorher: dbx "npm ci"
cd ../frontend
dbx "mkdir -p .angular; nohup npx ng serve --host 0.0.0.0 --port 4200 > .angular/app.log 2>&1 < /dev/null & echo \$! > .angular/app.pid"
```

Das Backend ist nach ca. 15 s bereit (`started in …` in `target/app.log`).

Backend-Tests laufen genauso gegen die lokale DB:

```bash
cd musicvoting/backend && dbx ". ../../ai/scratch/backend.env; ./mvnw -B test"
```

### 4. Vom Laptop aus öffnen

Beide Ports weiterleiten – **4200** für das Frontend und **8080** für das Backend (Spotify-Callback):

```bash
kubectl port-forward pod/devbox-<n>-0 4200:4200 8080:8080
```

Dann im Browser **http://127.0.0.1:4200** öffnen.

> [!IMPORTANT]
> **`127.0.0.1` verwenden, nicht `localhost`.** Die Spotify-Redirect-URIs lauten auf `127.0.0.1`
> (Spotify erlaubt `localhost` nicht). Über `localhost` geht der Login-Rücksprung ins Leere.

> [!TIP]
> Meldungen wie *„This page is in Quirks Mode“* oder *„Content-Security-Policy … blocked an inline script“*
> in der Browser-Konsole beim Login kommen von **Spotifys** Anmeldeseite, nicht von MusicVoting – ignorieren.
> Zeigt Spotify dagegen *„INVALID_CLIENT“*, fehlt `spotify.env` (Backend läuft mit `dummy`) oder
> eine Redirect-URI im Dashboard.

### 5. Beenden

```bash
cd musicvoting/backend  && dbx "kill \$(cat target/app.pid)"
dbx 'pkill -f "ng serve"'
dbx "/workspace/<projekt>/ai/scratch/postgres/pg.sh stop"
dbx "ps -ef"   # kontrollieren, dass nichts mehr läuft
```
