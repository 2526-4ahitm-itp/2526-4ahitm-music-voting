# Tasks

## 1. Backend

- [x] 1.1 `SpotifyTokenResource`: `@HostOnly` an `getToken`, `getDeviceId`, `setDeviceId`

## 2. Tests & Verify

- [x] 2.1 Bestehende Tests für Token und Device-ID schicken den Host-PIN
- [x] 2.2 Neue Tests: ohne Header 401, falscher PIN 403 (Token, Device-ID lesen und setzen); Device-ID bleibt bei 403 unverändert
- [x] 2.3 `./mvnw test` grün; Frontend-Tests unverändert grün
- [x] 2.4 `openspec validate protect-spotify-player-endpoints --strict`
- [ ] 2.5 Live-Check: Player auf `/startpage` startet und spielt wie bisher; `curl` ohne Header auf `/spotify/token` liefert 401 (curl-Teil am 2026-11-23 geprüft: 401/403 ohne bzw. mit falschem PIN, 200 mit Host-PIN; offen: Player mit echtem Spotify-Login)

## Workflow follow-up

- Nach Verify: `openspec archive protect-spotify-player-endpoints` und Archiv-Commit vor dem Push
