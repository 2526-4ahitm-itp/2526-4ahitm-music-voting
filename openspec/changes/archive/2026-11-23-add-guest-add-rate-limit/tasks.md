# Tasks

## 1. Backend

- [x] 1.1 `GuestAddRateLimiter` (`@ApplicationScoped`, `Clock`, gleitendes 60-s-Fenster, 10 Adds, `check`/`record`, leere Einträge entfernen)
- [x] 1.2 `TrackResource.addToPlaylist`: optionaler Query-Parameter `deviceId`; Host (gültiger Host-PIN) ausgenommen; `check` vor dem Add, `record` nur nach 2xx
- [x] 1.3 429-Antwort mit `"Zu viele Anfragen — bitte kurz warten."`, `retryAfterSeconds` und `Retry-After`-Header

## 2. Clients

- [x] 2.1 Web: `SpotifyWebPlayerService.addToPlaylist` hängt `deviceId` an; Gast- und Host-Suche zeigen die 429-Meldung (bestehende Fehleranzeige)
- [x] 2.2 iOS: `SongAddViewModel` hängt `deviceId` an und zeigt bei Nicht-2xx den `error`-Text des Backends (Fallback: lokalisierter Text)

## 3. Tests & Verify

- [x] 3.1 Backend-Unit-Tests `GuestAddRateLimiter`: 10 erlaubt / 11. abgelehnt, Fenster rollt weiter, pro Gast und Party getrennt, `retryAfterSeconds`, mehrere URIs pro Request
- [x] 3.2 Backend-Endpoint-Tests: 429 mit Meldung; Host ausgenommen; ohne `deviceId` nicht begrenzt; abgelehnte Adds zählen nicht
- [x] 3.3 Frontend-Tests: `addToPlaylist` schickt `deviceId`; Gastseite zeigt die 429-Meldung
- [ ] 3.4 iOS-Tests: `deviceId` in der Add-URL; 429-Meldung wird wörtlich angezeigt (geschrieben in `SongAddViewModelTests`, laufen nur in Xcode)
- [x] 3.5 `./mvnw test` und `npx ng test --watch=false --browsers=ChromeHeadless` grün
- [x] 3.6 `openspec validate add-guest-add-rate-limit --strict`
- [ ] 3.7 Live-Check: als Gast 11 Songs in unter einer Minute hinzufügen → 11. wird mit der Meldung abgelehnt; nach einer Minute geht es wieder

## Workflow follow-up

- Nach Verify: `openspec archive add-guest-add-rate-limit` und Archiv-Commit vor dem Push
