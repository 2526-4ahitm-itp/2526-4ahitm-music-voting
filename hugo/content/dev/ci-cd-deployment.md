---
title: CI/CD & Deployment
description: GitHub Actions, GHCR und Kubernetes
tags: [ Developer ]
weight: 100
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
---

Die App ist im HTL-Leonding-Cluster deployed und unter
**https://it220241.cloud.htl-leonding.ac.at** erreichbar.

## Workflows (GitHub Actions)

| Workflow | Trigger | Aufgabe |
|---|---|---|
| `.github/workflows/build-push-deploy.yml` | Push auf `main` (Pfade `musicvoting/**`, `k8s/**`) + manuell | App bauen, Images pushen, deployen |
| `.github/workflows/hugo.yaml` | Push auf `main` (Pfad `hugo/**`) | Diese Doku-Website nach GitHub Pages bauen |

### App-Pipeline (build-push-deploy)

1. **Build & Push:** Backend- und Frontend-Image werden gebaut und nach **GHCR** gepusht
   (`ghcr.io/2526-4ahitm-itp/music-voting-backend` und `…-frontend`, Tags `latest` + Commit-SHA).
2. **Deploy:** `kubectl apply -f k8s/` im Namespace `student-it220241`.
3. **Rollout:** `kubectl rollout restart` für Backend und Frontend, damit die neuen Images gezogen
   werden, danach `rollout status` (Timeout 120 s).

## Kubernetes-Manifests (`k8s/`)

| Datei | Inhalt |
|---|---|
| `01-postgres.yaml` | PostgreSQL-Deployment + Service |
| `02-backend.yaml` | Backend-Deployment + Service (Port 8080), Env-Variablen |
| `03-frontend.yaml` | Frontend-Deployment + Service (Port 80) |
| `ingress.yaml` | Ingress (nginx) für `it220241.cloud.htl-leonding.ac.at` |

- **Ingress-Routing:** `/api` (sowie `/graphql`, `/ws`) → Backend (8080), alles übrige → Frontend (80).
- **Backend-Env** zeigt auf die Produktions-URLs (`APP_PUBLIC_HOST`, `*_REDIRECT_URI`,
  `MUSICVOTING_JOIN_BASE_URL`) und die DB (`QUARKUS_DATASOURCE_*` → Service `postgres`).
- **Secrets:** `SPOTIFY_CLIENT_ID`/`SECRET` kommen aus dem Kubernetes-Secret `spotify-credentials`,
  nicht aus `application.properties`. Images werden über `ghcr-pull-secret` gezogen.

> [!NOTE]
> `KUBE_CONFIG` und `GITHUB_TOKEN` liegen als GitHub-Actions-Secrets vor und sind **nicht** im
> Repository.

## Lokal mit denselben Images

Unter `compose/` liegt ein Docker-Compose-Stack, der die GHCR-Images plus PostgreSQL startet –
siehe Variante A in {{< article link="docs/runinstructions/" >}}.
