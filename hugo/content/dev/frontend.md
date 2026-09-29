---
title: Frontend
description: Aufbau der Angular-App – Routen, Services, Guard & Interceptor
tags: [ Developer ]
weight: 80
showDate: true
date: 2026-06-23
lastmod: 2026-09-28
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
| `select-playlist` 🔒 | `SelectPlaylist` | Standard-Playlist wählen oder überspringen (Ziel nach Spotify-Login) |
| `startpage` 🔒 | `Startpage` | Monitor/TV-Player (Web Playback SDK) |
| `dashboard` 🔒 | `HostDashboard` | Host-Steuerung (Wiedergabe, Queue, Host-PIN, QR, Player öffnen, Party beenden) |
| `voting-host` 🔒 | `VotingHost` | Host: Queue-Ansicht |
| `search-host` 🔒 | `SearchHost` | Host: Suche |
| `**` | → `` | Fallback auf Home |

## Services & Querschnitt

- **`services/party.service.ts`** – zentraler Zugriff auf die Backend-API (Party, Queue, Voting,
  Suche, Playback, Playlists/Standard-Playlist) und die SSE-Verbindung.
- **`services/spotify-player.ts`** (`SpotifyWebPlayerService`) – kapselt das Web Playback SDK.
- **`services/queue-state.ts`** (`QueueStateService`) – gemeinsamer Queue-Zustand der Ansichten.
- **`services/spotify-tracks.ts`** (`TrackService`) – Track-Abfragen.
- **`host-auth.interceptor.ts`** – hängt `Authorization: Bearer <hostPin>` an, wenn ein Host-PIN im
  `localStorage` liegt (siehe [Authentifizierung](../authentication/)).
- **`host.guard.ts`** – schützt die Host-Routen; ohne Host-PIN Redirect auf `/`.

## Rollen-Verhalten

- **Gast:** landet nach dem Beitreten auf `voting`; untere Tab-Leiste wechselt zwischen „Voten“
  (`voting`) und „Hinzufügen“ (`guest`).
- **Host:** erstellt die Party (`host-options` → `create-party` → Spotify-Login →
  `select-playlist` → `dashboard`), steuert Wiedergabe und Queue über `dashboard`;
  Fortschrittsbalken aus `progress`-SSE-Events. Play/Pause/Skip sind gesperrt, solange kein Player
  offen ist („Player muss zuerst geöffnet werden.“).
- **Monitor/TV (`startpage`):** lädt das Web Playback SDK, registriert das Spotify-Gerät, sendet das
  Fortschritts-Relay und reagiert auf `track-changed`/`party-ended`. Geöffnet wird er über
  „Player öffnen“ (im Dashboard oder in `host-options` mit Host-PIN).

## SSE im Frontend

Clients abonnieren `GET /api/spotify/events?source=web&partyId={id}` und laden bei
`queue-updated` / `vote-updated` / `track-changed` neu bzw. navigieren bei `party-ended` zurück.
Details: [Realtime / SSE](../realtime-sse/).

## Lokal starten

Siehe {{< article link="docs/runinstructions/" >}} – kurz: `cd musicvoting/frontend && npm install && npm start`.

## Autoplay im Player (`startpage.ts`)

Der Player ist der einzige Client, der das echte Songende kennt, und treibt deshalb das Autoplay:

- **Songende erkennen – dreifach:** SDK-State-Event, 1-s-Poll des SDK-States und
  „verstrichene Zeit ≥ Dauer“ (`maybeAdvanceOnEnd`, `maybeAdvanceOnElapsed`). Pro Track-URI wird nur
  **einmal** weitergeschaltet, dazu ein 3-s-Guard (`isAdvancing`).
- **Am natürlichen Ende** weiterschalten, nicht früher – sonst läuft die Anzeige dem Ton voraus.
- **Nachladen:** ~3 s vor Songende (`PREPARE_NEXT_LEAD_MS`) `POST /track/prepare-next`, damit der
  Auto-Refill rechtzeitig einen Song bereitstellt.
- **Idle-Restart:** Wird ein Song zu einer Party ohne aktiven Track hinzugefügt, startet der Player die
  Wiedergabe selbst – ein laufender oder bewusst pausierter Song wird nie unterbrochen.

## Branding

Player (`startpage`) und Dashboard zeigen unten „MusicVoting – powered by HTL Leonding“
(`assets/img/htl-leonding-logo.jpg`).
