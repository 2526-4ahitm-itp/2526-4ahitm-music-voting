# Δ playback/spec.md

## Add after "Advance on Song End or Skip"

### Requirement: DB-Backed Currently Playing Track
`PartyEntity.currentlyPlayingEntryId` MUST be the single source of truth for which song is currently playing. `GET /track/current` MUST read from this field and return the matching `QueueEntry` row — it MUST NOT call Spotify's `/me/player/currently-playing` API to determine the track identity. The Spotify API MAY still be called to read the real-time `is_playing` and `progress_ms` playback state for the response.

#### Scenario: Current track comes from DB, not Spotify
- GIVEN the host's Spotify account is playing a personal playlist on another device
- AND the app queue has song X as `currentlyPlayingEntryId`
- WHEN any client calls `GET /track/current`
- THEN the response contains song X's metadata (from `queue_entry`)
- AND the host's personal-playlist track is NOT returned

### Requirement: track-changed SSE Event on Advance or Start
After a successful `/track/next` or `/track/start` call, the backend MUST emit a `track-changed` SSE event scoped to the party. All subscribed clients MUST reload their currently-playing track and queue on receipt.

#### Scenario: Skip triggers live update
- GIVEN the host skips the current song
- WHEN `/track/next` succeeds
- THEN a `track-changed` event is broadcast to all web clients subscribed to that party's SSE stream
- AND each client refreshes its current-track display and queue without polling

## Update "Advance on Song End or Skip — Scenario: Natural advance"

Add: When song X ends on the dashboard (TV), the dashboard detects the end-of-song via the Spotify Web Playback SDK and calls `/track/next`. The resulting `track-changed` SSE event causes the host dashboard to immediately refresh — no separate timer-based advance runs on the host dashboard.
