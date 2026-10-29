## Context

- `TrackResource.addToPlaylist(List<String> uris)` has no guest identity; votes already carry `deviceId` in their body. The iOS app posts the same URI list.
- `TrackResource.search(@QueryParam("q") String q)` forwards `q` to `SpotifyMusicProvider.searchTracks`, which URL-encodes it; `null` crashes (500). `SpotifyMusicProvider` already has `topChartsPlaylistId` (`spotify.topcharts.playlist.id`) and `getPlaylistTrackUris` for the auto-refill.
- `pages/guest/guest.ts` clears the list for an empty query and opens SSE without `partyId`; `pages/voting-comp/voting-comp.ts` shows how to pass it.
- Backend tests mock `SpotifyMusicProvider` (`@InjectMock`) in `TrackResourceTest`.

## Goals / Non-Goals

**Goals:** make the three spec requirements true with minimal, additive API changes; keep host and iOS behavior unchanged.

**Non-Goals:** persistent/distributed rate limiting (single backend pod), iOS changes, picking the deployment's top-charts playlist.

## Decisions

### 1. `deviceId` as an optional query parameter
`POST …/addToPlaylist?deviceId=…` keeps the body (a JSON array) unchanged, so the iOS app and host search keep working. Only requests with a non-blank `deviceId` are limited.
**Alternative:** body `{ uris, deviceId }` — rejected, breaking for iOS.
**Alternative:** limit by client IP — rejected: behind the ingress every request has the same IP.

### 2. In-memory sliding window, `GuestAddRateLimiter`
`@ApplicationScoped` service with `ConcurrentHashMap<String, Deque<Instant>>` keyed by `partyId|deviceId`. `tryAcquire(partyId, deviceId, songs, now)`: drop timestamps older than 60 s; if `count + songs > 10` return false without recording; else record one timestamp per song. Synchronized per key (`compute`). Empty deques are removed to keep memory bounded. The `now` parameter makes it testable without sleeping; a convenience overload uses `Instant.now()`.
Attempts that the provider later rejects (409 duplicate) still count — the spec limits requests ("Zu viele Anfragen"), and counting before the provider call keeps the check cheap.
**Trade-off:** state is per pod and lost on restart — acceptable for one backend replica and a one-minute window.

### 3. Top charts via the existing playlist setting
`MusicProvider.topChartTracks(Party)` as a default method returning `{"tracks":{"items":[]}}` (YouTube etc.). `SpotifyMusicProvider` reads the first 10 tracks of `topChartsPlaylistId` with `fields=items(track(id,uri,name,duration_ms,artists(name),album(images)))`, maps them to `tracks.items` (same shape as search), and returns the empty shape on any failure. `TrackResource.search` calls it for blank/missing `q`; `searchTracks` also guards blank input as defense in depth.
**Alternative:** a hard-coded Spotify editorial "Top 50" ID — rejected: Spotify blocks editorial playlists for newer apps, and the ID would be a hidden config.

### 4. Frontend
- `SpotifyWebPlayerService.addToPlaylist(uri, deviceId?)` appends `?deviceId=` only when given; `Guest.addToPlaylist` passes `partyService.deviceId`, `SearchHost` doesn't.
- `Guest.search('')` requests the top charts instead of clearing; a `showingTopCharts` flag (query empty and results present) renders a small white heading „Top-Charts“ above the list (text only, no container).
- `Guest` injects `PartyService` and opens `/api/spotify/events?source=web&partyId=…`.

## Risks / Trade-offs

- [Top charts invisible without config] → documented in proposal/API docs; the welcome text remains the fallback. For local verification a playlist of the host is configured in the git-ignored `ai/scratch/backend.env`.
- [Rate limit bypass by clearing localStorage] → accepted; the limit protects against accidental spamming, not attackers.
- [iOS unlimited] → follow-up change to send `deviceId`.

## Migration Plan

Backend and frontend deploy together; both changes are additive, so either order works. Rollback = revert.
