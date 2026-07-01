# Playback Specification

## Purpose

Defines how music actually plays: where it plays, how songs advance, and what happens when the queue empties. Playback decisions are driven by the queue and by host controls.
## Requirements
### Requirement: Playback Device Availability Exposed to Clients
`GET /party/{id}/track/current` MUST include a `deviceActive` boolean field. For Spotify parties, `deviceActive` MUST be `true` if and only if a non-blank Spotify playback device ID is currently registered for the party (`SpotifyCredentials.getDeviceId()`). For parties using a provider without a device concept, `deviceActive` MUST be `true`.

#### Scenario: No device registered yet
- GIVEN a Spotify party where the dashboard/startpage has never been opened
- WHEN any client calls `GET /party/{id}/track/current`
- THEN the response includes `"deviceActive": false`

#### Scenario: Device registered
- GIVEN the dashboard/startpage has opened and registered a Spotify Web Playback SDK device for the party
- WHEN any client calls `GET /party/{id}/track/current`
- THEN the response includes `"deviceActive": true`

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

### Requirement: Device Re-registration Resumes At Current Position
Registering a new Web Playback SDK device MUST NOT rewind the current track to 0:00. When the TV/startpage browser registers a new device via `PUT /party/{id}/spotify/deviceId`, the backend (`restoreCurrentTrackOnDevice`) MUST:
1. Compute the current position from the party's elapsed-progress model — `pausedPositionMs` if paused, else `now() − playbackStartedAt`.
2. Play the current/last track on the new device with `position_ms` set to that position, so playback resumes where it was instead of restarting at 0:00. When the position is 0, `position_ms` MAY be omitted.
3. On success, write `playbackStartedAt = now() − position` and `pausedPositionMs = null`, so `GET /track/current` stays consistent with the resumed position.
4. Emit a `track-changed` SSE event so all clients reload their current-track state.

If another device is already actively playing the party, the backend MUST NOT re-issue play; it only refreshes its cached playback (unchanged from before).

#### Scenario: Opening the player keeps the current position
- GIVEN song X has been playing for 30 s
- WHEN the TV browser opens or reloads the startpage and registers a new device
- THEN the backend resumes song X at ≈ 0:30 on the new device (not 0:00)
- AND `playbackStartedAt` is set to `now() − 30 s`
- AND a `track-changed` SSE event is emitted

### Requirement: Cross-Client Playback Progress Relay
The TV player owns the Spotify Web Playback SDK and is the only real source of track position. It MUST publish its position so other clients of the same party can mirror it, reusing the existing SSE event bus (no WebSocket).

- The player MUST `POST /party/{id}/track/progress` with `{position, duration, paused}` about once per second while a track is loaded.
- The backend MUST re-broadcast each call as a `progress` SSE event scoped to the party. The payload carries `position`, `duration`, and `paused` (as strings) plus `source=web` and `partyId`.
- The `/spotify/events` stream MUST deliver `progress` events only to clients whose `partyId` matches, regardless of the client `source`:
  - The **web** branch delivers party-scoped events (`progress`, `queue-updated`, `track-changed`, `vote-updated`) to clients whose `partyId` matches.
  - The **iOS** branch MUST deliver the same party-scoped events to a client whose `partyId` matches, in addition to `party-ended` and events targeted by `installationId`. An iOS client MUST supply `partyId` on the `/spotify/events` query.
- `POST /track/progress` is best-effort: it MUST NOT mutate playback or call Spotify, and a failure MUST NOT disrupt playback.

#### Scenario: Host client mirrors the player position
- GIVEN the TV player is playing song X at 1:12
- WHEN the player publishes its position
- THEN a `progress` event is broadcast to the party's SSE subscribers
- AND the host control client updates its progress bar to ≈ 1:12 within ~1 s
- AND no Spotify API call is made for this update

#### Scenario: iOS client receives party-scoped progress events
- GIVEN an iOS host admin view is subscribed to `/spotify/events` with `source=ios` and the party's `partyId`
- WHEN the TV player publishes its position for that party
- THEN the `progress` event is delivered to the iOS subscriber
- AND `progress` events for a different party are NOT delivered to it


### Requirement: SSE Streams Deliver Only Events for the Subscribed Party
Every SSE event that carries a `partyId` in its payload MUST be delivered only to clients whose `partyId` query parameter matches that payload value. This applies to all event types: `progress`, `queue-updated`, `track-changed`, `vote-updated`, and `party-ended`. A client that supplies no `partyId` query parameter MAY receive all events of that type (backward-compatible fallback).

#### Scenario: party-ended for party A is not delivered to a client on party B
- GIVEN two parties A and B are active
- AND client X is subscribed to `/spotify/events` with `partyId=A`
- WHEN party B is ended and a `party-ended` event is emitted with `partyId=B`
- THEN the event is NOT delivered to client X
- AND client X remains on the active party A screen

#### Scenario: party-ended is delivered to the correct party
- GIVEN client Y is subscribed to `/spotify/events` with `partyId=B`
- WHEN party B is ended
- THEN the `party-ended` event IS delivered to client Y
- AND client Y navigates back to the start page

### Requirement: Resume Re-Asserts the Current Track

Resuming playback (`POST /track/resume`) MUST start the party's current track — the `QueueEntry` referenced by `PartyEntity.currentlyPlayingEntryId` — by its uri, at the stored paused position, rather than issuing a bare Spotify play with no uris. A bare resume replays whatever track the device currently holds, which after an auto-advance may differ from the current track; naming the uri makes resume deterministic.

When there is no known current track (`currentlyPlayingEntryId` is null or its entry is missing), the system MAY fall back to a bare resume. On a successful resume the system MUST update the progress model exactly as today (adjust `playbackStartedAt` from the paused position, clear `pausedPositionMs`) and mark `lastPlaybackActive = true`.

#### Scenario: Resume plays the displayed song, not the device's stale track
- **GIVEN** the party's current track is song B (displayed on all clients)
- **AND** the Spotify device still has song A loaded from a prior transition
- **WHEN** the host presses Play (resume)
- **THEN** the backend starts song B by uri at the paused position
- **AND** song B plays — not song A

#### Scenario: Resume without a known current track
- **GIVEN** `currentlyPlayingEntryId` is null
- **WHEN** the host presses Play (resume)
- **THEN** the backend performs a bare resume without failing

### Requirement: Advance Commits on Play Acceptance

When advancing to the next song (`/track/next`), after `PUT /me/player/play` for the next entry returns a `2xx`, the backend MUST commit the advance: delete the previous current entry and set `currentlyPlayingEntryId` to the new entry. It MUST NOT read `getCurrentPlaybackSnapshot` (or otherwise probe the device) to gate this commit.

Rationale: Spotify's `currently-playing` read lags the play command by seconds and reports the *previous* track during that window, so gating the commit on it refuses healthy advances — pinning `current` to the finished song and stalling autoplay. Any real advance drift is instead made observable by the diagnostic logging and corrected deterministically by the resume re-assert (see "Resume Re-Asserts the Current Track").

#### Scenario: Play accepted — advance commits immediately
- **GIVEN** song A is current and song B is next
- **WHEN** `/track/next`'s play call for song B returns `2xx`
- **THEN** `currentlyPlayingEntryId` is set to song B and song A is removed from the queue
- **AND** the backend does not read the device snapshot to decide whether to commit

#### Scenario: Advance does not stall when the device snapshot lags
- **GIVEN** song A is current and song B is next
- **WHEN** `/track/next`'s play call returns `2xx` while Spotify's `currently-playing` still reports song A
- **THEN** the advance still commits to song B (the lagging snapshot does not block it)
- **AND** `current` never remains pinned to the finished song A

### Requirement: Diagnostic Logging on Playback Start/Stop Operations

Every backend operation that starts or stops playback MUST emit exactly one diagnostic log line, at INFO level, via `io.quarkus.logging.Log`. The operations covered are: start first song (`/track/start`), advance to next (`/track/next`), play a specific track (`/track/play`), pause (`/track/pause`), and resume (`/track/resume`).

Each log line MUST include:
- the operation name (e.g. `START`, `NEXT`, `PLAY`, `PAUSE`, `RESUME`) and the party id;
- the ordered current queue — for each entry, its `trackName`, `trackUri`, and entry `id`, in the same sort order `/track/queue` returns;
- `currentlyPlayingEntryId` (the entry the backend considers the current/displayed track);
- the computed next song (the first queue entry other than `currentlyPlayingEntryId`), or an explicit "none" marker when absent;
- the track the Spotify device actually reports loaded — its `uri` and `is_playing`, obtained via a best-effort `getCurrentPlaybackSnapshot` call.

Gathering the log data MUST be best-effort: a failure to read the queue or the Spotify device snapshot MUST NOT change the outcome of the playback operation. Logging MUST NOT alter any playback behavior, response, or persisted state.

#### Scenario: Advance logs backend-vs-device state
- **WHEN** the backend handles `/track/next` for a party whose current track is song B but whose Spotify device still holds song A
- **THEN** a single INFO log line is emitted naming the operation `NEXT`
- **AND** it lists the current queue, `currentlyPlayingEntryId` (song B), the computed next song, and the device-loaded uri (song A) with its `is_playing` flag

#### Scenario: Device snapshot unavailable does not break the operation
- **WHEN** a start/stop operation runs but the `getCurrentPlaybackSnapshot` call fails or returns no content
- **THEN** the operation completes normally with its usual response
- **AND** the log line is still emitted, marking the device-loaded track as unavailable

