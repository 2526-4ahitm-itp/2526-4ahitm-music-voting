---
title: Spotify-Integration
description: OAuth, Token-Refresh, Geräte-Registrierung und Web Playback SDK
tags: [ Developer ]
weight: 70
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
---

Spotify ist über das `MusicProvider`-Interface angebunden (`SpotifyMusicProvider`,
ausgewählt per `MusicProviderFactory`). Pro Party hält `SpotifyCredentials` Access-/Refresh-Token,
Ablaufzeit, `deviceId` und `lastPlaybackActive`.

> [!IMPORTANT]
> Spotify-Wiedergabe erfordert ein **Premium**-Konto des Hosts (Playback-API ist Premium-only).

## OAuth-Flow

1. Host erstellt die Party (`POST /api/party`) und geht zu `GET /api/party/{id}/spotify/login`.
2. Login leitet zur Spotify-Consent-Seite weiter (`state` trägt den Party-Bezug).
3. Spotify ruft `GET /api/spotify/callback?code=&state=` (Web) bzw. `/api/spotify/ios/callback` (iOS).
4. Das Backend tauscht den `code` gegen Access-/Refresh-Token und bindet sie **an diese Party**.

Tokens sind **party-scoped**: nicht zwischen Partys geteilt, beim Party-Ende gelöscht. Eine neue
Party erfordert einen neuen Login.

{{< plantuml id="oauth" >}}
@startuml
skinparam shadowing false
actor Host
participant Frontend
participant Backend
participant Spotify

Host -> Frontend : Party erstellen
Frontend -> Backend : POST /api/party {provider}
Backend --> Frontend : id, pin, hostPin, joinUrl
Frontend -> Backend : GET /party/{id}/spotify/login
Backend --> Host : Redirect zur Spotify-Consent-Seite
Host -> Spotify : Login & Zustimmung
Spotify -> Backend : GET /api/spotify/callback?code&state
Backend -> Spotify : code -> Access- & Refresh-Token
Spotify --> Backend : Tokens (party-scoped gespeichert)
Backend --> Frontend : login-success (SSE)
note over Backend, Spotify
  Danach: Token-Refresh automatisch
  (proaktiv < 60 s vor Ablauf / reaktiv bei HTTP 401)
end note
@enduml
{{< /plantuml >}}

## Automatischer Token-Refresh

Ein Access-Token läuft nach ~1 h ab. Damit eine Party länger als eine Stunde ohne Host-Eingriff
läuft:

- **Proaktiv:** Läuft das Token in < 60 s ab, erneuert das Backend es vor der nächsten Anfrage.
- **Reaktiv:** Bei HTTP 401 von Spotify erneuert das Backend das Token einmal per Refresh-Token und
  wiederholt den Request.
- **Fehlschlag:** Schlägt der Refresh fehl (Token widerrufen), liefert das Backend 401 mit
  `"Spotify-Sitzung abgelaufen. Bitte neu anmelden."` – der Host muss die Party neu starten.

## Wiedergabe & Geräte-Registrierung

- Die **Startpage/TV** lädt das **Spotify Web Playback SDK** (Token über
  `GET /api/party/{id}/spotify/token`) und registriert ein Playback-Gerät via
  `PUT /api/party/{id}/spotify/deviceId`.
- `deviceActive` (in `GET /track/current`) ist `true`, sobald eine nicht-leere `deviceId` registriert
  ist. Solange `false`, sind Host-Controls gesperrt.
- **Re-Registrierung setzt fort, statt zurückzuspulen:** `restoreCurrentTrackOnDevice` berechnet die
  aktuelle Position (`pausedPositionMs` bzw. `now() − playbackStartedAt`) und spielt den aktuellen
  Track mit `position_ms` an dieser Stelle; danach `track-changed`-Event.

## Wichtig

- `GET /track/current` ruft **nicht** Spotifys „currently-playing“-API auf – der aktuelle Track und
  der Fortschritt kommen aus der DB (`currently_playing_entry_id`, `playback_started_at`,
  `paused_position_ms`).
- Die Queue wird **nie** aus der Spotify-Playlist gelesen; die DB ist die Quelle der Wahrheit.
