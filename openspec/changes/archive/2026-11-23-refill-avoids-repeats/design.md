# Design

## Context

`SpotifyMusicProvider.refillQueue()` holt Kandidaten aus der ersten Quelle, die überhaupt etwas liefert, und wählt daraus per `orderRefillCandidates()` aus: noch nicht nachgefüllte zuerst, bereits nachgefüllte als Fallback. Spätere Quellen werden nur angefragt, wenn eine Quelle *leer* ist, nicht wenn sie nur Wiederholungen enthält. `Party.autoFilledHistory` kennt nur nachgefüllte Songs, keine Gast-Songs. `getSearchFallbackUris()` sucht nur dann breit, wenn die Künstler-Suche gar nichts findet.

## Goals / Non-Goals

**Goals:**
- Jede Quelle liefert nur „frische“ Songs; sonst die nächste Quelle.
- Gespielte Gast-Songs zählen auch als gespielt.
- Wiederholung nur als letzte Möglichkeit.

**Non-Goals:**
- Persistente Historie (DB) oder Anzeige gespielter Songs.
- Änderungen an der Sortierung, am Duplikat-Schutz oder an der Gast-Suche.
- Die Merkliste über einen Backend-Neustart retten (sie ist bewusst nur im Speicher).

## Decisions

- **Eine Merkliste „verwendet“ in `Party`.** Neu `recordPlayed(uri)`; `wasUsedForRefill(uri)` = gespielt ∪ nachgefüllt. Aufgezeichnet wird, wenn ein Eintrag zum aktuell spielenden wird (`playNextAndRemove`, Start des ersten Songs). Alternative: Gespielte Songs in der DB speichern – verworfen, das wäre eine Play-History im Sinn der Spec.
- **Quellen als geordnete Liste von Lieferanten.** `refillQueue()` geht die Quellen der Reihe nach durch und fragt eine Quelle erst an, wenn die vorige keinen frischen erlaubten Song hatte. Bereits geholte Kandidatenlisten werden zwischengespeichert, damit der Wiederholungs-Durchgang keine zusätzlichen Spotify-Aufrufe für die Listen braucht.
- **Zwei Durchgänge.** Durchgang 1: pro Quelle nur frische Kandidaten (nicht in der Warteschlange, nicht per URI gesperrt, nicht verwendet), jeweils bis zu `REFILL_MAX_METADATA_FETCHES` Metadaten-Abrufe für die Wort-/Künstler-Prüfung. Durchgang 2 (nur wenn Durchgang 1 nichts fand): verwendete Kandidaten aus allen geholten Listen, gemeinsam gedeckelt auf `REFILL_MAX_METADATA_FETCHES`.
- **Such-Backstop in zwei Quellen.** `getSearchFallbackUris()` wird zu „Suche nach Künstler“ und „breite Suche“ aufgeteilt, damit die breite Suche auch greift, wenn alle Künstler-Treffer schon gespielt sind. Ihr Jahresbereich wird bei jedem Refill aus `Year.now()` berechnet (aktuelles Jahr und 15 Jahre davor) statt fest `year:2010-2025`; so sind neue Releases dabei und der Bereich veraltet nicht. 15 Jahre halten die Treffer „aktuell genug“ für eine Party und trotzdem groß genug, dass praktisch immer ein neuer Song dabei ist.
- **`orderRefillCandidates()` wird zu zwei reinen Funktionen** (`freshRefillCandidates`, `repeatRefillCandidates`), die sich ohne Spotify testen lassen.

## Risks / Trade-offs

- [Mehr Spotify-Aufrufe, wenn frühe Quellen nur Wiederholungen haben] → Quellen werden lazy angefragt; Metadaten-Abrufe bleiben pro Quelle gedeckelt. Im Normalfall (frischer Song in der ersten Quelle) ändert sich nichts.
- [Merkliste wächst über eine lange Party] → Nur Track-URIs, eine Party hat höchstens einige hundert Songs; die Party endet spätestens nach 2 Tagen.
- [Nach einem Backend-Neustart ist die Merkliste leer] → Dann sind Wiederholungen wieder möglich; akzeptiert, weil die Spec keine persistente Historie will.

## Migration Plan

Reines Backend-Deployment, keine DB-Migration.
