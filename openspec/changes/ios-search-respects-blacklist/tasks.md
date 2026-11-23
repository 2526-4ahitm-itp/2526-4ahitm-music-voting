# Tasks

## 1. iOS

- [x] 1.1 Decoding: `blocked` pro Track und `hiddenHint` in der Suchantwort (optional); `SearchTrack.blocked`
- [x] 1.2 Gäste suchen mit `audience=guest`
- [x] 1.3 `blockedHint` (ARTIST / SOME / blocked-Treffer, nur Gäste) unter dem Suchfeld; ersetzt „Keine Ergebnisse gefunden.“, wenn alle Treffer entfernt wurden
- [x] 1.4 Gesperrte Zeile ausgegraut, „+“ deaktiviert; Gast: Label „Nicht verfügbar“, Host: Text „Nicht erlaubt.“; `addToPlaylist` ignoriert gesperrte Treffer
- [x] 1.5 SSE `blacklist-updated` → Suche neu ausführen
- [x] 1.6 `Localizable.strings` de/en

## 2. Backend

- [x] 2.1 `SpotifyCallbackResource.events`: iOS-Zweig liefert `blacklist-updated` für die eigene Party

## 3. Tests & Verify

- [ ] 3.1 iOS-Tests: `audience=guest` nur für Gäste, `blocked` dekodiert, `blockedHint`, gesperrter Treffer wird nicht hinzugefügt (laufen nur in Xcode)
- [x] 3.2 Backend-Test: iOS-Stream bekommt `blacklist-updated` nur für die eigene Party
- [x] 3.3 `./mvnw test` grün
- [x] 3.4 `openspec validate ios-search-respects-blacklist --strict`
- [ ] 3.5 Live-Check in iOS: Wort, Künstler und Song sperren; als Gast und als Host suchen; Blacklist ändern, während die Suche offen ist

## Workflow follow-up

- Nach Verify: `openspec archive ios-search-respects-blacklist` und Archiv-Commit vor dem Push
