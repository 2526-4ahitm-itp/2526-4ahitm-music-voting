---
title: Spotify-Integration
description: OAuth, Token-Refresh, Geräte-Registrierung und Web Playback SDK
tags: [ Developer ]
weight: 70
showDate: true
date: 2026-06-23
lastmod: 2026-09-28
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
   Der **Refresh-Token** wird zusätzlich in `party.spotify_refresh_token` gespeichert.
5. Web: Redirect auf `spotify.web.redirect.uri` = **`/select-playlist?partyId=…`**. Dort wählt der Host
   eine Standard-Playlist (oder überspringt) und landet danach auf `/dashboard`.
   iOS: Redirect auf `musicvotingapp://callback?success=1`, danach der native Playlist-Picker.

Tokens sind **party-scoped**: nicht zwischen Partys geteilt. Eine neue Party erfordert einen neuen
Login.

## Login übersteht Backend-Neustarts

Access-Tokens liegen nur im Speicher (`SpotifyCredentials`), der Refresh-Token zusätzlich in der DB.
Nach einem Neustart (oder Quarkus-Dev-Reload) wird die Party aus der DB rekonstruiert und der
Refresh-Token zurückgeladen. `ensureValidToken` holt dann beim nächsten Aufruf ein neues Access-Token,
`GET …/spotify/status` meldet `loggedIn: true`. Rotiert Spotify den Refresh-Token, wird der neue
gespeichert.

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
Backend --> Host : Redirect /select-playlist
Host -> Backend : PUT /party/{id}/default-playlist (optional)
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

## Zuverlässige Wiedergabe

Drei Maßnahmen (Juli 2026) sorgen dafür, dass immer der **angezeigte** Song läuft:

- **Resume setzt den aktuellen Song neu.** `POST /track/resume` schickt `PUT /me/player/play` mit der
  URI des aktuellen Eintrags und `position_ms` = pausierte Position (`buildResumeBody`). Ein nacktes
  Resume würde spielen, was das Gerät gerade geladen hat – nach einem Auto-Advance oft noch der
  vorherige Song.
- **Advance committet bei `2xx`.** `/track/next` setzt `currently_playing_entry_id` sofort, wenn Spotify
  den Play-Befehl annimmt. Ein Abgleich mit `currently-playing` wurde verworfen: Spotify meldet dort
  noch sekundenlang den **vorherigen** Song und hätte gesunde Wechsel blockiert.
- **Re-Assert nach ~700 ms.** Direkt am Songende ist das SDK-Gerät kurz im Leerlauf und nimmt `play`
  mit `2xx` an, ohne zu wechseln. Deshalb sendet `reassertPlay` dieselbe URI nach 700 ms noch einmal
  (mit `position_ms`). Es wird **nie** ein Geräte-Transfer benutzt – der würde den alten Spotify-Kontext
  fortsetzen und den falschen Song spielen.

### Diagnose-Logs

Jede Start/Stop-Operation (`START`, `NEXT`, `PLAY`, `PAUSE`, `RESUME`) schreibt eine INFO-Zeile:

```
[playback NEXT] party=… | queue=[name | uri | id ;; …] | current=… | next=… | device=<uri> | is_playing=…
```

Beim Advance zusätzlich die aufgelöste Device-ID und ein Snapshot von `/me/player/devices`. Die Logs
sind best-effort und ändern nie das Ergebnis der Operation.

## Auto-Refill (leere Queue)

Würde die Queue leer, fügt das Backend **einen** Song hinzu (`refillQueue`, markiert als
`autofilled`). Der Player ruft dafür ~3 s vor Songende `POST /track/prepare-next` auf; `/track/next`
hat zusätzlich einen Fallback. Quellen in dieser Reihenfolge:

1. **Standard-Playlist** des Hosts (`default_playlist_id`),
2. **ähnliche Songs** – Top-Tracks der Künstler dieser Party (`/v1/artists/{id}/top-tracks`, Markt
   `spotify.market`),
3. **Top-Charts-Playlist** (`spotify.topcharts.playlist.id`, optional),
4. **Suche** (`/v1/search`) nach dem aktuellen Künstler, dann eine breite Jahres-Suche.

> [!NOTE]
> `/v1/recommendations` und Spotifys eigene Editorial-Playlists (`37i9dQZEV…`) liefern für neue Apps
> `404` bzw. nichts – deshalb die Top-Tracks und die Suche als Rückfall. Eine Playlist als
> Top-Charts-Quelle muss **öffentlich und nutzereigen** sein.

Auto-Refill-Songs sortieren **unter** allen Gast-Songs; Gäste können sie trotzdem liken.

## Wichtig

- `GET /track/current` ruft **nicht** Spotifys „currently-playing“-API auf – der aktuelle Track und
  der Fortschritt kommen aus der DB (`currently_playing_entry_id`, `playback_started_at`,
  `paused_position_ms`).
- Die Queue wird **nie** aus der Spotify-Playlist gelesen; die DB ist die Quelle der Wahrheit.
