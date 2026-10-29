## Why

Three spec/code divergences were found while working on the guest UI (2026-10-29):

1. **No per-guest add rate limit.** `guest/spec.md` "Per-Guest Add Rate Limit" requires at most 10 added songs per guest per rolling minute with „Zu viele Anfragen — bitte kurz warten.“; the backend has no limit at all, and the add request does not even identify the guest (the body is only a list of URIs).
2. **Empty search returns HTTP 500.** `search/spec.md` "Empty Search Shows Top Charts" requires the top tracks for an empty input; the backend passes the empty string to Spotify's search (`"s" is null` → 500), and the web frontend never asks for it (it clears the list and shows a welcome text). A top-charts playlist setting (`spotify.topcharts.playlist.id`) already exists for the auto-refill but is not used by search.
3. **`/guest` listens to live events without its party.** The add/search view opens `/api/spotify/events?source=web` without `partyId`, unlike `/voting` and the TV, so it may miss or mix up party-scoped `queue-updated`/`party-ended` events.

## What Changes

- **Rate limit (backend):** `POST /track/addToPlaylist` accepts an optional `deviceId` query parameter. With a `deviceId`, more than 10 songs within a rolling 60 s per party and device are rejected with **429** and `{"error":"Zu viele Anfragen — bitte kurz warten."}`. Requests without `deviceId` (host search, older iOS builds) are not limited.
- **Rate limit (web):** the guest's add request sends its `deviceId`; the existing toast already maps 429 to the spec message. The host's add (`/search-host`) stays unlimited.
- **Top charts (backend):** an empty or missing `q` returns the first 10 tracks of the configured top-charts playlist in the same response shape as a search (`tracks.items`). If no playlist is configured or it cannot be read, the result is an empty list with 200, never 500.
- **Top charts (web):** `/guest` loads them when the search field is empty and shows them under a small heading „Top-Charts“; with no top charts the existing welcome text stays.
- **SSE:** `/guest` passes `partyId` to the event stream like the other views.

Not in scope: sending `deviceId` from the iOS app (follow-up; iOS adds stay unlimited until then), choosing the actual top-charts playlist ID for the deployment (configuration, team decision).

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `guest`: "Per-Guest Add Rate Limit" gets the concrete mechanism (deviceId, rolling window, 429, unlimited without deviceId); new requirement that the add/search view subscribes to its own party's live events.
- `search`: "Empty Search Shows Top Charts" gets its source (configured top-charts playlist), the empty/unavailable behavior and the web presentation.

## Impact

- **Backend:** `endpoints/TrackResource.java`, new `service/GuestAddRateLimiter.java`, `provider/MusicProvider.java` (default `topChartTracks`), `provider/spotify/SpotifyMusicProvider.java`; tests in `TrackResourceTest`, new `GuestAddRateLimiterTest`.
- **Frontend:** `services/spotify-player.ts` (optional `deviceId` on add), `pages/guest/*`; tests.
- **API:** additive only (optional query parameter; empty `q` now 200). Docs: `hugo/content/dev/api-reference.md` (addToPlaylist `deviceId`, 429; search empty `q`).
- **Config:** `spotify.topcharts.playlist.id` should be set in the deployment for top charts to appear; without it the guest sees the welcome text as today.
