# Tasks

## 1. Merkliste

- [ ] 1.1 `Party`: `recordPlayed(uri)` und `wasUsedForRefill(uri)` (gespielt ∪ nachgefüllt), nur im Speicher
- [ ] 1.2 `SpotifyMusicProvider`: beim Wechsel auf den nächsten Song und beim Start des ersten Songs `recordPlayed` aufrufen

## 2. Refill

- [ ] 2.1 `getSearchFallbackUris` in „Suche nach Künstler“ und „breite Suche“ aufteilen
- [ ] 2.2 `orderRefillCandidates` durch `freshRefillCandidates` und `repeatRefillCandidates` ersetzen
- [ ] 2.3 `refillQueue`: Quellen lazy der Reihe nach; Durchgang 1 nur frische Kandidaten pro Quelle, Durchgang 2 Wiederholungen aus den geholten Listen

## 3. Tests & Verify

- [ ] 3.1 Unit-Tests: `freshRefillCandidates` (ohne Gespieltes, Nachgefülltes, Gesperrtes, Wartendes), `repeatRefillCandidates`, `Party.wasUsedForRefill`
- [ ] 3.2 Unit-Test des Quellen-Durchlaufs: erschöpfte erste Quelle → nächste Quelle; nichts Frisches → Wiederholung; alles gesperrt → nichts
- [ ] 3.3 `./mvnw test` grün
- [ ] 3.4 `openspec validate refill-avoids-repeats --strict`
- [ ] 3.5 Live-Check: Party mit kurzer Standard-Playlist (2–3 Songs) laufen lassen – nach der Playlist kommen andere Songs statt einer Schleife

## Workflow follow-up

- Nach Verify: `openspec archive refill-avoids-repeats` und Archiv-Commit vor dem Push
