---
title: Realtime / SSE-Events
description: Live-Updates über Server-Sent Events
tags: [ Developer ]
weight: 60
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
---

Live-Updates laufen über **Server-Sent Events** (kein WebSocket, kein reines Polling).
Der Stream ist `GET /api/spotify/events?source={web|ios}&partyId={id}`
(`SpotifyCallbackResource#events`, liefert ein `Multi<LoginEvent>`). Events werden über den
**`LoginEventBus`** verteilt.

## Event-Typen

| Event | Auslöser | Reaktion der Clients |
|---|---|---|
| `queue-updated` | Song hinzugefügt/entfernt | Queue neu laden (`GET /track/queue`) |
| `vote-updated` | Like hinzugefügt/entfernt | Queue neu laden (Like-Zahlen / Sortierung) |
| `track-changed` | `/track/next` oder `/track/start` | aktuellen Track **und** Queue neu laden |
| `progress` | TV-Player sendet Position | Fortschrittsbalken aktualisieren |
| `party-ended` | Party beendet (manuell/Auto-Expiry) | zur Startseite, Session löschen |
| `login-success` | Provider-Login abgeschlossen | Player initialisieren (siehe Hinweis) |

## Party-Scoping

Jedes Event mit `partyId` wird **nur** an Clients mit passendem `partyId`-Query ausgeliefert
(`progress`, `queue-updated`, `track-changed`, `vote-updated`, `party-ended`). Ein Client ohne
`partyId`-Query kann als Fallback alle Events dieses Typs erhalten.

- Der **Web**-Zweig liefert party-scoped Events an passende `partyId`.
- Der **iOS**-Zweig liefert dieselben party-scoped Events plus `party-ended` und per
  `installationId` adressierte Events; iOS muss `partyId` mitschicken.

## Fortschritts-Relay

Nur der **TV-Player** (Startpage) kennt die echte Track-Position (Web Playback SDK). Er sendet
~1×/Sekunde `POST /api/party/{id}/track/progress` mit `{position, duration, paused}`. Das Backend
re-broadcastet das als `progress`-Event (Werte als Strings, plus `source=web` und `partyId`).
Host- und iOS-Clients **spiegeln** daraus ihren Fortschrittsbalken, ohne selbst Spotify abzufragen.

`POST /track/progress` ist **best-effort**: es verändert keine Wiedergabe und ruft Spotify nicht auf;
ein Fehler stört die Wiedergabe nicht.

> [!NOTE]
> Ein iOS-Login sendet nur ein `source=ios`-Event, **kein** `login-success` mit `source=web` –
> sonst würde der Web-Player unnötig neu initialisiert.
