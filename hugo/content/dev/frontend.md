---
title: Frontend
description: Aufbau der Angular-App – Routen, Services, Guard & Interceptor
tags: [ Developer ]
weight: 80
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
---

Das Frontend ist eine **Angular**-App unter `musicvoting/frontend/`. Es bedient drei Rollen:
**Gast**, **Host** und **Monitor/TV** (Startpage mit Spotify Web Playback SDK).

## Routen

Definiert in `src/app/app.routes.ts`. 🔒 = durch `hostGuard` geschützt.

| Pfad | Komponente | Zweck |
|---|---|---|
| `` (Home) | `Home` | Startseite |
| `code` | `CodeInput` | 5-stelligen PIN eingeben |
| `join/:pin` | `CodeInput` | Beitritt per QR-Link (`/join/<pin>`) |
| `voting` | `VotingComp` | Gast: Voting-Ansicht (Queue) |
| `guest` | `Guest` | Gast: Suchen & Hinzufügen |
| `host-options` | `HostOptions` | Host-Menü |
| `create-party` | `CreateParty` | Party erstellen (Provider wählen) |
| `startpage` 🔒 | `Startpage` | Monitor/TV-Player (Web Playback SDK) |
| `dashboard` 🔒 | `HostDashboard` | Host-Steuerung |
| `voting-host` 🔒 | `VotingHost` | Host: Queue-Ansicht |
| `search-host` 🔒 | `SearchHost` | Host: Suche |
| `**` | → `` | Fallback auf Home |

## Services & Querschnitt

- **`services/party.service.ts`** – zentraler Zugriff auf die Backend-API (Party, Queue, Voting,
  Suche, Playback) und die SSE-Verbindung.
- **`host-auth.interceptor.ts`** – hängt `Authorization: Bearer <hostPin>` an, wenn ein Host-PIN im
  `localStorage` liegt (siehe [Authentifizierung](../authentication/)).
- **`host.guard.ts`** – schützt die Host-Routen; ohne Host-PIN Redirect auf `/`.

## Rollen-Verhalten

- **Gast:** landet nach dem Beitreten auf `voting`; untere Tab-Leiste wechselt zwischen „Voten“
  (`voting`) und „Hinzufügen“ (`guest`).
- **Host:** erstellt die Party, steuert Wiedergabe und Queue über `dashboard`; Fortschrittsbalken
  aus `progress`-SSE-Events.
- **Monitor/TV (`startpage`):** lädt das Web Playback SDK, registriert das Spotify-Gerät, sendet das
  Fortschritts-Relay und reagiert auf `track-changed`/`party-ended`.

## SSE im Frontend

Clients abonnieren `GET /api/spotify/events?source=web&partyId={id}` und laden bei
`queue-updated` / `vote-updated` / `track-changed` neu bzw. navigieren bei `party-ended` zurück.
Details: [Realtime / SSE](../realtime-sse/).

## Lokal starten

Siehe {{< article link="docs/runinstructions/" >}} – kurz: `cd musicvoting/frontend && npm install && npm start`.
