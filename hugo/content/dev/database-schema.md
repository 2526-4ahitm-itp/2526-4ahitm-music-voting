---
title: Datenbankschema
description: Tabellen, Beziehungen und Constraints (PostgreSQL)
tags: [ Developer ]
weight: 30
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
---

PostgreSQL 16. Das Schema wird beim ersten Start aus
`musicvoting/backend/setup.sql` initialisiert (Hibernate generiert es **nicht**).

## Tabellen

### `party`
Eine Party (Top-Level-Aggregat).

| Spalte | Typ | Hinweise |
|---|---|---|
| `id` | `VARCHAR` PK | Party-ID |
| `provider_kind` | `VARCHAR` NOT NULL | `spotify` / `youtube` |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` |
| `pin` | `VARCHAR(5)` | Gast-PIN |
| `host_pin` | `VARCHAR(5)` | Host-PIN |
| `ended_at` | `TIMESTAMPTZ` | `NULL` = aktiv |
| `currently_playing_entry_id` | `UUID` → `queue_entry(id)` | aktueller Song; `ON DELETE SET NULL` |
| `playback_started_at` | `TIMESTAMPTZ` | Basis für DB-berechneten Fortschritt |
| `paused_position_ms` | `BIGINT` | Position bei Pause |

### `queue_entry`
Ein Song in der Warteschlange einer Party.

| Spalte | Typ | Hinweise |
|---|---|---|
| `id` | `UUID` PK | Default `gen_random_uuid()` |
| `party_id` | `VARCHAR` → `party(id)` | `ON DELETE CASCADE` |
| `track_uri` | `VARCHAR` NOT NULL | Spotify-URI |
| `track_name` | `VARCHAR` NOT NULL | |
| `artist_name` | `VARCHAR` NOT NULL | |
| `album_name` | `VARCHAR` | |
| `image_url` | `TEXT` | Cover |
| `duration_ms` | `INTEGER` | |
| `added_at` | `TIMESTAMPTZ` | Default `NOW()` – FIFO-Tiebreak |
| | | **UNIQUE (`party_id`, `track_uri`)** → keine Duplikate |

### `vote`
Ein Like eines Geräts für einen Queue-Eintrag.

| Spalte | Typ | Hinweise |
|---|---|---|
| `id` | `UUID` PK | |
| `queue_entry_id` | `UUID` → `queue_entry(id)` | `ON DELETE CASCADE` |
| `device_id` | `VARCHAR` NOT NULL | anonyme Geräte-Identität |
| `voted_at` | `TIMESTAMPTZ` | Default `NOW()` |
| | | **UNIQUE (`queue_entry_id`, `device_id`)** → ein Like pro Gerät/Song |

## Beziehungen

{{< plantuml id="er" >}}
@startuml
hide circle
skinparam linetype ortho
skinparam shadowing false

entity "party" as party {
  * id : VARCHAR <<PK>>
  --
  provider_kind
  pin / host_pin
  created_at / ended_at
  currently_playing_entry_id : UUID <<FK>>
  playback_started_at
  paused_position_ms
}

entity "queue_entry" as qe {
  * id : UUID <<PK>>
  --
  party_id : VARCHAR <<FK>>
  track_uri
  track_name / artist_name
  album_name / image_url
  duration_ms / added_at
}

entity "vote" as vote {
  * id : UUID <<PK>>
  --
  queue_entry_id : UUID <<FK>>
  device_id
  voted_at
}

party ||--o{ qe : "party_id (CASCADE)"
qe ||--o{ vote : "queue_entry_id (CASCADE)"
party }o..|| qe : "currently_playing (SET NULL)"
@enduml
{{< /plantuml >}}

- `party → queue_entry`: `ON DELETE CASCADE` (Party beenden leert die Queue).
- `queue_entry → vote`: `ON DELETE CASCADE`.
- `party.currently_playing_entry_id → queue_entry`: `ON DELETE SET NULL` (zirkuläre Referenz,
  wird in `setup.sql` per `ALTER TABLE` nach Anlegen von `queue_entry` ergänzt).

## Eindeutige PINs nur für aktive Partys

```sql
CREATE UNIQUE INDEX party_pin_active_idx      ON party (pin)      WHERE ended_at IS NULL;
CREATE UNIQUE INDEX party_host_pin_active_idx ON party (host_pin) WHERE ended_at IS NULL;
```

Partielle Unique-Indizes: PINs müssen nur **unter aktiven** Partys eindeutig sein; eine beendete
Party gibt ihren PIN-Slot wieder frei.

## Sortierung der Queue

Nicht im Schema, sondern beim Lesen berechnet: **Likes desc**, bei Gleichstand `added_at`
aufsteigend (FIFO). Mit `?deviceId=` liefert `GET /track/queue` zusätzlich `hasVoted` pro Eintrag.

## Aufräum-Lebenszyklus

Über den `PartyExpiryScheduler`:
- **Auto-Ende nach 2 Tagen**: Queue leeren, Tokens löschen, `ended_at` setzen, `party-ended`-Event.
- **Purge nach 1 Monat** (`ended_at`): `party`-Zeile löschen → `queue_entry`/`vote` kaskadieren.
