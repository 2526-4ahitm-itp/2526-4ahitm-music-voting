---
title: REST-API
description: Alle Backend-Endpunkte
tags: [ Developer ]
weight: 40
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
---

Basis-Pfad: **`/api`** (`@ApplicationPath("api")`). Antworten sind JSON, sofern nicht anders angegeben.
Mit 🔒 markierte Endpunkte sind `@HostOnly` und erfordern den Header
`Authorization: Bearer <hostPin>` (siehe [Authentifizierung](../authentication/)).

## Party — `/api/party`

| Methode | Pfad | Beschreibung |
|---|---|---|
| `POST` | `/api/party` | Party erstellen. Body z. B. `{"provider":"spotify"}`. Antwort: `id`, `pin`, `hostPin`, `joinUrl`. |
| `DELETE` | `/api/party/{id}` 🔒 | Party beenden (Queue leeren, Tokens löschen, `party-ended`-Event). |
| `GET` | `/api/party/join/{pin}` | Gast-PIN → Party-ID auflösen (404 bei unbekannt/beendet). |
| `GET` | `/api/party/host-join/{hostPin}` | Host-PIN → Party-ID auflösen. |
| `GET` | `/api/party/{id}` | Party-Info. |
| `GET` | `/api/party/{id}/qr` | QR-Code als **PNG** (`image/png`), kodiert die Join-URL. |

## Track / Queue / Playback — `/api/party/{partyId}/track`

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/search?q=` | Suche beim Provider; leeres `q` → Top-Charts. |
| `GET` | `/{id}` | Einzelnen Track abrufen. |
| `GET` | `/queue?deviceId=` | Sortierte Queue; mit `deviceId` zusätzlich `hasVoted` pro Eintrag. |
| `POST` | `/addToPlaylist` | Song(s) zur Queue hinzufügen (Duplikat-/Blacklist-/Ratelimit-Prüfung). |
| `DELETE` | `/remove` 🔒 | Song aus der Queue entfernen. |
| `POST` | `/vote` | Like umschalten (Body mit `deviceId`). |
| `POST` | `/start` 🔒 | Wiedergabe aus der Queue starten. |
| `POST` | `/pause` 🔒 | Pausieren. |
| `POST` | `/resume` 🔒 | Fortsetzen. |
| `POST` | `/next` 🔒 | Zum nächsten Song (Skip / Song-Ende). |
| `GET` | `/current` | Aktueller Track inkl. `isPlaying`, `progressMs`, `deviceActive`. |
| `POST` | `/progress` | Fortschritts-Relay des TV-Players (`{position,duration,paused}`); best-effort. |
| `PUT` | `/play` 🔒 | Konkreten Track abspielen. |
| `POST` | `/saveToPlaylist` 🔒 | Tracks in eine Spotify-Playlist sichern. |

## Spotify (party-scoped) — `/api/party/{partyId}/spotify`

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/login` | Einstieg in den Spotify-OAuth-Flow. |
| `GET` | `/token` | Aktuelles Access-Token (für das Web Playback SDK). |
| `GET` | `/status` | Auth-/Playback-Status-Flags. |
| `GET` | `/deviceId` | Registrierte Spotify-Device-ID (`text/plain`). |
| `PUT` | `/deviceId` | Device-ID registrieren (TV/Startpage); setzt Wiedergabe an aktueller Position fort. |

## Spotify (global) — `/api/spotify`

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/callback?code=&state=` | OAuth-Callback (Web-Flow). |
| `GET` | `/ios/callback` | OAuth-Callback (iOS-Flow). |
| `GET` | `/events?source=&partyId=` | **SSE-Stream** (`text/event-stream`). Siehe [Realtime / SSE](../realtime-sse/). |

## Fehler & Statuscodes

- `401` – fehlender Host-Header bzw. abgelaufene Spotify-Sitzung
  (`"Spotify-Sitzung abgelaufen. Bitte neu anmelden."`).
- `403` – falscher Host-PIN.
- `404` – unbekannte oder beendete Party.
- Fachliche Ablehnungen kommen als deutsche Klartext-Meldungen zurück, z. B.
  `"Nicht erlaubt."`, `"Song ist schon in der Warteschlange."`,
  `"Zu viele Anfragen — bitte kurz warten."` – diese **verbatim** anzeigen.
