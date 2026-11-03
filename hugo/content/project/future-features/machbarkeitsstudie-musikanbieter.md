---
title: "Machbarkeitsstudie: Wechselnder Musikanbieter"
description: Ist es machbar, den Musikanbieter pro Party wählbar zu machen? Code-Analyse, Lösungsvorschlag, Aufwand und Risiken
tags: [research, future-features]
authors:
  - simone
date: 2026-10-13
showDate: true
weight: 20
---

> Stand: 13.10.2026 · Autorin: Simone (mit Claude)
> Grundlage: Code-Analyse von Backend, Frontend und iOS-App sowie die Anbieter-Recherche in
> [Recherche: Musikanbieter](../musikprovider/).
> Zweck: Entscheidungsgrundlage fürs Team. Es ist noch nichts umgesetzt und kein OpenSpec-Change
> angelegt.
>
> 🎞️ Als Foliensatz: [Präsentation zur Machbarkeitsstudie](../machbarkeitsstudie-praesentation/)

## 1. Ziel und Umfang

**Ziel:** Der Host wählt beim Erstellen einer Party, über welchen Musikanbieter die Party läuft
(z. B. Spotify oder YouTube). Gäste merken davon möglichst wenig: Suchen, Wünschen und Voten
funktionieren gleich.

**Im Umfang**
- Anbieter **pro Party** wählbar, beim Erstellen der Party
- Mindestens **ein zweiter Anbieter** zusätzlich zu Spotify
- Web-App (Gast, Host, Player/TV) und iOS-App (Host-Login, Steuerung)

**Nicht im Umfang**
- Anbieter **während** einer laufenden Party wechseln: Die Songs in der Warteschlange gehören zum
  alten Anbieter (Spotify-URI ≠ YouTube-Video-ID). Das wäre ein eigenes, deutlich größeres
  Feature (Songs zwischen Anbietern abgleichen, z. B. über ISRC).
- Mehrere Anbieter gleichzeitig in einer Party

## 2. Ausgangslage im Code

### Was schon vorbereitet ist ✅

| Stelle | Stand |
|---|---|
| `MusicProvider`-Interface + `MusicProviderFactory` | Backend-Endpunkte in `TrackResource` gehen schon über das Interface |
| `ProviderKind` (`SPOTIFY`, `YOUTUBE`) | existiert; `YOUTUBE` wirft in der Factory `UnsupportedOperationException` |
| `POST /api/party` | nimmt `provider` schon entgegen (`spotify` / `youtube`) |
| DB-Spalte `party.provider_kind` | existiert und wird gespeichert |
| `queue_entry` | speichert Titel, Künstler, Cover, Dauer selbst, nicht nur die Spotify-ID; `track_uri` ist ein einfacher Text |
| Queue als Quelle der Wahrheit | liegt in unserer DB, nicht beim Anbieter; das ist die wichtigste Voraussetzung |
| iOS-App | spielt **keine** Musik selbst, sondern steuert nur über das Backend; betroffen ist nur der Login |

### Was fest an Spotify hängt ❌

| Bereich | Fundstelle | Problem |
|---|---|---|
| **Queue- und Vote-Logik** | `SpotifyMusicProvider` (1.681 Zeilen) | `getQueue`, `toggleVote`, `addTracksToPlaylist`, `refillQueue` usw. liegen **im Spotify-Provider**. Ein zweiter Anbieter müsste das alles kopieren. |
| **Wiedergabe-Steuerung** | `SpotifyMusicProvider.play/pause/resume`, `reassertPlay` | Das **Backend** steuert Spotify per Web API. Andere Anbieter können nur im Browser gesteuert werden (siehe Kap. 4). |
| **Login und Tokens** | `SpotifyCallbackResource`, `SpotifyTokenResource`, `SpotifyCredentials` | Endpunkte heißen `/spotify/...`; `Party` hat ein festes Feld `spotifyCredentials` |
| **Live-Events** | `/api/spotify/events` | Der SSE-Kanal für alle Clients (Web und iOS) heißt „spotify", wird aber für alles genutzt |
| **DB** | `party.spotify_refresh_token` | Spaltenname anbieterspezifisch |
| **Player-Seite** | `frontend/.../services/spotify-player.ts`, `startpage.ts` | Lädt das Spotify SDK direkt; Songende-Erkennung ist auf Spotify-Eigenheiten zugeschnitten |
| **Gast/Host-Suche** | `guest.ts`, `search-host.ts` | nutzen `SpotifyWebPlayerService` und `/api/spotify/events` |
| **Party erstellen** | `create-party.ts` / `.html` | Dropdown zeigt „Spotify" und **„Amazon Music"**, der Wert wird aber ignoriert: es wird immer `createParty('spotify')` aufgerufen. Amazon Music ist laut Recherche nicht nutzbar. |
| **iOS** | `SpotifyAuthView.swift`, `PlaylistPickerView.swift` | Login-Ansicht nur für Spotify |

**Bewertung:** Die Grundstruktur (Interface, Factory, Queue in der DB) passt. Der größte Brocken
ist, dass Queue- und Vote-Logik im Spotify-Provider stecken und das Backend die Wiedergabe
direkt steuert.

## 3. Was ein Anbieter können muss

| Fähigkeit | Pflicht? | Spotify | YouTube | Apple Music | TIDAL |
|---|---|---|---|---|---|
| Suche | ✅ Pflicht | ✅ Web API | ✅ Data API (Quota!) | ✅ Apple Music API | ✅ Web API |
| Song-Metadaten (Titel, Cover, Dauer) | ✅ Pflicht | ✅ | ✅ (Dauer nur über extra Abruf) | ✅ | ✅ |
| Abspielen auf der Player-Seite | ✅ Pflicht | ✅ Web Playback SDK | ✅ IFrame Player | ✅ MusicKit JS | ⚠️ Player-SDK, evtl. nur Vorschau |
| Pause / Resume / Position | ✅ Pflicht | ✅ | ✅ | ✅ | ✅ |
| Songende erkennen | ✅ Pflicht | ⚠️ unzuverlässig (Workarounds im Code) | ✅ `onStateChange` | ✅ Events | ✅ Event-Bus |
| Steuerung durchs Backend | ❌ optional | ✅ | ❌ | ❌ | ❌ |
| Host-Login | ❌ optional | ✅ OAuth | nicht nötig | ✅ MusicKit | ✅ OAuth (PKCE) |
| Auto-Refill-Quellen | ❌ optional | ⚠️ Top-Tracks entfernt | ✅ Suche/Playlists | ✅ Charts/Playlists | ✅ Empfehlungen |

## 4. Lösungsvorschlag (Zielbild)

### 4.1 Backend: Anbieter-Logik von Party-Logik trennen

```
TrackResource ──► QueueService (neu, anbieterunabhängig)
                    ├─ Queue, Votes, Reihenfolge, Auto-Refill-Ablauf, aktueller Song
                    └─ fragt den Anbieter nur nach Musik:
                         MusicCatalog   (search, getTrack, refillCandidates)
                         PlaybackControl (nur Spotify: play/pause per Web API)
                         ProviderAuth    (login, callback, token, status)
```

- **`QueueService`** übernimmt alles, was heute anbieterunabhängig im `SpotifyMusicProvider` liegt
  (Queue lesen, Songs hinzufügen/entfernen, Votes, nächster Song, Refill-Ablauf). Das ist der
  größte Umbau, macht aber jeden weiteren Anbieter klein.
- **`MusicCatalog`**: Suche und Metadaten, liefert ein gemeinsames `Track`-Modell.
  `track_uri` bekommt ein Anbieter-Präfix (`spotify:track:…` gibt es schon, neu z. B.
  `youtube:VIDEO_ID`), damit nichts verwechselt wird.
- **`PlaybackControl`** gibt es nur für Spotify. Bei allen anderen schickt das Backend
  stattdessen per SSE ein Kommando an die Player-Seite.
- **`ProviderAuth`**: Endpunkte anbieterneutral, z. B. `/api/party/{id}/provider/login`,
  `/provider/status`, `/provider/token`. Die alten `/spotify/...`-Pfade bleiben als Weiterleitung,
  bis Web und iOS umgestellt sind.
- **DB:** `spotify_refresh_token` → `provider_refresh_token` (Migration mit Umbenennung, alte
  Partys bleiben gültig).
- **SSE:** `/api/spotify/events` → `/api/events`, alter Pfad bleibt vorerst erhalten.

### 4.2 Wiedergabe: zwei Modi

| | Server-gesteuert (heute, Spotify) | Client-gesteuert (YouTube, Apple, TIDAL) |
|---|---|---|
| Wer spielt? | Spotify-Gerät im Browser | Player im Browser |
| Wer entscheidet „play"? | Backend → Spotify Web API | Backend → **SSE-Event** `play-command` → Player |
| Songende | Player meldet → `/track/next` | Player meldet → `/track/next` (gleich) |
| Pause/Resume vom Host | Backend → Spotify | Backend → SSE → Player |

Die DB bleibt in beiden Modi die Quelle der Wahrheit (`currently_playing_entry_id`,
`playback_started_at`, `paused_position_ms`). Die Player-Seite meldet weiterhin Songende und
Position, so wie heute.

### 4.3 Frontend: Player-Adapter

- Neues Interface `MusicPlayerAdapter` (`init`, `load(trackUri, positionMs)`, `pause`, `resume`,
  `onEnded`, `onPosition`).
- `SpotifyPlayerAdapter` = heutiger `SpotifyWebPlayerService`, `YouTubePlayerAdapter` neu.
- `startpage` wählt den Adapter anhand des `provider` der Party und hört auf die neuen
  SSE-Kommandos.
- `guest.ts` und `search-host.ts` brauchen nur den neutralen Event-Pfad; die Suche läuft schon
  übers Backend.
- `create-party`: Dropdown mit den **tatsächlich unterstützten** Anbietern, Auswahl wird an
  `createParty(provider)` übergeben. „Amazon Music" fliegt raus.
- **Player-Seite bei YouTube: „nur Cover"-Optik, regelkonform.** Den Player verstecken oder ein
  Cover darüberlegen ist laut YouTube-Regeln verboten (mind. 200 × 200 px, nichts davor, kein
  reiner Ton). Stattdessen: Die Suche bevorzugt **„Topic"-Uploads**, deren Bild nur das
  Albumcover ist. Der Player bleibt sichtbar (z. B. 480 × 270 px), daneben groß Cover, Titel und
  Warteschlange. Details: [Recherche, Abschnitt YouTube](../musikprovider/#youtube-iframe-player-api--youtube-data-api-v3).

### 4.4 iOS

- Login-Ansicht abhängig vom Anbieter: Bei YouTube entfällt sie, bei Apple Music wäre
  natives MusicKit nötig.
- `PlaylistPickerView` nur für Anbieter mit Playlists anzeigen.
- Sonst keine Änderungen, weil die App nur übers Backend steuert.

## 5. Machbarkeit nach Dimensionen

| Dimension | Bewertung | Begründung |
|---|---|---|
| **Technisch** | 🟢 machbar | Interface, Factory und DB-Queue existieren schon. Hauptarbeit ist Refactoring, nichts grundlegend Neues. Einziges echtes Risiko: Verhalten der fremden Player-SDKs. |
| **Wirtschaftlich** | 🟢 mit YouTube kostenlos · 🟡 mit Apple 99 USD/Jahr | YouTube und TIDAL kosten uns nichts; Apple braucht das Developer Program. |
| **Rechtlich** | 🟡 lösbar | YouTube: Player muss sichtbar und unverdeckt sein (mind. 200 × 200 px), keine reine Audio-Wiedergabe; „nur Cover" geht über Topic-Uploads. Deezer nur „private use". Alles in der Recherche dokumentiert. |
| **Organisatorisch** | 🟡 knapp | Größerer Umbau quer durch Backend und Frontend, braucht 2–3 Sprints parallel zu anderen Features (siehe Kap. 7). |
| **Test/Qualität** | 🟡 Aufwand | 180 Backend-Tests, viele davon gegen `SpotifyMusicProvider`; Tests müssen auf `QueueService` umziehen. Fremde SDKs lassen sich nur manuell bzw. gemockt testen. |

**Gesamturteil: machbar.** Voraussetzung ist, dass wir zuerst die Queue-Logik aus dem
Spotify-Provider herauslösen. Ohne diesen Schritt wäre jeder neue Anbieter eine Kopie von
~1.700 Zeilen.

## 6. Welcher Anbieter zuerst?

Gewichtete Bewertung (1 = schlecht, 5 = gut). Grundlage: [Recherche: Musikanbieter](../musikprovider/).

| Kriterium | Gewicht | YouTube | Apple Music | TIDAL | Deezer |
|---|---|---|---|---|---|
| Zugang für uns (App/Key bekommen) | 25 % | 5 | 4 | 4 | 1 |
| Volle Wiedergabe gesichert | 25 % | 5 | 4 | 2 | 2 |
| Kosten / Konto beim Host | 15 % | 5 | 2 | 2 | 2 |
| Katalog (Mainstream-Hits) | 15 % | 4 | 5 | 5 | 5 |
| Aufwand / Doku / Stabilität | 10 % | 4 | 3 | 3 | 1 |
| Rechtliche Klarheit | 10 % | 3 | 4 | 3 | 2 |
| **Gewichtete Summe** | | **4,6** | **3,8** | **3,2** | **2,1** |

Die Punkte sind Einschätzungen aus der Recherche, keine Messwerte.

**Ergebnis:** **YouTube** zuerst. Kein Abo nötig, `ProviderKind.YOUTUBE` existiert schon, und es
gleicht die größte Schwäche von Spotify aus (Premium-Pflicht, max. 5 Hosts im Development Mode).
Apple Music ist der sinnvolle dritte Anbieter, falls ein Apple-Developer-Account verfügbar ist.

## 7. Aufwandsschätzung

PT = Personentag (ca. 6 h). Grobe Schätzung für unser Team, Spannweite statt Fixwert.

| # | Arbeitspaket | Aufwand |
|---|---|---|
| AP0 | **Unabhängig vorab:** Spotify-Endpunkte an Änderungen 2026 anpassen (`/items`, `/me/playlists`, Top-Tracks-Ersatz) | 1–2 PT |
| AP1 | `QueueService` aus `SpotifyMusicProvider` herauslösen, Tests umziehen | 4–6 PT |
| AP2 | Anbieterneutrale Auth-/Event-Endpunkte, DB-Migration, `Party` ohne festes `spotifyCredentials` | 2–3 PT |
| AP3 | Frontend: `MusicPlayerAdapter`, `startpage` auf Adapter + SSE-Kommandos umbauen | 3–4 PT |
| AP4 | YouTube-Katalog im Backend (Suche mit Filtern, Embedding-Check, Topic-Uploads bevorzugen, Quota-Caching) | 2–3 PT |
| AP5 | `YouTubePlayerAdapter` (IFrame Player, Songende, Position) | 2–3 PT |
| AP6 | `create-party`-Auswahl, Anzeige je Anbieter, iOS-Login je Anbieter | 1–2 PT |
| AP7 | OpenSpec (Proposal, Delta-Specs, Design), Hugo-Doku, README, Präsentation | 2–3 PT |
| | **Summe** | **17–26 PT** |

Bei drei Personen und Schulbetrieb entspricht das grob **2–3 Sprints** (je 2 Wochen).
AP1 ist die Voraussetzung für AP4–AP6; AP3 kann parallel zu AP1/AP2 laufen.

## 8. Risiken und Gegenmaßnahmen

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmaßnahme |
|---|---|---|---|
| YouTube-Such-Quota (~100 Suchen/Tag) reicht nicht | hoch | hoch | Suchergebnisse cachen, Suche erst nach Tipp-Pause; Quota-Erhöhung bei Google beantragen (setzt ein **Compliance-Audit** voraus, also Player regelkonform sichtbar lassen); früh mit Test-Key messen |
| Refactoring von AP1 bricht bestehende Spotify-Funktionen | mittel | hoch | Erst Tests grün halten, dann Schritt für Schritt umziehen; kein Feature parallel im selben Code |
| Musikvideos lassen sich nicht einbetten | mittel | mittel | Bei der Suche `videoEmbeddable=true` filtern, „Topic"/„Official Audio" bevorzugen |
| Zu einem Hit gibt es keine Topic-Version, es läuft das Musikvideo | mittel | niedrig | Video im kleinen Player, Seite sieht trotzdem gleich aus; Trefferquote im Spike messen |
| Werbung bei YouTube auf der Party | hoch | niedrig | Host-Hinweis: mit Premium im TV-Browser angemeldet sein (siehe Recherche) |
| Fremdes Player-SDK verhält sich anders als erwartet | mittel | mittel | Vor AP5 einen kleinen Spike (1 PT) mit dem IFrame Player bauen |
| Spotify-Endpunkte fallen weg (Änderungen 2026) | mittel | hoch | AP0 unabhängig und zuerst erledigen |
| Umbau dauert länger als ein Sprint | mittel | mittel | Pakete einzeln als eigene OpenSpec-Changes ausliefern; jeder Schritt ist für sich lauffähig |

## 9. Empfehlung und nächste Schritte

**Empfehlung: Umsetzen, aber in Etappen, und mit YouTube als zweitem Anbieter.**

1. **Spike YouTube (1–2 PT):** Test-Key anlegen, Suche + IFrame Player in einer Testseite,
   Quota-Verbrauch messen, Werbung mit/ohne Premium prüfen, Trefferquote von Topic-Uploads bei
   Mainstream-Hits messen.
2. **OpenSpec-Change `fix-spotify-2026-endpoints`** (AP0), unabhängig vom Rest.
3. **OpenSpec-Change `extract-queue-service`** (AP1 + AP2): reines Refactoring ohne neues
   Verhalten, danach muss alles wie vorher funktionieren.
4. **OpenSpec-Change `add-youtube-provider`** (AP3–AP6): Diesen Namen erwartet die
   `MusicProviderFactory` bereits in ihrer Fehlermeldung.
5. Danach entscheiden: Apple Music oder TIDAL (nach TIDAL-Spike, siehe Recherche).

## 10. Offene Fragen fürs Team

- Ist ein Wechsel **während** der Party gewünscht, oder reicht die Wahl beim Erstellen?
- Ist Werbung bei YouTube akzeptabel, oder setzen wir Premium beim Host voraus?
- ~~Soll die Player-Seite bei YouTube das Video groß zeigen oder eher klein mit Cover/Titel daneben?~~
  **Geklärt (03.11.2026):** Gewünscht ist nur das Cover. Video verstecken ist nicht erlaubt, deshalb
  kleiner, sichtbarer Player + großes Cover daneben; die Suche bevorzugt Topic-Uploads (siehe Kap. 4.3).
- Wird die iOS-App weiter aktiv entwickelt (wichtig für Apple Music)?
- `CLAUDE.md` beschreibt den Host-Login als „Spotify oder YouTube OAuth". Für YouTube ist laut
  Recherche **kein OAuth nötig** (API-Key reicht). Soll das in Doku/Specs angepasst werden?
