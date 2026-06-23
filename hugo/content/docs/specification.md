---
title: Spezifikation für MusicVoting
description: Vollständige Spezifikation der Web-Anwendung
tags: [ Docs ]
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
authors:
  - simone
---


# Ziel
MusicVoting ist eine Web-Anwendung für Partys. Gäste können über ihr Smartphone Musikwünsche abgeben und über Likes darüber abstimmen, welche Songs als Nächstes laufen. Auf dem Monitor/TV läuft ein Dashboard, das die Musik abspielt und live anzeigt, was gerade spielt und was als Nächstes dran ist.

> [!NOTE]
> Diese Seite ist die zusammengefasste, lesbare Fassung. Die verbindliche Quelle der Wahrheit sind die einzelnen Spezifikationen unter `openspec/specs/` im Repository (Domains: `party`, `provider`, `guest`, `host`, `queue`, `voting`, `search`, `playback`, `dashboard`, `ios-localization`).

---

# Grundprinzip
- Es gibt **pro Party genau eine Warteschlange** (Queue).
- Eine Party nutzt **genau einen Musik-Anbieter**: **Spotify** *oder* **YouTube** (kein Mischen, der Anbieter ist nach dem Erstellen fix).
- Gäste sind **anonym** (kein Name, kein Login). Jeder Gast bekommt eine anonyme Kennung.
- Gäste geben Wünsche ab und **liken** Songs. Die Songs mit den meisten Likes laufen zuerst.

---

# Rollen

## Gast (Smartphone)
- Tritt über einen **QR-Code** oder einen **5-stelligen PIN** der Party bei.
- Kann Songs suchen (abhängig vom Anbieter der Party).
- Kann Songs zur Warteschlange hinzufügen (mit Limit).
- Kann Songs liken und das Like wieder entfernen (Toggle).
- Landet nach dem Beitreten zuerst auf der **Voting-Ansicht**.

## Gastgeber (Host – Smartphone oder Laptop)
- Erstellt eine Party und wählt den Anbieter (Spotify/YouTube).
- Meldet sich beim Anbieter an (OAuth-Login gilt **nur für diese Party**).
- Steuert die Wiedergabe: Play/Pause/Resume, Skip, Songs entfernen, Blacklist pflegen, Party beenden.
- Die Host-Bedienelemente laufen **auf dem Gerät des Hosts** – niemals auf dem Monitor/TV.

## Monitor/TV (Startpage / Dashboard)
- Zeigt die Party und spielt die Musik **im Browser auf dem Monitor/TV** ab (Spotify Web Playback SDK).
- Zeigt dauerhaft QR-Code, aktuellen Song, Fortschritt (Zeitbalken) und die Warteschlange.
- Hat **keine Host-Bedienelemente** (kein Pause/Skip/Remove/Blacklist/Beenden).
- Zeigt **nicht** an, wer einen Song gewünscht hat.
- Verbindet sich nach einem Reload automatisch wieder mit der Party (**ohne erneute PIN-Eingabe**).

---

# Party-Lebenszyklus

## Erstellen
1. Host wählt auf einem eigenen Screen den Anbieter und erstellt die Party über `POST /api/party` (mit `provider`).
2. Das System erzeugt und speichert in der DB:
    - eine **Party-ID**,
    - einen **5-stelligen Gast-PIN** (`pin`),
    - einen **5-stelligen Host-PIN** (`hostPin`) – beide unterscheiden sich und sind unter allen aktiven Partys eindeutig,
    - eine **Join-URL** für den QR-Code.
3. Erst danach folgt der **OAuth-Login** beim Anbieter.
4. Der Host sieht den großen Gast-PIN und das per `GET /api/party/{id}/qr` geladene QR-Bild.

## Beitreten (Gast)
- QR-Code kodiert `<base-url>/join/<pin>`. Scannen öffnet die App unter `/join/<pin>`.
- Der PIN wird über `GET /api/party/join/{pin}` zur Party-ID aufgelöst.
- Ungültiger/beendeter PIN → Fehlermeldung („Party nicht gefunden.“), **kein** Zutritt.

## Beenden
- Der Host beendet über `DELETE /api/party/{id}` (mit Host-PIN im Authorization-Header).
- Dabei wird die Warteschlange geleert, alle Provider-Tokens gelöscht und ein `party-ended`-Event an alle verbundenen Clients gesendet.
- Host und Dashboard kehren zur Startseite zurück; die gespeicherte Party-ID wird gelöscht.

## Automatisches Ende & Aufräumen
- Eine Party, die nicht explizit beendet wurde, **endet automatisch nach 2 Tagen** (gleiche Wirkung wie das manuelle Beenden).
- Daten einer beendeten Party (Party-Zeile inkl. `queue_entry`/`vote`) werden **1 Monat nach `endedAt` endgültig gelöscht**.

## Robustheit
- **Alle** Endpunkte mit Party-ID lösen die Party bei Bedarf aus der DB auf – ein **Backend-Neustart** führt nicht zu 404.
- Unbekannte/beendete Party-IDs liefern weiterhin **HTTP 404**.

---

# Authentifizierung & Berechtigungen
- Host-Aktionen erfordern den **Host-PIN** als `Authorization: Bearer <hostPin>`-Header.
    - Fehlender Header → **401**, falscher PIN → **403**.
- Der Web-Client hängt diesen Header automatisch an **jede** Anfrage, sobald ein Host-PIN im `localStorage` liegt; Gäste senden keinen Header.
- Geschützte Host-Routen (`startpage`, `dashboard`, `voting-host`, `search-host`) sind durch einen Route-Guard gesichert: ohne gespeicherten Host-PIN → Weiterleitung auf `/`.
- Gäste können **nicht** pausieren, skippen, entfernen, die Blacklist ändern oder die Party beenden.

---

# Anbieter (Provider)
- Der Host authentifiziert sich beim Erstellen über den **OAuth-Flow** des gewählten Anbieters.
- Tokens sind **party-spezifisch** und werden beim Party-Ende gelöscht; sie werden **nicht** zwischen Partys geteilt.
- **Spotify** erfordert ein **Premium-Konto** des Hosts (Wiedergabe-API ist Premium-only); andernfalls klare Fehlermeldung.
- Bei **YouTube** gilt für Werbefreiheit nur **Best effort** – keine Garantie auf werbefreie Wiedergabe.

## Spotify-Token wird automatisch erneuert
- **Proaktiv:** Läuft das Token in < 60 s ab, erneuert das Backend es vor der nächsten Anfrage.
- **Reaktiv:** Bei HTTP 401 von Spotify erneuert das Backend das Token einmal mit dem Refresh-Token und wiederholt den Request.
- **Fehlschlag:** Schlägt die Erneuerung fehl, liefert das Backend 401 mit `"Spotify-Sitzung abgelaufen. Bitte neu anmelden."` – der Host muss die Party neu starten und sich neu anmelden.

---

# Regeln der Warteschlange

## Sortierung
Die Warteschlange ist DB-gestützt (die DB ist die einzige Quelle der Wahrheit; die Spotify-Playlist wird **nicht** ausgelesen) und wird bei jedem Lesen frisch sortiert:
1. **mehr Likes zuerst**,
2. bei gleicher Like-Zahl: **ältester Wunsch zuerst** (`added_at` aufsteigend).

Mit `?deviceId=...` enthält jeder Eintrag zusätzlich `hasVoted`.

## Keine Duplikate
- Ein Song darf pro Party nur **einmal** vorkommen (DB-Constraint auf `(party_id, track_uri)`).
- Beim Versuch, einen bereits vorhandenen Song hinzuzufügen: „**Song ist schon in der Warteschlange.**“

## Limit für Musikwünsche
- Pro Gast maximal **10 hinzugefügte Songs pro rollender Minute**.
- Bei Überschreitung: „**Zu viele Anfragen — bitte kurz warten.**“

## Songs nur über Suche
- Hinzufügen ausschließlich über das „+“ in den Suchergebnissen – **kein** Einfügen von Links/IDs.

## Live-Updates
- Bei Hinzufügen/Entfernen sendet das Backend ein `queue-updated`-Event; alle Clients laden die Queue neu.

---

# Likes / Voting
- Pro Gast **genau ein Like pro Song** – serverseitig über den `deviceId` und einen Unique-Constraint auf `(queue_entry_id, device_id)` erzwungen.
- Likes sind **togglebar** (erneutes Senden löscht die `vote`-Zeile).
- **Optimistic UI:** Herz und Zähler aktualisieren sofort; bei Server-Fehler wird zurückgesetzt.
- Jede Like-Änderung löst ein `vote-updated`-Event aus; alle Clients laden die Queue neu und sortieren ggf. um.

## Persistente Geräte-Identität
- Jeder Client erzeugt beim ersten Einsatz eine dauerhafte `deviceId` (UUID).
- **Web:** gespeichert in `localStorage` **und** in einem mindestens 1 Jahr gültigen Cookie (das Löschen nur einer der beiden Quellen erzeugt keine neue Identität).
- **iOS:** gespeichert in `UserDefaults`, übersteht App-Neustarts.

---

# Blacklist (pro Party)
- Der Host pflegt pro Party eine **Wortliste**.
- Beim Hinzufügen wird geprüft, ob ein Blacklist-Wort als **Teilstring** im Titel oder Künstlernamen vorkommt.
- Wenn geblockt, sieht der Gast: „**Nicht erlaubt.**“
- Bereits in der Queue stehende Songs werden bei einem neuen Blacklist-Wort **nicht** rückwirkend entfernt.

---

# Suche & Top-Charts
- Suche geht an den **Anbieter der Party** (kein Cross-Provider).
- Leeres Suchfeld → **Top 10** des Anbieters, **nicht landabhängig**.
- Ein Song, der bereits in der Queue ist, zeigt im Suchergebnis statt „+“ ein **deaktiviertes Häkchen**. Dieser Zustand ist für **alle** Clients live sichtbar und aktualisiert sich ohne Reload (auch zurück zu „+“, wenn der Song die Queue verlässt).

---

# Wiedergabe (Playback)
- Audio läuft **ausschließlich auf dem Monitor/TV** (Browser). Gast- und Host-Clients spielen **keinen** Ton.
- `GET /track/current` ist DB-basiert: `PartyEntity.currentlyPlayingEntryId` ist die einzige Quelle des aktuellen Songs – es wird **nicht** Spotifys „currently-playing“-API abgefragt.
- Fortschritt wird DB-seitig aus `playbackStartedAt`/`pausedPositionMs` berechnet (kein Spotify-Polling).
- **Geräteverfügbarkeit:** `GET /track/current` liefert `deviceActive`. Solange `false` (kein aktives Playback-Gerät), sind Play/Pause/Skip beim Host **deaktiviert** mit Hinweis, dass zuerst die Startpage/TV geöffnet werden muss; sie aktivieren sich automatisch, sobald ein Gerät registriert ist.
- **Weiterschalten:** Bei Songende (vom TV via SDK erkannt) oder Skip ruft das System `/track/next`, entfernt den Song aus der Queue und startet den nächsten gemäß Sortierung; danach folgt ein `track-changed`-Event. Es wird der erste Eintrag gewählt, dessen ID sich vom aktuellen unterscheidet; ein Doppel-Advance innerhalb von ~3 s wird verhindert.
- **Keine History:** Ein Song, der die Queue verlässt, kehrt nicht automatisch zurück.
- **Leere Queue:** Das Dashboard zeigt „**Warteschlange ist leer**“; die Wiedergabe stoppt/pausiert (anbieterabhängig).
- **Gerät neu registrieren:** Öffnet/lädt der TV die Startpage neu, setzt das Backend die Wiedergabe an der **aktuellen Position** fort (nicht 0:00) und sendet `track-changed`.
- **Party-Ende:** Erhält die Startpage `party-ended`, wird der SDK-Player **pausiert und getrennt**, bevor zur Startseite navigiert wird – kein Ton nach dem Ende.

> [!NOTE]
> Offene Frage: Verhalten bei leerer Queue – die Web-Spezifikation sagt „stoppen/pausieren“, der Swift-Entwurf sah früher „zufällige Top-Charts“ vor. Diese Frage ist noch nicht abschließend entschieden.

---

# Live-Updates via SSE
Alle Live-Aktualisierungen laufen über **Server-Sent Events** auf `/api/spotify/events?source=web&partyId={id}` – SSE ist der primäre Pfad (kein reines Polling).

| Event | Wirkung |
|---|---|
| `queue-updated` | Queue neu laden (`GET /track/queue`) |
| `vote-updated` | Queue neu laden (Like-Zahlen / Sortierung) |
| `track-changed` | Aktuellen Song (`GET /track/current`) und Queue neu laden |
| `progress` | Fortschrittsbalken aktualisieren (`position`, `duration`, `paused`) |
| `party-ended` | Zur Startseite navigieren (nur wenn `partyId` passt) |

- **Party-scoped:** Events mit `partyId` werden nur an Clients mit passendem `partyId`-Query ausgeliefert (gilt für `progress`, `queue-updated`, `track-changed`, `vote-updated`, `party-ended`).
- **Fortschritts-Relay:** Nur der TV-Player kennt die echte Position. Er sendet ~1×/Sekunde `POST /track/progress` `{position, duration, paused}`; das Backend verteilt dies als `progress`-Event. Host- und iOS-Clients spiegeln daraus ihren Fortschrittsbalken (kein eigener Spotify-Call).

---

# Dashboard-Anzeige (Monitor/TV)
Dauerhaft gleichzeitig sichtbar:
- **QR-Code** zum Beitreten,
- **aktueller Song:** Cover, Titel, Künstler,
- **animierter Zeitbalken** mit Zeit `mm:ss / mm:ss` (folgt der vom SDK gemeldeten Position),
- **Warteschlange:** Cover, Titel, Künstler, Like-Zahl pro Eintrag, sortiert nach den Queue-Regeln.

Nicht vorhanden: jegliche Host-Bedienelemente sowie jede Anzeige, **wer** einen Song gewünscht hat. Queue und „Now Playing“ aktualisieren sich ohne Reload.

---

# Stabilität & Reconnect
- Alle Clients (Host, Gäste, Dashboard) reconnecten bei Verbindungsproblemen automatisch und laden danach den aktuellen Stand (Party-Status, Queue, Wiedergabe, Likes) neu.
- Das Dashboard verbindet sich nach einem Reload **ohne erneute PIN-Eingabe** wieder.

---

# Akzeptanzkriterien (Checkliste)
1. Gäste können per QR-Code **oder** 5-stelligem PIN beitreten und sehen Updates live.
2. Pro Gast maximal 10 Songs pro Minute; darüber wird mit deutscher Meldung geblockt.
3. Duplikate werden DB-seitig verhindert und sauber gemeldet.
4. Blacklist blockiert Songs (Teilstring) und zeigt „Nicht erlaubt.“
5. Likes sind togglebar (1 pro Gast/Song, serverseitig erzwungen) und aktualisieren live.
6. Sortierung ist immer: Likes desc, dann ältester zuerst.
7. Nur der Host (mit Host-PIN) kann entfernen/pausieren/skippen/beenden.
8. Dashboard spielt auf dem Monitor und zeigt animierten, synchronen Fortschritt.
9. Dashboard reconnectet nach Reload ohne PIN.
10. Bei Netzproblemen reconnecten alle Clients automatisch und synchronisieren sich.
11. Eine Party endet automatisch nach 2 Tagen; Daten werden 1 Monat nach Ende gelöscht.
12. Spotify-Tokens werden automatisch erneuert; eine Party überlebt mehr als eine Stunde ohne Host-Eingriff.
