---
title: Technical Docs
description: Technische Entwickler-Dokumentation für MusicVoting
showDate: false
---

Technische Dokumentation für Entwickler:innen, die an MusicVoting weiterarbeiten.
Der Aufbau orientiert sich grob am [Diátaxis](https://diataxis.fr/)-Schema.

## Explanation – Konzepte verstehen
- **[Architektur](architecture/)** – Systemüberblick, Komponenten, Datenfluss
- **[Authentifizierung & Autorisierung](authentication/)** – Host-PIN, deviceId, Guards & Filter
- **[Spotify-Integration](spotify-integration/)** – OAuth, Token-Refresh, Web Playback SDK

## Reference – Technische Details
- **[Datenbankschema](database-schema/)** – Tabellen, Beziehungen, Constraints
- **[REST-API](api-reference/)** – alle Endpunkte
- **[Realtime / SSE-Events](realtime-sse/)** – Live-Updates über Server-Sent Events
- **[Backend](backend/)** – Quarkus-Aufbau, Packages, Kernklassen
- **[Frontend](frontend/)** – Angular-Aufbau, Routen, Services
- **[iOS-App](ios-app/)** – SwiftUI-Aufbau

## How-To / Betrieb
- **[CI/CD & Deployment](ci-cd-deployment/)** – GitHub Actions, GHCR, Kubernetes

> [!NOTE]
> Die fachliche Spezifikation (was die App tun soll) liegt in der
> {{< article link="docs/specification/" >}} bzw. unter `openspec/specs/`.
> Diese Seiten beschreiben, **wie** es technisch umgesetzt ist.
