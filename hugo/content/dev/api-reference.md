---
title: REST-API
description: Alle Backend-Endpunkte
tags: [ Developer ]
weight: 40
showDate: true
date: 2026-06-23
lastmod: 2026-09-28
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
| `PUT` | `/api/party/{id}/default-playlist` 🔒 | Standard-Playlist für den Auto-Refill setzen. Body `{"playlistId":"…"}`; leer/`null` entfernt sie. Wird in `party.default_playlist_id` gespeichert. |
| `GET` | `/api/party/{id}/qr` | QR-Code als **PNG** (`image/png`), kodiert die Join-URL. |

## Track / Queue / Playback — `/api/party/{partyId}/track`

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/search?q=` | Suche beim Provider; leeres `q` → Top-Charts. |
| `GET` | `/{id}` | Einzelnen Track abrufen. |
| `GET` | `/queue?deviceId=` | Sortierte Queue; mit `deviceId` zusätzlich `hasVoted` pro Eintrag. |
| `POST` | `/addToPlaylist` | Song(s) zur Queue hinzufügen. Body: Liste von URIs. Ist der Song bereits **wartend** in der Queue → `409` „Song ist schon in der Warteschlange.“ (der gerade spielende Song darf erneut hinzugefügt werden). |
| `DELETE` | `/remove` 🔒 | Song aus der Queue entfernen. |
| `POST` | `/vote` | Like umschalten (Body mit `deviceId`). |
| `POST` | `/start` 🔒 | Wiedergabe aus der Queue starten. |
| `POST` | `/pause` 🔒 | Pausieren. |
| `POST` | `/resume` 🔒 | Fortsetzen – spielt den **aktuellen** Song per URI an der pausierten Position (kein „nacktes“ Resume). |
| `POST` | `/next` 🔒 | Zum nächsten Song (Skip / Song-Ende). Committet bei `2xx` von Spotify und setzt die URI nach ~700 ms erneut ab (siehe [Spotify-Integration](../spotify-integration/)). |
| `POST` | `/prepare-next` 🔒 | Wird vom Player ~3 s vor Songende aufgerufen: füllt **einen** Song nach, falls die Queue sonst leer würde (Auto-Refill). `204`. |
| `GET` | `/current` | Aktueller Track inkl. `isPlaying`, `progressMs`, `deviceActive`. |
| `POST` | `/progress` | Fortschritts-Relay des TV-Players (`{position,duration,paused}`); best-effort. |
| `PUT` | `/play` 🔒 | Konkreten Track abspielen. |
| `POST` | `/saveToPlaylist` 🔒 | Tracks in eine Spotify-Playlist sichern. |

## Spotify (party-scoped) — `/api/party/{partyId}/spotify`

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/login` | Einstieg in den Spotify-OAuth-Flow. |
| `GET` | `/token` | Aktuelles Access-Token (für das Web Playback SDK). |
| `GET` | `/status` | `{"loggedIn": bool}`. Ein gespeicherter Refresh-Token zählt als eingeloggt. |
| `GET` | `/playlists` 🔒 | Spotify-Playlists des Hosts (für die Standard-Playlist-Auswahl). |
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
- `409` – Song wartet bereits in der Queue (`{"error":"Song ist schon in der Warteschlange."}`).
- Fachliche Ablehnungen kommen als deutsche Klartext-Meldungen zurück – diese **verbatim** anzeigen.

> [!NOTE]
> `"Nicht erlaubt."` (Blacklist) und `"Zu viele Anfragen — bitte kurz warten."` (10 Songs/Minute) sind
> in `openspec/specs/` festgelegt, im Backend aber **noch nicht umgesetzt**.
