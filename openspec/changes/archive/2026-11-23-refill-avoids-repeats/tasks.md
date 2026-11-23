# Tasks

## 1. Merkliste

- [x] 1.1 `Party`: `recordPlayed(uri)` und `wasUsedForRefill(uri)` (gespielt ∪ nachgefüllt), nur im Speicher
- [x] 1.2 `SpotifyMusicProvider`: beim Wechsel auf den nächsten Song und beim Start des ersten Songs `recordPlayed` aufrufen

## 2. Refill

- [x] 2.1 `getSearchFallbackUris` in „Suche nach Künstler“ und „breite Suche“ aufteilen
- [x] 2.2 `orderRefillCandidates` durch `freshRefillCandidates` und `repeatRefillCandidates` ersetzen
- [x] 2.3 `refillQueue`: Quellen lazy der Reihe nach; Durchgang 1 nur frische Kandidaten pro Quelle, Durchgang 2 Wiederholungen aus den geholten Listen
- [x] 2.4 Breite Suche: Jahresbereich aus dem aktuellen Jahr berechnen (`year:<Jahr − 15>-<Jahr>`)

## 3. Tests & Verify

- [x] 3.1 Unit-Tests: `freshRefillCandidates` (ohne Gespieltes, Nachgefülltes, Gesperrtes, Wartendes), `repeatRefillCandidates`, `Party.wasUsedForRefill`
- [x] 3.2 Unit-Test des Quellen-Durchlaufs: erschöpfte erste Quelle → nächste Quelle; nichts Frisches → Wiederholung; alles gesperrt → nichts
- [x] 3.3 `./mvnw test` grün
- [x] 3.4 `openspec validate refill-avoids-repeats --strict`
- [ ] 3.5 Live-Check: Party mit kurzer Standard-Playlist (2–3 Songs) laufen lassen – nach der Playlist kommen andere Songs statt einer Schleife
- [x] 3.6 Unit-Test `broadSearchQuery` (2026 → `year:2011-2026`, verschiebt sich mit dem Jahr)

## Workflow follow-up

- Nach Verify: `openspec archive refill-avoids-repeats` und Archiv-Commit vor dem Push
