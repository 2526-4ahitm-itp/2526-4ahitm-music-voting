# Playback Specification

## Purpose

Defines how music actually plays: where it plays, how songs advance, and what happens when the queue empties. Playback decisions are driven by the queue and by host controls.

## Requirements

### Requirement: Playback on Monitor/TV
The audio MUST play in the dashboard (browser on monitor/TV). Guest and host clients MUST NOT play audio themselves.

#### Scenario: Audio originates on the dashboard only
- GIVEN a party with a dashboard, a host phone, and guest phones connected
- WHEN a song starts playing
- THEN only the dashboard produces audio
- AND no audio is produced by host or guest clients

### Requirement: Advance on Song End or Skip
When the current song ends or is skipped by the host, the system MUST remove that song from the queue and start the next song selected by the queue's sort order.

#### Scenario: Natural advance
- GIVEN song X is playing and song Y is next by sort order
- WHEN song X ends (detected by the TV dashboard via the Spotify Web Playback SDK)
- THEN the TV dashboard calls `/track/next`
- AND song X is removed from the queue
- AND song Y begins playing
- AND a `track-changed` SSE event is emitted so all clients refresh immediately

#### Scenario: Skip advances to next by sort order
- GIVEN song X is playing and song Y is next by sort order
- WHEN the host skips
- THEN song X is removed
- AND song Y begins playing

### Requirement: DB-Backed Currently Playing Track
`PartyEntity.currentlyPlayingEntryId` MUST be the single source of truth for which song is currently playing. `GET /track/current` MUST read from this field and return the matching `QueueEntry` row — it MUST NOT call Spotify's `/me/player/currently-playing` API at all. `isPlaying` MUST come from `SpotifyCredentials.lastPlaybackActive` (updated on every play/pause/resume call). `progressMs` MUST be computed from `PartyEntity.playbackStartedAt` and `PartyEntity.pausedPositionMs` (see "DB-Computed Progress" below).

#### Scenario: Current track comes from DB, not Spotify
- GIVEN the host's Spotify account is playing a personal playlist on another device
- AND the app queue has song X as `currentlyPlayingEntryId`
- WHEN any client calls `GET /track/current`
- THEN the response contains song X's metadata (from `queue_entry`)
- AND the host's personal-playlist track is NOT returned

### Requirement: DB-Computed Progress (No Spotify Polling)
`PartyEntity` MUST store two fields to track playback position without polling Spotify:
- `playbackStartedAt` (`TIMESTAMPTZ`) — set to `now()` whenever playback starts or resumes (adjusted on resume so that `now() − playbackStartedAt = pausedPositionMs`).
- `pausedPositionMs` (`BIGINT`) — set to `now() − playbackStartedAt` when playback is paused; cleared on resume or track change.

`GET /track/current` MUST compute `progressMs = now() − playbackStartedAt` (when playing) or return `pausedPositionMs` (when paused). No Spotify API call is made inside this endpoint.

#### Scenario: Progress survives pause/resume without Spotify
- GIVEN song X has been playing for 45 s and is then paused at 45 s
- WHEN the host resumes playback
- THEN `playbackStartedAt` is adjusted so that `now() − playbackStartedAt = 45 s`
- AND subsequent calls to `GET /track/current` return `progressMs ≈ 45 s + elapsed-since-resume`
- AND no call to Spotify's player API is made

### Requirement: track-changed SSE Event on Advance or Start
After a successful `/track/next` or `/track/start` call, the backend MUST emit a `track-changed` SSE event scoped to the party. All subscribed clients MUST reload their currently-playing track and queue on receipt.

#### Scenario: Skip triggers live update
- GIVEN the host skips the current song
- WHEN `/track/next` succeeds
- THEN a `track-changed` event is broadcast to all web clients subscribed to that party's SSE stream
- AND each client refreshes its current-track display and queue without polling

### Requirement: Empty Queue Behavior
When the queue is empty, the dashboard MUST show an "Warteschlange ist leer" state and playback MUST stop or pause (provider-dependent).

#### Scenario: Last song finishes with empty queue
- GIVEN only song X is in the queue and it is playing
- WHEN song X ends
- THEN the queue is empty
- AND the dashboard displays "Warteschlange ist leer"
- AND no further song starts automatically

### Requirement: No Play History
The system MUST NOT retain a history of previously played songs. Once a song leaves the queue (by completion or skip), it MUST NOT reappear automatically.

#### Scenario: Played song does not auto-rejoin queue
- GIVEN song X just finished and is out of the queue
- WHEN the system updates the queue
- THEN song X is not re-added as "recently played" or "history"
- AND song X can be re-added only by a guest through search (subject to queue rules)
