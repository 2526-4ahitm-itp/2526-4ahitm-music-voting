# Tasks

## 1. Data model
- [x] 1.1 Add nullable `defaultPlaylistId` (String) to `PartyEntity` and the `party` table (`setup.sql` + migration note)
- [x] 1.2 Ensure `findOrReconstruct` / `findById` carry `defaultPlaylistId` through DB-backed party resolution
- [x] 1.3 Add an `autofilled` boolean flag to the queue entry (DB + entity) used as a secondary sort key so guest entries sort above auto-filled ones

## 2. Provider capabilities (SpotifyMusicProvider + MusicProvider)
- [x] 2.1 `listHostPlaylists(Party)` → `GET /v1/me/playlists` (id, name, trackCount, imageUrl)
- [x] 2.2 `getPlaylistTrackUris(Party, playlistId)` → `GET /v1/playlists/{id}/tracks`
- [x] 2.3 `getSimilarTrackUris(Party, seedTrackId)` → seed track's artists' top tracks (`GET /v1/artists/{id}/top-tracks`); `/v1/recommendations` is 404 for newer apps so it can't be used. Best-effort; signal failure to caller
- [x] 2.4 Configurable Top-Charts playlist id (`spotify.topcharts.playlist.id`) used as the recommendations fallback source

## 3. Backend endpoints
- [x] 3.1 `GET /api/party/{id}/spotify/playlists` (@HostOnly, `findById`) returning the host's playlists
- [x] 3.2 `PUT /api/party/{id}/default-playlist` (@HostOnly) to set/clear `defaultPlaylistId`

## 4. Auto-refill logic
- [x] 4.1 `refillQueue(Party)` service: if queue (excluding current) is empty and a song is playing, add **one** song to the bottom — from the default playlist if set, else recommendations, else Top-Charts fallback; mark it `autofilled` (one at a time, the next loads when the queue empties again)
- [x] 4.2 De-duplicate against currently-queued URIs + an in-memory per-party auto-fill history so the playlist walks forward without oscillating/repeating
- [x] 4.3 Call `refillQueue` after `playNextAndRemove(...)` and `startFirstSongWithoutRemoving(...)`
- [x] 4.4 Apply the `autofilled` secondary sort so guest entries (and upvotes) always outrank auto-filled songs
- [x] 4.5 Emit the existing `queue-updated` SSE event after a refill so clients reload
- [x] 4.6 Search-based refill backstop: when default-playlist, similar, and Top-Charts all yield nothing, fall back to `GET /v1/search` (by the current song's artist, then a broad query) so there is always a next song while Spotify is reachable
- [x] 4.7 Single shared fall-through chain: the default playlist is the first preference but no longer a dead-end — if reading it yields nothing it falls through to similar → Top-Charts → search, exactly like the no-default-playlist path (fixed autoplay stalling when a default playlist was set)

## 5. Web host creation flow
- [x] 5.1 After the Spotify OAuth callback, route the web host to a playlist-picker page instead of straight to the dashboard (`spotify.web.redirect.uri` → `/select-playlist`)
- [x] 5.2 Playlist picker: call `GET /api/party/{id}/spotify/playlists`, list playlists, with a prominent "Ohne Standard-Playlist fortfahren" skip action
- [x] 5.3 On select → `PUT /api/party/{id}/default-playlist`; on skip → no default; both navigate to the host dashboard

## 6. Tests
- [x] 6.1 Backend: provider playlist/recommendations methods — covered for the best-effort/empty + Top-Charts fallback paths (the live happy-path needs a real Spotify session; see 7.2)
- [x] 6.2 Backend: `refillQueue` — refill guards (nothing playing / other songs queued) and the `autofilled` sort below guest entries
- [x] 6.3 Backend: endpoint auth (`@HostOnly`) for playlists + default-playlist (401/403 + authorized success)
- [x] 6.4 Frontend: playlist-picker component (list, select, skip → dashboard) + `PartyService.getPlaylists/setDefaultPlaylist`

## 8. Reliable autoplay continuation (web player)
- [x] 8.1 Advance at the track's **natural end** (not early), so the displayed/now-playing song stays in sync with the audio (early-advance made the backend's "current" lead the audio, visible as an off-by-one on the fast default-playlist refill)
- [x] 8.2 Detect the advance point via multiple independent paths (SDK state event, periodic SDK-state poll, elapsed-time reaching duration) so a dropped SDK event / null state does not stall playback
- [x] 8.3 Advance each track at most once, keyed to the track URI (idempotent across paths and duplicate events)
- [x] 8.4 Idle-restart: when nothing is playing (queue ran dry) and a song is added, start playback automatically without disturbing active playback or an intentional pause
- [x] 8.5 Frontend tests: end/near-end detection, elapsed-time fallback (incl. timer integration), idle-restart branches
- [x] 8.6 Remove the temporary diagnostic logging used to isolate the device-pause/refill issues (backend `[playNext]`/`[refill]`, the `/clientlog` sink, and debug `console.log`s)

## 7. Verify
- [x] 7.1 Run backend + frontend test suites; confirm green
- [x] 7.2 Manually verify end-to-end on a live Spotify Premium host session: queue drains → playback continues via the similar/search refill; songs advance across tracks without the player reverting/pausing. (Default-playlist happy-path still benefits from a dedicated run.)
```

> Note: the live-Spotify happy paths (default playlist / recommendations actually adding songs) are not unit-tested because the provider's `HttpClient` is not injectable for mocking — consistent with the existing test suite, which only covers DB-only and best-effort/early-return paths. Those paths are covered by the manual E2E in 7.2.
