---
title: CI/CD & Deployment
description: GitHub Actions, GHCR, Kubernetes und der Caddy-Stack
tags: [ Developer ]
weight: 100
showDate: true
date: 2026-06-23
lastmod: 2026-09-28
---

Die App ist im HTL-Leonding-Cluster deployed und unter
**https://it220241.cloud.htl-leonding.ac.at** erreichbar.

## Workflows (GitHub Actions)

| Workflow | Trigger | Aufgabe |
|---|---|---|
| `.github/workflows/build-push-deploy.yml` | Push auf `main` oder `feature/deployment` (Pfade `musicvoting/**`, `k8s/**`, der Workflow selbst) + manuell | App bauen, Images pushen, deployen |
| `.github/workflows/hugo.yaml` | Push auf `main` (Pfade `hugo/**`, `.github/workflows/**`) + manuell | Diese Doku-Website nach GitHub Pages bauen (Hugo Extended 0.145.0) |

### App-Pipeline (build-push-deploy)

1. **Build & Push:** Backend- und Frontend-Image werden gebaut und nach **GHCR** gepusht
   (`ghcr.io/2526-4ahitm-itp/music-voting-backend` und `…-frontend`, Tags `latest` + Commit-SHA).
2. **Deploy:** `kubectl apply -f k8s/` im Namespace `student-it220241`.
3. **Postgres neu starten:** `kubectl rollout restart deployment/postgres` und auf `rollout status`
   warten – so wird das Schema aus der (evtl. geänderten) ConfigMap neu angelegt, **bevor** das
   Backend sich verbindet.
4. **Rollout:** `kubectl rollout restart` für Backend und Frontend, damit die neuen Images gezogen
   werden, danach `rollout status` (Timeout 120 s).

> [!WARNING]
> Postgres hat **kein PersistentVolume**. Jeder Deploy (und jeder Pod-Neustart) setzt die Datenbank
> zurück – alle Partys gehen dabei verloren.

## Kubernetes-Manifests (`k8s/`)

| Datei | Inhalt |
|---|---|
| `01-postgres.yaml` | ConfigMap `postgres-init-config` (**Kopie von `setup.sql`**) + PostgreSQL-Deployment + Service |
| `02-backend.yaml` | Backend-Deployment + Service (Port 8080), Env-Variablen |
| `03-frontend.yaml` | Frontend-Deployment + Service (Port 80) |
| `ingress.yaml` | Ingress (nginx) für `it220241.cloud.htl-leonding.ac.at` |

- **Ingress-Routing:** `/api` (sowie `/graphql`, `/ws`) → Backend (8080), alles übrige → Frontend (80).
  Read-/Send-Timeout 3600 s, damit SSE-Verbindungen offen bleiben.
- **Backend-Env** zeigt auf die Produktions-URLs (`APP_PUBLIC_HOST`, `*_REDIRECT_URI`,
  `MUSICVOTING_JOIN_BASE_URL`) und die DB (`QUARKUS_DATASOURCE_*` → Service `postgres`), dazu die
  Auto-Refill-Werte `SPOTIFY_MARKET` (`AT`) und `SPOTIFY_TOPCHARTS_PLAYLIST_ID` (leer).
- **`SPOTIFY_WEB_REDIRECT_URI` muss auf `/select-playlist` zeigen** – sonst überspringt der Host nach
  dem Login die Standard-Playlist-Auswahl.
- **Secrets:** `SPOTIFY_CLIENT_ID`/`SECRET` kommen aus dem Kubernetes-Secret `spotify-credentials`,
  nicht aus `application.properties`. Images werden über `ghcr-pull-secret` gezogen.

> [!NOTE]
> `KUBE_CONFIG` und `GITHUB_TOKEN` liegen als GitHub-Actions-Secrets vor und sind **nicht** im
> Repository.

> [!IMPORTANT]
> **Schema-Änderung = zwei Dateien.** Neue Spalten müssen in `musicvoting/backend/setup.sql` **und** in
> der ConfigMap in `k8s/01-postgres.yaml` stehen. Fehlt eine Spalte in der ConfigMap, antwortet das
> Backend in Produktion mit HTTP 500 (so geschehen im Juni 2026).

## Eigener Server mit HTTPS (`deploy/`)

`deploy/` enthält einen eigenständigen Produktions-Stack: **Caddy** (Reverse-Proxy mit automatischem
Let's-Encrypt-Zertifikat), Frontend, Backend und PostgreSQL (mit Volume).

1. `cd deploy && cp .env.example .env` und die Werte eintragen – `DOMAIN`, `ACME_EMAIL`,
   `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` sind Pflicht. Alle URLs (QR-Join, OAuth-Callback,
   `/select-playlist`) werden aus `DOMAIN` abgeleitet.
2. DNS-Eintrag auf den Server, Ports **80 und 443** offen.
3. Im Spotify-Dashboard `https://DOMAIN/api/spotify/callback` und `https://DOMAIN/select-playlist`
   eintragen.
4. `docker compose up -d --build`.

Caddy leitet `/api/*` ungepuffert (`flush_interval -1`, wichtig für SSE) ans Backend, alles andere
an die Angular-SPA. Alle Details: `deploy/PLACEHOLDERS.md`.

## Lokal mit denselben Images

Unter `compose/` liegt ein Docker-Compose-Stack, der die GHCR-Images plus PostgreSQL startet –
siehe Variante A in {{< article link="docs/runinstructions/" >}}.
