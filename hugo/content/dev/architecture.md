---
title: Architektur
description: Systemüberblick, Komponenten und Datenfluss
tags: [ Developer ]
weight: 10
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
---

## Überblick

MusicVoting besteht aus einem **Quarkus-Backend**, einem **Angular-Frontend** (mit drei
Rollen-Ansichten), einer **PostgreSQL**-Datenbank und einer optionalen **SwiftUI-iOS-App**.
Die Musik wird über den **Spotify Web Playback SDK** im Browser des Monitors/TVs abgespielt.

{{< plantuml id="arch" >}}
@startuml
skinparam componentStyle rectangle
skinparam shadowing false

actor "Gäste" as guests
actor "Host" as host

package "Angular-Frontend" as fe {
  [Guest / Voting] as gv
  [Host-Dashboard] as hd
  [Startpage / TV\n(Web Playback SDK)] as tv
}

node "iOS-App\n(optional)" as ios

package "Quarkus-Backend" as be {
  [endpoints] as ep
  [service] as svc
  [provider] as prov
  [scheduler\n(Auto-Expiry)] as sch
}

database "PostgreSQL 16\nparty · queue_entry · vote" as db
cloud "Spotify\nWeb API + OAuth" as sp

guests --> fe
host --> fe
ios --> ep : REST + SSE
fe --> ep : REST + SSE (/api)
ep --> svc
svc --> prov
svc --> db : Panache / JDBC
prov --> sp : HTTPS
tv --> sp : Playback (SDK)
@enduml
{{< /plantuml >}}

## Komponenten

| Komponente | Technologie | Aufgabe |
|---|---|---|
| Backend | Quarkus (Java 21), JAX-RS, SSE | API, Party-Lebenszyklus, Provider-Anbindung |
| Frontend | Angular | Guest-, Host- und TV-Ansichten |
| Datenbank | PostgreSQL 16, Hibernate ORM Panache | Persistenz von Party, Queue, Votes |
| Mobile | SwiftUI (iOS) | Native Guest- und Admin-Ansicht (optional) |
| Provider | Spotify Web API + Web Playback SDK | Suche und Wiedergabe |

## Wichtige Architekturentscheidungen

- **DB ist die Quelle der Wahrheit.** Queue, aktueller Track und Fortschritt kommen aus der
  Datenbank, **nicht** aus Spotify. `GET /track/current` ruft die Spotify-„currently-playing“-API
  nicht auf (siehe [Datenbankschema](../database-schema/) und die Playback-Spec).
- **`Party` vs. `PartyEntity`.** `Party` ist die In-Memory-Repräsentation in der `PartyRegistry`,
  `PartyEntity` die Panache-Entity der DB-Tabelle `party`. Sie sind **bewusst getrennt** und werden
  nicht zusammengeführt.
- **Restart-fest.** Endpunkte lösen eine Party bei Bedarf aus der DB auf, wenn sie nicht in der
  In-Memory-Registry liegt – ein Backend-Neustart führt nicht zu 404.
- **Ein Provider pro Party.** Über `ProviderKind` (Spotify implementiert, YouTube vorgesehen),
  abstrahiert durch das `MusicProvider`-Interface und die `MusicProviderFactory`.
- **Live-Updates über SSE**, nicht über Polling (siehe [Realtime / SSE](../realtime-sse/)).

## Datenfluss (Beispiel: Gast fügt einen Song hinzu)

1. Gast sucht (`GET /api/party/{id}/track/search?q=…`) → Spotify-Treffer.
2. Gast tippt „+“ → `POST /api/party/{id}/track/addToPlaylist`.
3. Backend schreibt eine `queue_entry`-Zeile und sendet ein `queue-updated`-SSE-Event.
4. Alle verbundenen Clients (TV, Host, andere Gäste) laden die Queue neu.

## Hintergrundprozesse

- **`PartyExpiryScheduler`** beendet Partys automatisch nach 2 Tagen und löscht beendete Partys
  1 Monat nach `endedAt` (siehe [Datenbankschema](../database-schema/)).
