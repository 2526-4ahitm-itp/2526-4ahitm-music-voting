# Tasks

## 1. Data model
- [ ] 1.1 Add nullable `defaultPlaylistId` (String) to `PartyEntity` and the `party` table (`setup.sql` + migration note)
- [ ] 1.2 Ensure `findOrReconstruct` / `findById` carry `defaultPlaylistId` through DB-backed party resolution
- [ ] 1.3 Add an `autofilled` boolean flag to the queue entry (DB + entity) used as a secondary sort key so guest entries sort above auto-filled ones

## 2. Provider capabilities (SpotifyMusicProvider + MusicProvider)
- [ ] 2.1 `listHostPlaylists(Party)` → `GET /v1/me/playlists` (id, name, trackCount, imageUrl)
- [ ] 2.2 `getPlaylistTrackUris(Party, playlistId)` → `GET /v1/playlists/{id}/tracks`
- [ ] 2.3 `getRecommendationUris(Party, seedTrackId)` → `GET /v1/recommendations?seed_tracks=...` (best-effort; signal failure to caller)
- [ ] 2.4 Configurable Top-Charts playlist id (env var) used as the recommendations fallback source

## 3. Backend endpoints
- [ ] 3.1 `GET /api/party/{id}/spotify/playlists` (@HostOnly, `findById`) returning the host's playlists
- [ ] 3.2 `PUT /api/party/{id}/default-playlist` (@HostOnly) to set/clear `defaultPlaylistId`

## 4. Auto-refill logic
- [ ] 4.1 `refillQueue(Party)` service: if queue (excluding current) is empty and a song is playing, add up to 5 songs to the bottom — from the default playlist if set, else recommendations, else Top-Charts fallback; mark them `autofilled`
- [ ] 4.2 De-duplicate against already played/queued track URIs this party
- [ ] 4.3 Call `refillQueue` after `playNextAndRemove(...)` and `startFirstSongWithoutRemoving(...)`
- [ ] 4.4 Apply the `autofilled` secondary sort so guest entries (and upvotes) always outrank auto-filled songs
- [ ] 4.5 Emit the existing `queue-updated` SSE event after a refill so clients reload

## 5. Web host creation flow
- [ ] 5.1 After the Spotify OAuth callback, route the web host to a playlist-picker page instead of straight to the dashboard
- [ ] 5.2 Playlist picker: call `GET /api/party/{id}/spotify/playlists`, list playlists, with a prominent "Ohne Standard-Playlist fortfahren" skip action
- [ ] 5.3 On select → `PUT /api/party/{id}/default-playlist`; on skip → no default; both navigate to the host dashboard

## 6. Tests
- [ ] 6.1 Backend: provider playlist/recommendations methods (mocked Spotify), incl. recommendations-unavailable → Top-Charts fallback
- [ ] 6.2 Backend: `refillQueue` — default-playlist path, recommendations path, empty/dedup path, `autofilled` sort below guest entries
- [ ] 6.3 Backend: endpoint auth (`@HostOnly`) for playlists + default-playlist
- [ ] 6.4 Frontend: playlist-picker component (list, select, skip → dashboard)

## 7. Verify
- [ ] 7.1 Run backend + frontend test suites; confirm green (see project testing guidance — tests are part of the work, not optional)
- [ ] 7.2 Manually verify end-to-end: create party → pick playlist → let queue drain → playback continues from playlist; repeat with skip → continues via recommendations/Top-Charts; confirm a guest add jumps ahead of auto-filled songs
