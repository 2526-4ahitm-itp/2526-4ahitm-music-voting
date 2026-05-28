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

When `isPlaying` is `true`, the response MUST also include `playbackStartedAt` as an ISO-8601 string so that clients can compute `currentPosition = clientNow − playbackStartedAt` on every timer tick without drift.

#### Scenario: Progress survives pause/resume without Spotify
- GIVEN song X has been playing for 45 s and is then paused at 45 s
- WHEN the host resumes playback
- THEN `playbackStartedAt` is adjusted so that `now() − playbackStartedAt = 45 s`
- AND subsequent calls to `GET /track/current` return `progressMs ≈ 45 s + elapsed-since-resume`
- AND no call to Spotify's player API is made

### Requirement: Device Re-registration Resets Progress
When the TV/startpage browser registers a new Spotify Web Playback SDK device via `PUT /party/{id}/spotify/deviceId`, the backend MUST:
1. Call `restoreCurrentTrackFromBeginningOnDevice` — which plays the current track from position 0 on the new device.
2. On success, write `playbackStartedAt = now()` and `pausedPositionMs = null` to `PartyEntity` so that `GET /track/current` reflects the restart.
3. Emit a `track-changed` SSE event so all clients (including the host dashboard) reload their current-track state immediately.

This ensures the dashboard progress bar resets to 0 whenever the startpage reloads and re-registers its device, rather than continuing from the old position.

#### Scenario: Startpage reload resets dashboard progress bar
- GIVEN song X has been playing for 1 min 30 s
- WHEN the TV browser reloads the startpage and registers a new device
- THEN the backend resets `playbackStartedAt = now()` in the DB
- AND emits `track-changed` SSE
- AND the dashboard receives the event, calls `GET /track/current`, gets `playbackStartedAt ≈ now()`
- AND the dashboard progress bar resets to 0:00

### Requirement: track-changed SSE Event on Advance or Start
After a successful `/track/next` or `/track/start` call, the backend MUST emit a `track-changed` SSE event scoped to the party. All subscribed clients MUST reload their currently-playing track and queue on receipt.

#### Scenario: Skip triggers live update
- GIVEN the host skips the current song
- WHEN `/track/next` succeeds
- THEN a `track-changed` event is broadcast to all web clients subscribed to that party's SSE stream
- AND each client refreshes its current-track display and queue without polling

### Requirement: Track Advance Selects the Entry After the Current One
`POST /track/next` MUST advance to the first queue entry whose ID is different from the currently playing entry's ID. The currently playing entry MUST NOT be selected as the next track, even though it is still present in the `queue_entry` table at the time of the call.

#### Scenario: Normal advance with multiple tracks
- GIVEN the queue contains [Song A (currently playing), Song B, Song C] in sort order
- WHEN `POST /track/next` is called
- THEN Song B is played (not Song A)
- AND Song A is removed from the queue
- AND `currentlyPlayingEntryId` is set to Song B's ID

#### Scenario: Advance when only the current track remains
- GIVEN the queue contains only Song A (currently playing)
- WHEN `POST /track/next` is called
- THEN Song A is deleted from the queue
- AND `currentlyPlayingEntryId` is cleared
- AND the response indicates the queue is empty

### Requirement: Track Advance Is Idempotent Within a Short Window
The frontend MUST NOT call `POST /track/next` more than once for a single song-end event. A guard MUST prevent concurrent or near-concurrent calls within 3 seconds of a successful advance.

#### Scenario: Spotify SDK fires spurious state during track transition
- GIVEN a song just ended and `playNext()` was called successfully
- WHEN the Spotify SDK fires another `paused=true, position=0` state during the transition to the new track
- THEN the second `playNext()` call is ignored
- AND the newly started track continues playing uninterrupted

### Requirement: Empty Queue Behavior
When the queue is empty, the dashboard MUST show an "Warteschlange ist leer" state and playback MUST stop or pause (provider-dependent).

#### Scenario: Last song finishes with empty queue
- GIVEN only song X is in the queue and it is playing
- WHEN song X ends
- THEN the queue is empty
- AND the dashboard displays "Warteschlange ist leer"
- AND no further song starts automatically

### Requirement: Spotify Player Disconnects When Party Ends
When the startpage (TV/dashboard) receives a `party-ended` SSE event or is otherwise navigated away from, the Spotify Web Playback SDK player MUST be paused and disconnected before navigation completes so that no audio continues on the device after the party is over.

#### Scenario: Party ended while music is playing
- GIVEN the startpage has an active Spotify Web Playback SDK player with a song playing
- WHEN a `party-ended` SSE event is received
- THEN the player is paused and disconnected
- AND the app navigates to the home page
- AND no audio is audible after navigation

#### Scenario: Startpage destroyed for any reason
- GIVEN the startpage component is active with a connected Spotify player
- WHEN the component is destroyed (any navigation away)
- THEN the player is disconnected as part of cleanup

### Requirement: No Play History
The system MUST NOT retain a history of previously played songs. Once a song leaves the queue (by completion or skip), it MUST NOT reappear automatically.

#### Scenario: Played song does not auto-rejoin queue
- GIVEN song X just finished and is out of the queue
- WHEN the system updates the queue
- THEN song X is not re-added as "recently played" or "history"
- AND song X can be re-added only by a guest through search (subject to queue rules)
