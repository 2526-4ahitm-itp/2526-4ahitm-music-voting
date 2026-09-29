---
title: Backend
description: Aufbau des Quarkus-Backends – Packages und Kernklassen
tags: [ Developer ]
weight: 20
showDate: true
date: 2026-06-23
lastmod: 2026-09-28
---

Das Backend ist eine **Quarkus**-Anwendung (Java 21) unter `musicvoting/backend/`.
REST-Basis-Pfad ist `/api` (`RestConfig` mit `@ApplicationPath("api")`).

## Package-Struktur

```
at.htl
├── domain        # Datenmodell & Registry
│   ├── PartyEntity        # Panache-Entity der DB-Tabelle `party`
│   ├── Party              # In-Memory-Repräsentation (Registry)
│   ├── PartyId
│   ├── PartyRegistry      # aktive Partys im Speicher
│   ├── ProviderKind       # SPOTIFY | YOUTUBE
│   ├── QueueEntry         # Panache-Entity `queue_entry`
│   └── Vote               # Panache-Entity `vote`
├── endpoints     # JAX-RS-Ressourcen & SSE
│   ├── PartyResource          # /api/party
│   ├── TrackResource          # /api/party/{partyId}/track
│   ├── SpotifyTokenResource   # /api/party/{partyId}/spotify
│   ├── SpotifyCallbackResource# /api/spotify (callback, ios/callback, events)
│   ├── HostAuthFilter + @HostOnly  # Host-PIN-Prüfung
│   ├── LoginEventBus + LoginEvent  # SSE-Event-Bus
│   └── RestConfig             # @ApplicationPath("api")
├── model
│   └── Track                  # DTO für Suchtreffer / Tracks
├── provider      # Musik-Anbieter-Abstraktion
│   ├── MusicProvider          # Interface
│   ├── MusicProviderFactory
│   └── spotify
│       ├── SpotifyMusicProvider
│       └── SpotifyCredentials # Tokens, deviceId, Playback-State pro Party
├── scheduler
│   └── PartyExpiryScheduler   # Auto-Ende (2 Tage) + Purge (1 Monat)
└── service
    ├── PartyService           # Party-Logik (Erstellen, Beenden, Auflösen)
    └── SpotifyApiErrors       # Mapping von Spotify-Fehlern
```

## Kernklassen

- **`PartyResource`** – Party-Lebenszyklus: Erstellen (`POST /party`), Beenden
  (`DELETE /party/{id}`, host-only), PIN-Auflösung (`/join/{pin}`, `/host-join/{hostPin}`),
  Party-Info, QR-Code-PNG (`/{id}/qr`) und Standard-Playlist (`PUT /{id}/default-playlist`, host-only).
- **`TrackResource`** – Queue, Voting und Playback-Steuerung unter
  `/api/party/{partyId}/track` (Suche, Queue lesen, hinzufügen, entfernen, vote, start/pause/
  resume/next, prepare-next, current, progress).
- **`SpotifyTokenResource`** – Token-Abruf, Status, Host-Playlists (`/playlists`),
  Geräte-Registrierung (`PUT/GET /deviceId`) und Login-Einstieg unter `/api/party/{partyId}/spotify`.
- **`SpotifyCallbackResource`** – OAuth-Callbacks (Web + iOS) und der **SSE-Stream** `/api/spotify/events`.
- **`SpotifyCredentials`** – hält pro Party Access-/Refresh-Token, `deviceId`, Ablaufzeit und
  `lastPlaybackActive`. Basis für Token-Refresh und `deviceActive`. Der Refresh-Token wird über
  `PartyService#persistSpotifyRefreshToken` zusätzlich in der DB gespeichert.
- **`SpotifyMusicProvider`** – die gesamte Spotify-Logik: Suche, Queue (DB), Voting, Wiedergabe
  (`play`, `playNextAndRemove`, `resumePlayback` mit Re-Assert), Auto-Refill (`refillQueue`) und die
  `[playback …]`-Diagnose-Logs (`io.quarkus.logging.Log`). Details:
  [Spotify-Integration](../spotify-integration/).
- **`HostAuthFilter`** – prüft `@HostOnly`-Endpunkte gegen den Host-PIN (siehe
  [Authentifizierung](../authentication/)).

## Persistenz

Hibernate ORM mit Panache (`quarkus-hibernate-orm-panache`, `quarkus-jdbc-postgresql`).
Das Schema wird **nicht** von Hibernate generiert (`database.generation=none`), sondern aus
`musicvoting/backend/setup.sql` initialisiert (siehe [Datenbankschema](../database-schema/)).

> [!NOTE]
> `pom.xml` enthält bereits `quarkus-hibernate-orm-panache`, `quarkus-jdbc-postgresql` und
> `com.google.zxing` (QR-Codes) – diese nicht doppelt hinzufügen.

## Lokal starten

Siehe {{< article link="docs/runinstructions/" >}} – kurz: `cd musicvoting/backend && ./mvnw quarkus:dev`.

## Konfiguration

Wichtige Properties (lokal in `application.properties`, in Kubernetes als Env-Variablen):

| Property | Env-Variable | Zweck |
|---|---|---|
| `spotify.client.id` / `spotify.client.secret` | `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify-App |
| `spotify.redirect.uri` | `SPOTIFY_REDIRECT_URI` | OAuth-Callback (`…/api/spotify/callback`) |
| `spotify.web.redirect.uri` | `SPOTIFY_WEB_REDIRECT_URI` | Ziel nach Web-Login – **`…/select-playlist`** |
| `spotify.ios.redirect.uri` | `SPOTIFY_IOS_REDIRECT_URI` | `musicvotingapp://callback` |
| `spotify.market` | `SPOTIFY_MARKET` | Markt für „ähnliche Songs“ (Default `AT`) |
| `spotify.topcharts.playlist.id` | `SPOTIFY_TOPCHARTS_PLAYLIST_ID` | optionale Fallback-Playlist |
| `musicvoting.join.base-url` | `MUSICVOTING_JOIN_BASE_URL` | Basis-URL im QR-Code |

## Tests

`./mvnw test` im Backend-Ordner. HTTP zu Spotify wird nicht gemockt; testbare Logik liegt deshalb in
package-privaten statischen Helfern (z. B. `buildResumeBody`, `formatDevicesSnapshot`), die direkt
getestet werden.
