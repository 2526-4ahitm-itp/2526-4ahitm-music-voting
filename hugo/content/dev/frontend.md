---
title: Frontend
description: Aufbau der Angular-App – Routen, Services, Guard & Interceptor
tags: [ Developer ]
weight: 80
showDate: true
date: 2026-06-23
lastmod: 2026-11-17
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
| `voting` | `VotingComp` | Die eine Gastseite „Warteschlange“: Läuft-gerade-Leiste, Ränge, Likes und Suchfeld zum Suchen & Hinzufügen |
| `guest` | → `voting` | Alte Such-Seite, leitet weiter |
| `host-options` | `HostOptions` | Host-Menü |
| `create-party` | `CreateParty` | Party erstellen (Provider wählen) |
| `select-playlist` 🔒 | `SelectPlaylist` | Standard-Playlist wählen oder überspringen (Ziel nach Spotify-Login) |
| `select-blacklist` 🔒 | `SelectBlacklist` | Blocklist: ein Suchfeld für Wort, Künstler und Song; mit `?mode=edit` während der Party |
| `party-ready` 🔒 | `PartyReady` | „Deine Party ist bereit“: „Player auf diesem Gerät öffnen“ plus fünf Schritte für ein anderes Gerät, Voting-PIN, „Party ist live 🎉“ |
| `startpage` 🔒 | `Startpage` | Monitor/TV-Player (Web Playback SDK) |
| `dashboard` 🔒 | `HostDashboard` | Host-Steuerung (Wiedergabe, ganze Queue mit Likes des Hosts und einem Suchfeld wie bei den Gästen, QR, Voting-PIN, Player öffnen, Party beenden, Gastgeber-PIN verborgen bis „Anzeigen“) |
| `voting-host`, `search-host` | → `dashboard` | Alte Host-Seiten, leiten weiter |
| `**` | → `` | Fallback auf Home |

## Services & Querschnitt

- **`services/party.service.ts`** – zentraler Zugriff auf die Backend-API (Party, Queue, Voting,
  Suche, Playback, Playlists/Standard-Playlist) und die SSE-Verbindung.
- **`services/spotify-player.ts`** (`SpotifyWebPlayerService`) – kapselt das Web Playback SDK.
- **`services/spotify-tracks.ts`** (`TrackService`) – Track-Abfragen.
- **`host-auth.interceptor.ts`** – hängt `Authorization: Bearer <hostPin>` an, wenn ein Host-PIN im
  `localStorage` liegt (siehe [Authentifizierung](../authentication/)).
- **`host.guard.ts`** – schützt die Host-Routen; ohne Host-PIN Redirect auf `/`.

## Rollen-Verhalten

- **Gast:** hat nur eine Seite, `voting`. Das Suchfeld über der Warteschlange sucht beim Tippen
  beim Anbieter; Treffer, die schon in der Warteschlange sind, zeigen Likes und Herz (dort voten),
  alle anderen ein „+“; das „x“ im Feld leert die Suche. Oben steht „Party 12345“ mit „Party verlassen“
  (Rückfrage; löscht die Party, behält die `deviceId`).
- **Host:** erstellt die Party (`host-options` → `create-party` → Spotify-Login →
  `select-playlist` → `select-blacklist` → `party-ready` → `dashboard`), steuert Wiedergabe und
  Queue über `dashboard`; Fortschrittsbalken aus `progress`-SSE-Events. Play/Pause/Skip sind
  gesperrt, solange kein Player offen ist („Player muss zuerst geöffnet werden.“). Das Suchfeld
  im Dashboard funktioniert wie bei den Gästen (Treffer ersetzen die Queue, „x“ leert es); der Host
  liked Songs wie ein Gast, ein Like pro Gerät. Die Host-Navigation (`mv-host-menu`: Dashboard,
  Blocklist, mit Logo und „Party läuft · PIN“) ist unter 1024 px ein Burger-Menü, ab 1024 px
  eine feste Leiste links.
- **Monitor/TV (`startpage`):** lädt das Web Playback SDK, registriert das Spotify-Gerät, sendet das
  Fortschritts-Relay und reagiert auf `track-changed`/`party-ended`. Geöffnet wird er über
  „Player auf diesem Gerät öffnen“ im Dashboard bzw. auf einem anderen Gerät über `host-options`
  → „Player öffnen“ mit Gastgeber-PIN (die fünf Schritte stehen in Dashboard und `party-ready`).

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

## Design-System

Das visuelle System („Die Bühne im Wohnzimmer“: dunkle Bühne mit lila-korallenem Licht) ist in
[`DESIGN.md`](https://github.com/2526-4ahitm-itp/2526-4ahitm-music-voting/blob/main/DESIGN.md) im Repo-Root beschrieben. Im Code:

- **Tokens** in `src/styles.css` (`--mv-*`); Komponenten verwenden nur diese, deshalb funktioniert
  der Hellmodus ohne seitenspezifisches CSS.
- **`shared/stage.css`** – gemeinsamer Seitenrahmen (Bühne, Top-Bar, Karten, Zeilen, Knöpfe).
- **Shared Components** in `src/app/shared/`: `mv-cover`, `mv-icon` (Lucide), `mv-host-menu`,
  `mv-guest-party`, `mv-theme-toggle` (nur Symbol), `mv-toast` (Bestätigungen als lila Karte mit Symbol),
  `mv-other-device-steps`, `mv-spinner`,
  `mv-party-ended`, `mv-credit-footer`.
- **Hell/Dunkel:** getrennte Einstellungen für Host/TV/Einstieg (`mv-theme`) und Gäste
  (`mv-guest-theme`).
- **Kontrast-Test** `shared/contrast.tokens.spec.ts` prüft alle Text-/Flächen-Paare inklusive
  Markenlicht (4,5:1, auf dem TV 3:1).

Details: `musicvoting/frontend/README.md`.

## Branding

Player (`startpage`) und Startseite (`/`) zeigen unten das Logo, „MusicVoting“ und
„powered by HTL Leonding“ (`assets/img/logo-mark.png`, `assets/img/htl-leonding-logo-480.jpg`).
Host- und Gast-Seiten zeigen den HTL-Hinweis nicht.
