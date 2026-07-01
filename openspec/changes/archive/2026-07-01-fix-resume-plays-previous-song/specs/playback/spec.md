## ADDED Requirements

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
