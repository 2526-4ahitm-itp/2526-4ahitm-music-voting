# Tasks

## 1. Altcode entfernen

- [x] 1.1 In `SpotifyMusicProvider` `ensurePartyPlaylistExists`, `findExistingPlaylist`, `createPartyPlaylist`, `removeTrackFromPlaylist` und `fetchAndStoreUserId` löschen
- [x] 1.2 In `refillQueue()` den Block entfernen, der bei fehlender Standard-Playlist `ensurePartyPlaylistExists()` aufruft; Kommentar zur Refill-Kette anpassen
- [x] 1.3 In `SpotifyCallbackResource` (Web- und iOS-Callback) die Aufrufe von `fetchAndStoreUserId()` und `ensurePartyPlaylistExists()` entfernen
- [x] 1.4 In `SpotifyCredentials` die Felder `playlistId` und `spotifyUserId` samt Getter/Setter entfernen
- [x] 1.5 In `SpotifyTokenResource` den Scope `playlist-modify-private` aus der Authorize-URL entfernen

## 2. Tests

- [x] 2.1 Backend-Test: Die Authorize-Redirect-URL enthält `playlist-read-private`, aber weder `playlist-modify-private` noch `playlist-modify-public`
- [x] 2.2 Backend-Tests auf Verweise auf die entfernten Methoden/Felder prüfen und anpassen
- [x] 2.3 `cd musicvoting/backend && ./mvnw test` läuft grün

## 3. Doku & Verify

- [x] 3.1 Per Grep sicherstellen, dass „Musicvoting party“, `playlist-modify` und die entfernten Methoden nirgends mehr vorkommen (Backend, Frontend, iOS, README, Hugo)
- [x] 3.2 `openspec validate remove-party-playlist-legacy` läuft ohne Fehler
- [x] 3.3 Live-Check: Host-Login mit Spotify erzeugt keine neue „Musicvoting party“-Playlist; Consent-Screen fragt nicht mehr nach Playlist-Bearbeitung (am 2026-11-24 bestätigt)

## Workflow follow-up

- Nach Verify: `openspec archive remove-party-playlist-legacy` und Archiv-Commit vor dem Push
