---
title: REST-API
description: Alle Backend-Endpunkte
tags: [ Developer ]
weight: 40
showDate: true
date: 2026-06-23
lastmod: 2026-11-02
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
| `GET` | `/search?q=&audience=` | Suche beim Provider; leeres `q` → Top-Charts. Jedes Ergebnis in `tracks.items` hat zusätzlich `blocked: true/false` (Blacklist der Party, ohne Begründung). Mit `audience=guest` (Gast-Suche im Web) werden Songs gesperrter Artists entfernt und `hiddenHint` gesetzt: `ARTIST` (Suchbegriff = Name eines gesperrten Artists), `SOME` (andere Songs entfernt) oder `null`. |
| `GET` | `/{id}` | Einzelnen Track abrufen. |
| `GET` | `/queue?deviceId=` | Sortierte Queue; mit `deviceId` zusätzlich `hasVoted` pro Eintrag. |
| `POST` | `/addToPlaylist` | Song(s) zur Queue hinzufügen. Body: Liste von URIs. Ist der Song bereits **wartend** in der Queue → `409` „Song ist schon in der Warteschlange.“ (der gerade spielende Song darf erneut hinzugefügt werden). Steht der Song auf der Blacklist → `403` „Nicht erlaubt.“ |
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

## Blacklist — `/api/party/{partyId}/blacklist`

Alle Endpunkte sind 🔒. Einträge: `{id, kind, value, label, imageUrl}` mit `kind` = `WORD` (ganzes Wort, Groß-/Kleinschreibung egal), `ARTIST` (Spotify-Artist-ID) oder `TRACK` (Spotify-Track-URI). Gespeichert in `blacklist_entry`, gelöscht beim Party-Ende. Jedes erfolgreiche Hinzufügen (`201`) und Entfernen sendet das SSE-Event `blacklist-updated` (siehe [Realtime / SSE](../realtime-sse/)).

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/` | Alle Einträge der Party (älteste zuerst). |
| `POST` | `/` | Eintrag hinzufügen. Body `{"kind":"WORD","value":"live"}` (bei `ARTIST`/`TRACK` optional `label`, `imageUrl`). `201` neu, `200` bestehender Eintrag (doppelt), `400` ungültige Art oder leerer Wert. |
| `DELETE` | `/{entryId}` | Eintrag entfernen. `204`; `404` wenn unbekannt oder von einer anderen Party. |
| `GET` | `/artists?q=` | Künstlersuche für die Blacklist-Seite → `[{id, name, imageUrl}]`; leeres `q` → `[]`. |

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
- `403` – falscher Host-PIN, bzw. beim Hinzufügen eines Songs: Song steht auf der Blacklist (`{"error":"Nicht erlaubt."}`).
- `404` – unbekannte oder beendete Party.
- `409` – Song wartet bereits in der Queue (`{"error":"Song ist schon in der Warteschlange."}`).
- Fachliche Ablehnungen kommen als deutsche Klartext-Meldungen zurück – diese **verbatim** anzeigen.

> [!NOTE]
> `"Zu viele Anfragen — bitte kurz warten."` (10 Songs/Minute) ist in `openspec/specs/` festgelegt,
> im Backend aber **noch nicht umgesetzt**.
