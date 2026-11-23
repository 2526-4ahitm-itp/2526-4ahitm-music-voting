# Proposal

## Why

Bei jedem Spotify-Login des Hosts (und bei jedem Refill ohne Standard-Playlist) sucht oder erstellt das Backend eine private Playlist „Musicvoting party“ im Spotify-Konto des Hosts. Das ist Altcode aus der Zeit, als die Warteschlange als Spotify-Playlist gespiegelt wurde: Die Playlist bleibt heute immer leer, ihre ID wird nirgends gelesen, und der Aufruf in `refillQueue()` hat keine Wirkung, weil er `SpotifyCredentials.playlistId` statt `Party.defaultPlaylistId` setzt. Übrig bleiben ungefragte Einträge im Host-Konto, unnötige Spotify-Aufrufe und ein Berechtigungs-Scope, den die App nicht braucht.

## What Changes

- Das Backend legt keine Playlists mehr im Spotify-Konto des Hosts an und sucht auch keine „Musicvoting party“-Playlist mehr.
- Entfernt werden `ensurePartyPlaylistExists`, `findExistingPlaylist`, `createPartyPlaylist`, `removeTrackFromPlaylist` (ohne Aufrufer) und `fetchAndStoreUserId` (die Spotify-User-ID wurde nur zum Anlegen der Playlist gebraucht).
- Entfernt werden die Felder `playlistId` und `spotifyUserId` aus `SpotifyCredentials`.
- Die Aufrufe im Spotify-Callback (Web und iOS) und in `refillQueue()` entfallen.
- Der OAuth-Scope `playlist-modify-private` wird nicht mehr angefordert; `playlist-read-private` bleibt (Standard-Playlist-Auswahl).
- Das Refill-Verhalten bleibt unverändert: ohne Standard-Playlist geht es wie bisher direkt mit ähnlichen Songs → Top-Charts → Suche weiter.

## Capabilities

### New Capabilities

_Keine._

### Modified Capabilities

- `provider`: Neue Anforderung, dass das System im Konto des Hosts keine Playlists anlegt oder verändert und nur die für Wiedergabe und Playlist-Lesen nötigen Berechtigungen anfordert.

## Impact

- Backend: `SpotifyMusicProvider.java`, `SpotifyCredentials.java`, `SpotifyCallbackResource.java`, `SpotifyTokenResource.java` (Scope).
- Tests: Backend-Tests für Callback und Scope anpassen bzw. ergänzen.
- Hosts: Neue Logins erzeugen keine leere Playlist mehr. Bereits angelegte „Musicvoting party“-Playlists bleiben im Konto bestehen (kein automatisches Löschen) und können vom Host manuell entfernt werden.
- Keine API-, DB- oder Frontend-Änderungen.
