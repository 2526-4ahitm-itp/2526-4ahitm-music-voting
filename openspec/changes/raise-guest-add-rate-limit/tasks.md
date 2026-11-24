# Tasks

## 1. Backend

- [x] 1.1 `GuestAddRateLimiter.MAX_ADDS` auf 20 setzen, Kommentare in `GuestAddRateLimiter` und `TrackResource` anpassen (prüfen: `grep -rn "10 songs\|10 Songs" musicvoting/backend/src` findet nichts mehr)
- [x] 1.2 `GuestAddRateLimiterTest` und die Rate-Limit-Tests der Resource auf `MAX_ADDS` statt 10 umstellen; Test „21. Song wird abgelehnt“ (prüfen: `./mvnw test` grün)

## 2. Frontend

- [x] 2.1 `AddCooldownService` (root) mit `start(seconds)`, Signal `secondsLeft`, 1-s-Ticker der bei 0 stoppt; Unit-Tests mit `jasmine.clock()` (Start, Herunterzählen, Ende, Wert nach „Rückkehr“)
- [x] 2.2 Gast-Seite: bei 429 `start(retryAfterSeconds ?? 60)` aufrufen; Countdown-Zeile „Du kannst in <N> s wieder Songs hinzufügen.“; „+“-Buttons deaktiviert mit `aria-label` „Bitte kurz warten“; Kommentar „more than 10 songs“ korrigieren
- [x] 2.3 `guest.spec.ts`: 429 startet den Countdown, Buttons sind deaktiviert, nach Ablauf wieder aktiv (prüfen: `npx ng test --watch=false --browsers=ChromeHeadless` grün)

## 3. Doku & Verifikation

- [x] 3.0 Verweise auf den alten Spec-Namen „Per-Guest Add Rate Limit“ in Code-Kommentaren (Backend, Frontend, `SongAddView.swift`) auf „Guest Add Limit per Minute“ ändern (prüfen: `grep -rn "Per-Guest Add Rate Limit" musicvoting` findet nichts mehr)
- [x] 3.1 Hugo-Doku/README auf Erwähnungen von „10 Songs pro Minute“ prüfen und anpassen (prüfen: `grep -rn "10 Songs" hugo README.adoc musicvoting/*/README.md`)
- [ ] 3.2 Live-Check: als Gast 21 Songs in unter einer Minute hinzufügen → 21. wird abgelehnt, Countdown läuft herunter, danach geht es wieder

## Workflow follow-up

- Nach der Implementierung: `openspec archive raise-guest-add-rate-limit` und Archiv-Commit vor dem Push.
