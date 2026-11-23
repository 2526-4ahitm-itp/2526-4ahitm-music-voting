# Proposal

## Why

`playback/spec.md` „No Play History“ verlangt, dass ein gespielter Song nicht automatisch wiederkommt. Das automatische Auffüllen hält das heute nicht ein:
- Ist eine Quelle (z. B. eine kurze Standard-Playlist) erschöpft, nimmt der Refill bereits nachgefüllte Songs wieder auf, statt zur nächsten Quelle weiterzugehen – die Playlist läuft in Schleife.
- Von Gästen gewünschte Songs werden gar nicht gemerkt: Steht ein gespielter Gast-Song auch in der Standard-Playlist, kann er später automatisch erneut kommen.
- Die Suche als letzte Quelle sucht nur dann breit, wenn die Künstler-Suche leer ist – nicht, wenn alle Künstler-Treffer schon gespielt wurden.

## What Changes

- Das System merkt sich pro Party (nur im Speicher, nirgends angezeigt) jeden Song, der gespielt oder automatisch nachgefüllt wurde.
- Der Refill nimmt aus jeder Quelle nur Songs, die in dieser Party noch nicht gespielt bzw. nachgefüllt wurden. Liefert eine Quelle keinen solchen Song, geht es zur nächsten: Standard-Playlist → ähnliche Songs → Top-Charts → Suche nach Künstler → breite Suche.
- Nur wenn keine Quelle einen neuen erlaubten Song liefert, darf als letzte Möglichkeit ein bereits gespielter Song nachgefüllt werden – damit die Musik nicht stoppt.
- Die Suche als Backstop wird in zwei Stufen aufgeteilt (Künstler, breit), damit die breite Suche auch greift, wenn alle Künstler-Treffer schon gespielt wurden.
- Die breite Suche deckt das aktuelle Jahr und die 15 Jahre davor ab (2026: `year:2011-2026`) und wird jedes Mal aus dem aktuellen Jahr berechnet; bisher stand fest `year:2010-2025` im Code.
- Blacklist, Warteschlangen-Duplikate und die Sortierung (Nachgefülltes unter Gast-Songs) bleiben unverändert. Gäste können gespielte Songs weiterhin über die Suche erneut wünschen.

## Capabilities

### New Capabilities

_Keine._

### Modified Capabilities

- `provider`: „Search-Based Refill Backstop Guarantees a Next Song“ legt den Jahresbereich der breiten Suche fest (aktuelles Jahr und 15 Jahre davor).
- `playback`: „No Play History“ wird präzisiert (interne Merkliste erlaubt, keine sichtbare Historie; Wiederholung nur als letzte Möglichkeit) und eine neue Anforderung „Auto-Refill Prefers Songs Not Yet Played“ kommt hinzu.

## Impact

- Backend: `Party` (Merkliste gespielter Songs), `SpotifyMusicProvider` (`refillQueue`, Kandidaten-Auswahl, Such-Backstop, Aufzeichnung beim Start eines Songs).
- Tests: Backend-Unit-Tests für Kandidaten-Auswahl und Quellen-Durchlauf.
- Keine API-, DB- oder Frontend-Änderungen.
