---
title: Spezifikation für Mobile Computing (Swift)
description: Spezifikation der iOS-App
tags: [ Docs, Swift ]
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
authors:
  - simone
---


<br>
<br>

# Ziel

## Allgemeines Ziel
MusicVoting ist eine Web-Anwendung für Partys. Gäste können über ihr Smartphone Musikwünsche abgeben und über Likes darüber abstimmen, welche Songs als Nächstes laufen. Auf dem Monitor/TV läuft ein Dashboard, das die Musik abspielt und live anzeigt, was gerade spielt und was als Nächstes dran ist.

### Gesamte Spezifikation
Die fachlichen Regeln (Queue, Voting, Suche, Playback, Party-Lebenszyklus, Auth) gelten plattformübergreifend und sind in der allgemeinen Spezifikation beschrieben:
{{< article link="docs/specification/" >}}

Diese Seite beschreibt nur die **iOS-/Swift-spezifischen** Ergänzungen und Abweichungen.

## Ziel der Swift-App
Die Swift-App ist die mobile Version der Webanwendung. Sie ermöglicht Gästen, mit einer nativen App an der Musikauswahl teilzunehmen, und dem Host, die Wiedergabe vom iPhone aus zu steuern. Die App ist **optional** (Zusatzfeature) und nicht zwingend erforderlich.

> [!IMPORTANT]
> Der Monitor/TV „existiert“ in der Swift-App nicht als eigene Rolle.
> Damit der Nutzer dieselben Informationen wie am Monitor/TV sieht,
> zeigt die App in der Admin-Ansicht denselben Stand an (aktueller Song,
> Fortschritt, Queue, QR-Code), den auch das TV-Dashboard zeigt.

---

# Grundprinzip
- Es gibt **pro Party genau eine Warteschlange** (Queue).
- Eine Party nutzt **genau einen Musik-Anbieter** (Spotify oder YouTube), beim Erstellen vom Host gewählt und danach fix.
- Gäste sind **anonym** – kein Name, kein Login. Die anonyme Kennung verwaltet das Backend; jedes Gerät hat eine persistente `deviceId`.
- Gäste geben Wünsche ab und **liken** Songs. Songs mit den meisten Likes laufen zuerst.

---

# Benutzerrollen

## Gast
- Tritt über **QR-Code** oder **5-stelligen PIN** der Party bei.
- Kann Songs suchen (abhängig vom Anbieter), zur Queue hinzufügen (mit Limit) und liken (Toggle).

## Gastgeber (Host / Admin-Ansicht)
- Erstellt eine Party und wählt den Anbieter.
- Meldet sich beim Anbieter an (OAuth, gilt **nur für diese Party**).
- Steuert die Wiedergabe: Play/Pause/Resume, Skip, Songs entfernen, Party beenden.

## Monitor/TV
- Existiert nur in der Web-App; spielt die Musik im Browser ab.
- Hat **keine** Host-Bedienelemente und verbindet sich nach einem Reload ohne erneute PIN-Eingabe.

---

# Lokalisierung (iOS)
- Alle App-eigenen Strings werden über `Localizable.strings` lokalisiert und folgen der **Systemsprache** des Geräts. **Kein** In-App-Sprachwähler.
- Es werden **Deutsch (`de`, Basissprache, `CFBundleDevelopmentRegion = de`)** und **Englisch (`en`)** ausgeliefert.
- Fehlt ein englischer Key, wird der **deutsche** Text als Fallback gezeigt (kein roher Key). Bei nicht unterstützter Sprache → Deutsch.
- **Backend-Fehlermeldungen** (z. B. „Nicht erlaubt.“, „Song ist schon in der Warteschlange.“) werden **verbatim** so angezeigt, wie sie vom Backend kommen, und **nicht** erneut lokalisiert.

---

# Ablauf

## 1) Party erstellen (Host)
1. Host öffnet die Swift-App und wählt „Party erstellen“.
2. Wählt **Spotify** oder **YouTube**; die App ruft `POST /api/party` mit dem Anbieter.
3. Host loggt sich beim Anbieter ein (OAuth) – **nur für diese Party**.
4. Das System erzeugt Party-ID, Gast-PIN, Host-PIN und Join-URL.
5. Host sieht PIN, QR-Code und die Host-Steuerung in der Admin-Ansicht.

## 2) Party am Monitor anzeigen
- Erfolgt über die **Web-App** auf dem Monitor/TV (PIN eingeben, danach Auto-Reconnect ohne PIN). Die Swift-App ersetzt den Monitor nicht.

## 3) Gäste beitreten
### Version A: QR-Code
1. Gast scannt den QR-Code am Monitor.
2. Ist die App installiert, öffnet sie die Party; sonst Weiterleitung in die Web-App.
3. Songs suchen, hinzufügen, liken.

### Version B: 5-stelliger Code
1. Gast öffnet die Swift-App und wählt „Party beitreten“.
2. Gibt den **5-stelligen** Code ein (Ziffern-Boxen).
3. Songs suchen, hinzufügen, liken.

---

# Sitzungen & Wiederherstellung (iOS)
- **Persistente Identität:** `deviceId` (UUID) wird in `UserDefaults` gespeichert und übersteht App-Neustarts.
- **Gast-Sitzung übersteht App-Schließen:** Ist eine Gast-Sitzung gespeichert, navigiert die App nach vollständigem Schließen/Neuöffnen **direkt** in die Gast-Ansicht – ohne PIN-Abfrage. Explizites Verlassen löscht die Sitzung aus `UserDefaults`.
- **Host-Sitzung übersteht App-Schließen:** Analog navigiert die App direkt in die Admin-Ansicht – ohne erneutes Erstellen oder Spotify-Login. Explizites Verlassen löscht die Sitzung.

---

# SSE-Verbindung & Party-Ende (iOS)
- Gast- und Admin-Ansicht halten eine **persistente SSE-Verbindung** (mit `partyId` im Query, ohne Request-Timeout) und **reconnecten** nach einem kurzen Delay automatisch, falls der Stream abbricht.
- `party-ended` wird nur verarbeitet, wenn die **`partyId` zur aktuellen Sitzung passt**; Events anderer Partys werden ignoriert.
- Bei passendem `party-ended`: Anzeige „**Die Party ist beendet.**“, Sitzung aus `UserDefaults` löschen, zurück zur Startseite, keine weiteren API-Calls.

---

# Host-Steuerung (Admin-Ansicht, iOS)
- **Authorization-Header:** Jeder Host-Endpunkt (play, pause, resume, skip, start, remove) wird mit `Authorization: Bearer <hostPin>` aufgerufen; ohne gespeicherten Host-PIN wird kein Header gesetzt.
- **Play/Pause-Logik:** Der **erste** Druck startet die Queue über `/track/start`; späteres Tippen ruft `/track/pause` bzw. `/track/resume`. Das Icon zeigt ▶ wenn gestoppt/pausiert und ⏸ während der Wiedergabe.
- **Lock ohne Gerät:** Solange `deviceActive` `false` ist (kein TV/Startpage offen), sind Play/Pause/Skip **deaktiviert** mit Hinweis; sie aktivieren sich automatisch, sobald ein Gerät registriert ist.
- **Synchroner Fortschrittsbalken:** Die App spiegelt die Position aus `progress`-SSE-Events (kein eigener Spotify-Call). Bei `track-changed` werden Position/Dauer **sofort** auf `0` gesetzt; ohne aktiven Track zeigt der Balken `0:00`.
- **Queue-Vorschau:** Vor dem ersten Play zeigt die Admin-Ansicht den **ersten Queue-Song** als Vorschau im „Now Playing“-Bereich; dieser Song erscheint nicht doppelt in der Liste.
- **Polling ohne überflüssige Re-Renders:** Gepollte `@Published`-Werte (`isPlaying`, `deviceActive`, `currentPosition`, `currentDuration`) werden nur neu gesetzt, wenn sich der Wert tatsächlich geändert hat.
- **Party beenden:** `DELETE /api/party/{id}` mit Host-PIN; das Backend sendet `party-ended` an alle Clients, die App löscht die Sitzung und kehrt zur Startseite zurück.
- **iOS-Login stört die Web-App nicht:** Ein iOS-Login sendet **nur** ein `source=ios`-Event, **kein** `login-success` mit `source=web`, damit die Web-App ihren Player nicht neu initialisiert.

---

# Darstellung & Medien (iOS)
- **QR-Code-Ladeindikator:** Die Admin-Ansicht zeigt vom Öffnen bis zum Auflösen von `GET /api/party/{id}/qr` einen **Spinner**; bei Erfolg das QR-Bild, bei Fehler den Fehlerzustand – kein unsichtbarer Platzhalter.
- **Album-Cover über Session-Cache:** Cover werden über `URLSession.shared` geladen und in einem **gemeinsamen, thread-sicheren In-Memory-Cache** gehalten (statt `AsyncImage`, das auf iOS 26 `URLCache.shared` ignoriert). Bereits geladene URLs werden ohne erneuten Request wiederverwendet; nach dem Laden der Queue werden die Cover-URLs **vorausgeladen**.
- **Platzhalter:** Fehlt eine Cover-URL oder schlägt das Laden fehl, wird ein neutraler `music.note`-Platzhalter gezeigt (in Queue-Zeilen und im „Now Playing“-Bereich).

---

# PIN-Eingabe (iOS)
- Die Host-PIN-Eingabe nutzt denselben **5-Ziffern-Box-Stil** wie die Gast-Code-Eingabe (fünf gerundete Boxen, aktive Box hervorgehoben).
- **Auto-Submit** beim Eingeben der fünften Ziffer.
- Bei falschem PIN: **Shake-Animation** + haptisches Feedback, danach Eingabe leeren für einen erneuten Versuch.

---

# Suche (iOS)
- Suche geht an den Anbieter der Party; leeres Feld zeigt die Top 10.
- **Robuste Fehlerbehandlung:**
    - `null`/nicht verfügbare Track-Einträge aus Spotifys `items` werden **stillschweigend übersprungen**; die übrigen Treffer werden angezeigt.
    - Non-2xx-Antwort des Backends → „**Suche fehlgeschlagen. Bitte erneut versuchen.**“ (nicht „Backend nicht erreichbar“).
    - Netzwerkfehler → „**Backend nicht erreichbar. Bitte Backend starten und erneut versuchen.**“

---

# Regeln der Warteschlange, Voting, Blacklist, Playback
Diese Regeln gelten identisch zur Web-App – siehe allgemeine Spezifikation:
- **Sortierung:** mehr Likes zuerst, bei Gleichstand ältester Wunsch zuerst.
- **Keine Duplikate:** „Song ist schon in der Warteschlange.“
- **Limit:** max. 10 Songs/Minute → „Zu viele Anfragen — bitte kurz warten.“
- **Likes:** 1 pro Gast/Song, togglebar, live; Optimistic UI.
- **Blacklist:** Teilstring-Treffer → „Nicht erlaubt.“
- **Playback:** läuft auf dem Monitor/TV; bei Songende/Skip wird der Song entfernt und der nächste gemäß Sortierung gestartet; keine History.

> [!NOTE]
> Offene Frage: Verhalten bei leerer Queue – die Web-Spezifikation sagt
> „stoppen/pausieren“, ein früherer Swift-Entwurf sah „zufällige Top-Charts“
> vor. Diese Frage ist noch nicht abschließend entschieden.

---

# Akzeptanzkriterien (iOS-spezifisch)
1. Gäste können per QR-Code oder **5-stelligem** Code beitreten und sehen Updates live.
2. App-Strings folgen der Systemsprache (de Basis, en sekundär, Fallback auf Deutsch); Backend-Meldungen werden verbatim gezeigt.
3. Gast- und Host-Sitzung überstehen App-Neustart; explizites Verlassen löscht die Sitzung.
4. SSE-Verbindung ist persistent und reconnectet; `party-ended` wirkt nur bei passender `partyId`.
5. Host-Controls senden den Host-PIN; Play/Pause/Skip sind ohne aktives Gerät gesperrt.
6. Fortschrittsbalken ist synchron zum TV-Player (aus `progress`-Events), resettet bei `track-changed`.
7. QR-Code zeigt einen Ladeindikator; Cover laden über einen Session-Cache mit Platzhalter-Fallback.
8. Host-PIN-Eingabe nutzt Ziffern-Boxen mit Auto-Submit und Shake bei Fehler.

---
# An dieser App arbeiten:

{{< author name="simone" >}}
{{< author name="miriam" >}}
