---
title: Authentifizierung & Autorisierung
description: Host-PIN, Geräte-Identität, Guards und Filter
tags: [ Developer ]
weight: 50
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
---

Es gibt **keine Benutzerkonten**. Zwei Mechanismen regeln Identität und Rechte:
ein **Host-PIN** für privilegierte Aktionen und eine anonyme **`deviceId`** für Gäste.

## Host-Autorisierung (Backend)

Privilegierte Endpunkte sind mit **`@HostOnly`** annotiert (Pause, Resume, Skip, Start, Remove,
Play, SaveToPlaylist, Party beenden). Der **`HostAuthFilter`** prüft jede solche Anfrage:

- Header `Authorization: Bearer <hostPin>` erforderlich.
- **Fehlt** der Header → **HTTP 401**.
- **Falscher** Host-PIN → **HTTP 403**.
- **Korrekter** Host-PIN → Anfrage wird normal verarbeitet.

Der Host-PIN wird beim Erstellen der Party generiert (`host_pin`, eigener 5-stelliger PIN, vom
Gast-PIN verschieden) und ist nur unter aktiven Partys eindeutig.

## Host-Autorisierung (Frontend)

- **`host-auth.interceptor.ts`** hängt `Authorization: Bearer <hostPin>` automatisch an **jede**
  HTTP-Anfrage an, sobald ein Host-PIN im `localStorage` liegt. Gäste (kein PIN) senden keinen Header.
- **`host.guard.ts`** schützt die Host-Routen (`startpage`, `dashboard`, `voting-host`,
  `search-host`): ohne gespeicherten Host-PIN → Redirect auf `/`.

## Anonyme Gäste — `deviceId`

Gäste registrieren sich nicht. Jeder Client erzeugt einmalig eine `deviceId` (UUID) und speichert
sie dauerhaft:

- **Web:** `localStorage` **und** ein langlebiges Cookie (≥ 1 Jahr) – das Löschen nur einer Quelle
  erzeugt keine neue Identität.
- **iOS:** `UserDefaults`, übersteht App-Neustarts.

Die `deviceId` erzwingt **ein Like pro Gerät/Song** (Unique-Constraint `(queue_entry_id, device_id)`,
siehe [Datenbankschema](../database-schema/)) und liefert `hasVoted` beim Queue-Abruf.

## Provider-Login (party-scoped)

Der Host authentifiziert sich beim Erstellen über Spotify-OAuth. Tokens sind **pro Party** gespeichert
und werden beim Party-Ende gelöscht – Details unter [Spotify-Integration](../spotify-integration/).

## SSE-Scoping

SSE-Events mit `partyId` werden nur an Clients mit passendem `partyId`-Query ausgeliefert – so
sieht ein Client keine Events fremder Partys (siehe [Realtime / SSE](../realtime-sse/)).
