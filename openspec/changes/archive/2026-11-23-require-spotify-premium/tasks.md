# Tasks

## 1. Backend

- [x] 1.1 `SpotifyMusicProvider.fetchAccountProduct(accessToken)`: liest `product` aus `GET /v1/me`, liefert `Optional.empty()` bei Fehler
- [x] 1.2 `SpotifyCallbackResource.callback`: Kontotyp vor dem Speichern der Tokens prüfen; bei Nicht-Premium keine Tokens, kein `login-success`, Redirect mit `error=premium-required` (Web → `webRedirectUri` mit `partyId`, iOS → `iosRedirectUri`)
- [x] 1.3 `SpotifyCallbackResource.iosCallback`: bei Nicht-Premium HTTP 403 mit `reason: PREMIUM_REQUIRED` und deutscher Meldung
- [x] 1.4 `SpotifyTokenResource.login`: optionaler Query-Parameter `switchAccount=true` hängt `show_dialog=true` an
- [x] 1.5 `SpotifyApiErrors`: 403 mit `reason: PREMIUM_REQUIRED` → „Du brauchst Spotify Premium, um Musik abzuspielen.“

## 2. Frontend

- [x] 2.1 `select-playlist`: bei `error=premium-required` Hinweis „Dein Spotify-Konto hat kein Premium. Für MusicVoting brauchst du Spotify Premium.“ und Button „Mit anderem Spotify-Konto anmelden“ (→ Login mit `switchAccount=true`), keine Playlists laden
- [x] 2.2 `SpotifyPlayer`: `account_error` als Signal bereitstellen; `startpage` zeigt „Wiedergabe nicht möglich: Das Spotify-Konto braucht Premium.“

## 3. iOS

- [x] 3.1 `SpotifyAuthView`: `error=premium-required` im Callback-URL und HTTP 403 von `/ios/callback` → `spotify.error.premium`
- [x] 3.2 `Localizable.strings` (de/en): `spotify.error.premium`

## 4. Tests & Verify

- [x] 4.1 Backend-Tests: `SpotifyApiErrors` (PREMIUM_REQUIRED), Login mit/ohne `switchAccount`, Callback-Entscheidung für Premium/Free/unbekannt
- [x] 4.2 Frontend-Tests: `select-playlist` mit `error=premium-required`; Startpage zeigt Kontofehler
- [x] 4.3 `./mvnw test` und `npx ng test --watch=false --browsers=ChromeHeadless` grün (iOS-Tests in `SpotifyAuthViewModelTests` ergänzt, laufen nur in Xcode)
- [x] 4.4 `openspec validate require-spotify-premium --strict`
- [x] 4.5 Live-Check: Login mit Spotify-Free-Konto (Web und iOS) zeigt den Premium-Hinweis; Premium-Konto läuft unverändert durch (Web am 2026-11-24 bestätigt; iOS nicht prüfbar)

## Workflow follow-up

- Nach Verify: `openspec archive require-spotify-premium` und Archiv-Commit vor dem Push
