---
title: Backend
description: Aufbau des Quarkus-Backends – Packages und Kernklassen
tags: [ Developer ]
weight: 20
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
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
  Party-Info und QR-Code-PNG (`/{id}/qr`).
- **`TrackResource`** – Queue, Voting und Playback-Steuerung unter
  `/api/party/{partyId}/track` (Suche, Queue lesen, hinzufügen, entfernen, vote, start/pause/
  resume/next, current, progress).
- **`SpotifyTokenResource`** – Token-Abruf, Status, Geräte-Registrierung (`PUT/GET /deviceId`) und
  Login-Einstieg unter `/api/party/{partyId}/spotify`.
- **`SpotifyCallbackResource`** – OAuth-Callbacks (Web + iOS) und der **SSE-Stream** `/api/spotify/events`.
- **`SpotifyCredentials`** – hält pro Party Access-/Refresh-Token, `deviceId`, Ablaufzeit und
  `lastPlaybackActive`. Basis für Token-Refresh und `deviceActive`.
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
