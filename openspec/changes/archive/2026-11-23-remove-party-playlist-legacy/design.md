# Design

## Context

Siehe proposal.md – Why. Aktueller Stand im Backend:

- `SpotifyCallbackResource` ruft nach dem Token-Tausch (Web- und iOS-Callback) `fetchAndStoreUserId()` (`GET /v1/me`) und `ensurePartyPlaylistExists()` auf.
- `ensurePartyPlaylistExists()` sucht in den ersten 50 Playlists nach „Musicvoting party“ (`GET /v1/me/playlists`) oder legt sie an (`POST /v1/users/{id}/playlists`) und schreibt die ID in `SpotifyCredentials.playlistId`.
- Einziger Leser von `playlistId` ist `removeTrackFromPlaylist()`, das selbst keinen Aufrufer hat. Einziger Leser von `spotifyUserId` ist `createPartyPlaylist()`.
- `refillQueue()` ruft `ensurePartyPlaylistExists()` auf, wenn keine Standard-Playlist gesetzt ist, liest danach aber `party.defaultPlaylistId()` – das bleibt `null`, der Aufruf ist also wirkungslos.

## Goals / Non-Goals

**Goals:**
- Altcode und ungenutzte Zustandsfelder vollständig entfernen.
- Keine Schreibzugriffe mehr auf das Spotify-Konto des Hosts; Scope `playlist-modify-private` entfällt.
- Beobachtbares Refill-Verhalten bleibt identisch.

**Non-Goals:**
- Bereits angelegte „Musicvoting party“-Playlists in Host-Konten löschen.
- Premium-Erkennung über `GET /v1/me` (`product`) – eigener Change, falls gewünscht.

## Decisions

- **Vollständig löschen statt reparieren.** Alternative wäre, die Party-Playlist wirklich als Fallback-Standard-Playlist zu nutzen. Da sie immer leer ist, würde das nichts bringen; die Refill-Kette (ähnliche Songs → Top-Charts → Suche) deckt den Fall bereits ab.
- **`fetchAndStoreUserId` mit entfernen.** Die User-ID wird nur für das Anlegen der Playlist gebraucht. Das spart einen `GET /v1/me` pro Login. Sollte eine spätere Premium-Prüfung `/v1/me` brauchen, wird der Aufruf dort zweckgebunden neu eingeführt.
- **Scope reduzieren.** `playlist-modify-private` war nur für das Anlegen nötig. `playlist-read-private` bleibt für die Standard-Playlist-Auswahl und das Lesen privater Playlists beim Refill.

## Risks / Trade-offs

- [Bereits gespeicherte Refresh-Tokens tragen noch den alten Scope] → Unkritisch; mehr Rechte als nötig, die nicht mehr genutzt werden. Beim nächsten Login gilt der reduzierte Scope.
- [Versteckte Abhängigkeit auf `playlistId`/`spotifyUserId`] → Per Grep geprüft: keine weiteren Leser in Backend, Frontend oder iOS. Der Compiler meldet übersehene Aufrufer.
- [Login wird bisher durch Fehler beim Anlegen der Playlist abgebrochen] → Fällt weg; der Login wird dadurch eher robuster.

## Migration Plan

Reines Backend-Deployment, keine DB-Migration. Rollback = vorherige Version deployen.
