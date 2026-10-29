## 1. Baseline

- [x] 1.1 Backend tests green (`dbx` with `ai/scratch/backend.env`, PostgreSQL via `ai/scratch/postgres/pg.sh`); reproduce: empty search → 500, 11 adds → all 200

## 2. Backend: rate limit

- [x] 2.1 `service/GuestAddRateLimiter.java` (sliding 60 s window, max 10 songs, per party + deviceId, testable `now`), with comments
- [x] 2.2 `TrackResource.addToPlaylist`: optional `@QueryParam("deviceId")`; 429 with `{"error":"Zu viele Anfragen — bitte kurz warten."}` when the limiter refuses
- [x] 2.3 Tests: `GuestAddRateLimiterTest` (10 ok / 11th refused, per device, window rollover, multi-song request, blank deviceId not limited in resource); `TrackResourceTest` (11th add → 429 with message; without deviceId → no limit)

## 3. Backend: empty search

- [x] 3.1 `MusicProvider.topChartTracks` default (empty result); `SpotifyMusicProvider.topChartTracks` (first 10 of the configured playlist, search-shaped, empty on failure); blank guard in `searchTracks`
- [x] 3.2 `TrackResource.search`: blank/missing `q` → `topChartTracks`
- [x] 3.3 Tests: `TrackResourceTest` (empty and missing `q` → 200 with provider top charts)

## 4. Frontend

- [x] 4.1 `spotify-player.ts`: `addToPlaylist(uri, deviceId?)` appends the query parameter; test
- [x] 4.2 `guest.ts`: pass `deviceId` on add; inject `PartyService`; SSE URL with `partyId`; empty query loads top charts; `showingTopCharts`
- [x] 4.3 `guest.html`/`.css`: „Top-Charts“ heading (text on the gradient, no container)
- [x] 4.4 `guest.spec.ts`: deviceId passed on add, SSE URL contains partyId, empty search requests top charts, heading shown only for top-chart results

## 5. Docs and verify

- [x] 5.1 `hugo/content/dev/api-reference.md`: `deviceId` + 429 on addToPlaylist, empty `q` on search
- [x] 5.2 Backend and frontend tests green; frontend build
- [x] 5.3 Live check in the devbox: 11th guest add → toast „Zu viele Anfragen — bitte kurz warten.“; empty search with a locally configured playlist shows „Top-Charts“ (screenshots); remove the test songs added during the check
- [x] 5.4 Show screenshots to Miriam and get her OK before committing
