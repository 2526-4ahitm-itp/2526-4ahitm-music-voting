# Design

## Context

`GET /track/search?q=…` liefert pro Track `blocked: true|false`. Mit `audience=guest` entfernt das Backend zusätzlich Songs gesperrter Künstler und setzt `hiddenHint` (`ARTIST` = der Suchbegriff ist ein gesperrter Künstler, `SOME` = es wurden Songs entfernt). Die Web-Gastsuche zeigt den Hinweis bei `ARTIST`/`SOME` oder wenn ein Treffer `blocked` ist (`guest.ts` `hiddenHintText`). `SongAddView` wird in iOS von Gast (`Gast_ContentView`) und Host (`Admin_ContentView`) genutzt; die Rolle steht in `PartySessionStore.role`. Der SSE-Stream liefert `blacklist-updated` bisher nur im Web-Zweig.

## Goals / Non-Goals

**Goals:**
- Gleiches Verhalten wie im Web je Rolle; nichts verrät Blacklist-Einträge an Gäste.

**Non-Goals:**
- Blacklist-Verwaltung in iOS (bleibt Web-only).
- Änderungen an der Backend-Logik der Sperrprüfung.

## Decisions

- **Rolle bestimmt `audience`.** Gast → `audience=guest`; Host → ohne Parameter (wie Web-Host-Suche, alle Treffer inklusive gesperrter Künstler, ausgegraut).
- **Hinweislogik wie im Web.** `hiddenHint == ARTIST` → „Dieser Artist ist nicht zulässig.“; sonst `SOME` oder ein `blocked`-Treffer → „Einige Ergebnisse sind auf dieser Party nicht zulässig.“; nur für Gäste. Als reine Funktion im ViewModel (`blockedHint`), damit testbar.
- **Darstellung.** Gesperrte Zeile mit reduzierter Deckkraft, „+“ deaktiviert; Gast: `accessibilityLabel` „Nicht verfügbar“, kein sichtbarer Text; Host: „Nicht erlaubt.“ unter dem Künstler. `addToPlaylist` bricht für gesperrte Treffer vorab ab (das Backend würde ohnehin 403 liefern).
- **Lokalisierung.** Die Texte sind iOS-eigene UI-Texte (anders als vom Backend gelieferte Fehler) und kommen in `Localizable.strings` (de = Web-Wortlaut, en = Übersetzung).
- **SSE.** Der iOS-Zweig in `SpotifyCallbackResource.events` liefert `blacklist-updated` party-gefiltert, wie die anderen party-bezogenen Events. Die Suche läuft bei diesem Event neu, wenn ein Suchbegriff aktiv ist.

## Risks / Trade-offs

- [Ältere Backends ohne `blocked`-Feld] → Feld ist optional dekodiert (Standard: nicht gesperrt).

## Migration Plan

Backend (SSE-Filter) und iOS-App unabhängig ausrollbar; ohne neues Backend fehlt in iOS nur die Live-Aktualisierung.
