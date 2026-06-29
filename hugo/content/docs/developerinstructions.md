---
title: How To Develop
description: Setup für die Weiterentwicklung – Spotify-Konto, application.properties, Architektur
tags: [ Developer ]
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
authors:
  - simone
---

Diese Seite richtet eine **Entwicklungsumgebung** ein, in der du am Quellcode arbeitest.
Willst du die App nur starten/ausprobieren, siehe {{< article link="docs/runinstructions/" >}}.

## Voraussetzungen

1. **Premium Spotify Account** – nötig, um die Spotify-Playback-API zu nutzen.
2. **Spotify Developer Konto** – liefert Client ID & Client Secret (siehe unten).
3. **Docker** – für die PostgreSQL-Datenbank.
4. **Java 21** und **Node.js** – für Backend bzw. Frontend.

---

## Schritt 1 – Spotify Developer Konto & App anlegen

1. Gehe zu [Spotify for Developers](https://developer.spotify.com/dashboard).
2. Melde dich mit deinem Spotify-Konto an (oder erstelle eines).
3. Klicke auf **Create an App**, vergib Name und Beschreibung, akzeptiere die Bedingungen, **Create**.
4. Öffne die App und notiere dir aus den **Settings**:
   - die **Client ID**
   - das **Client Secret**

> [!NOTE]
> Mit einem Developer-Konto kann die App nur von **25 vorgemerkten Spotify-Nutzern** verwendet werden.
> Diese müssen im Dashboard unter *User Management* mit ihrer E-Mail-Adresse hinzugefügt werden.

---

## Schritt 2 – Redirect URIs im Dashboard eintragen

Trage in der Spotify-App unter **Settings → Redirect URIs** folgende Einträge ein:

- `http://127.0.0.1:8080/api/spotify/callback` – Backend-Callback (Pflicht)
- `http://127.0.0.1:4200/dashboard` – Web-Dashboard (Pflicht)
- `musicvotingapp://callback` – nur wenn du die iOS-App nutzt

Nur falls die Swift-App per Xcode auf einem **echten iPhone** läuft (Hotspot am Handy): zusätzlich die folgenden URIs mit der **aktuellen IP-Adresse deines Handys** statt `127.0.0.1`. Ersetze `<HANDY-IP>` durch diese Adresse (z. B. `172.20.10.2`, wenn das iPhone als Hotspot dient – die genaue IP findest du in den WLAN-/Hotspot-Einstellungen):

- `http://<HANDY-IP>:8080/api/spotify/callback`
- `http://<HANDY-IP>:4200/dashboard`

Anschließend **Save**.

---

## Schritt 3 – `application.properties` befüllen

Datei: `musicvoting/backend/src/main/resources/application.properties`

**Du musst nur zwei Werte selbst setzen:** die `Client ID` und das `Client Secret` aus Schritt 1.
Alles andere sind funktionierende Standardwerte für die lokale Entwicklung (so lassen). Die optionalen
Zeilen sind auskommentiert und mit „Nur wenn …“ markiert.

```properties
# === Pflicht: deine eigenen Spotify-Zugangsdaten (aus dem Dashboard) ===
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

> [!IMPORTANT]
> Die Redirect-URIs in `application.properties` und im Spotify-Dashboard (Schritt 2)
> **müssen exakt übereinstimmen** – sonst schlägt der Login fehl.

---

## Schritt 4 – App starten

Datenbank, Backend und Frontend starten – die genauen Befehle stehen in
{{< article link="docs/runinstructions/" >}}.
Kurzform für lokale Entwicklung:

```bash
cd script
./start.sh
```

---

## Architektur (Kurzüberblick)

| Ebene | Technologie |
|---|---|
| Backend | Quarkus (Java 21), REST + SSE |
| Frontend | Angular (Gast, Host, Dashboard) |
| Datenbank | PostgreSQL 16 (via Docker) |
| Mobile (optional) | SwiftUI iOS-App |

- Die verbindliche fachliche Spezifikation liegt unter `openspec/specs/`; eine lesbare Zusammenfassung ist die {{< article link="docs/specification/" >}}.
- Feature-Arbeit läuft über den **OpenSpec-Workflow** (`openspec/changes/<name>/`): Proposal → Delta-Specs → Design → Tasks → Implementierung → Verify → Archive. `openspec/specs/` wird **nie** direkt für ein neues Feature bearbeitet.

---

## Deployment (CI/CD)

Die App ist im HTL-Leonding-Cluster deployed und unter **https://it220241.cloud.htl-leonding.ac.at** erreichbar.

- Workflow: `.github/workflows/build-push-deploy.yml` (läuft bei Push auf `main`, wenn `musicvoting/**` oder `k8s/**` betroffen ist; zusätzlich manuell per *workflow_dispatch*).
- Backend- und Frontend-Images werden gebaut und nach **GHCR** gepusht
  (`ghcr.io/2526-4ahitm-itp/music-voting-backend` / `…-frontend`).
- `kubectl apply -f k8s/` im Namespace `student-it220241`, anschließend Rollout-Restart von Backend und Frontend.
- Die k8s-Manifests liegen unter `k8s/` (`01-postgres.yaml`, `02-backend.yaml`, `03-frontend.yaml`, `ingress.yaml`).

> [!NOTE]
> In Produktion kommen Client ID/Secret aus einem Kubernetes-Secret (`spotify-credentials`),
> nicht aus `application.properties`. Secrets (auch die Kubeconfig) liegen als GitHub-Actions-Secrets vor
> und werden **nicht** im Repository abgelegt.

---

## Veröffentlichen der Applikation (optional)

Um das 25-Nutzer-Limit aufzuheben, muss bei Spotify ein **Quota-Extension-Antrag** gestellt werden.
Nach Genehmigung ist die App für alle Spotify-Nutzer zugänglich.
