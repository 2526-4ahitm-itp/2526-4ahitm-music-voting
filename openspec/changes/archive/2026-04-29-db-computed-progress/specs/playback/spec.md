# Δ playback/spec.md

## Add "DB-Computed Progress" requirement (before "track-changed SSE")

### Requirement: DB-Computed Progress (No Spotify Polling)
`PartyEntity` MUST store two fields to track playback position without polling Spotify:
- `playbackStartedAt` (`TIMESTAMPTZ`) — set to `now()` when playback starts or resumes (adjusted on resume).
- `pausedPositionMs` (`BIGINT`) — snapshot on pause, cleared on resume or track change.

`GET /track/current` MUST compute `progressMs` from these fields. No Spotify API call inside this endpoint.

## Update "DB-Backed Currently Playing Track"

Change: "The Spotify API MAY still be called…" → "MUST NOT call Spotify's API at all."
Add: `isPlaying` comes from `SpotifyCredentials.lastPlaybackActive`; `progressMs` from `playbackStartedAt`/`pausedPositionMs`.
