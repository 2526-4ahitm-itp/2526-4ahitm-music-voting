## ADDED Requirements

### Requirement: Diagnostic Logging on Playback Start/Stop Operations

Every backend operation that starts or stops playback MUST emit exactly one diagnostic log line, at INFO level, via `io.quarkus.logging.Log`. The operations covered are: start first song (`/track/start`), advance to next (`/track/next`), play a specific track (`/track/play`), pause (`/track/pause`), and resume (`/track/resume`).

Each log line MUST include:
- the operation name (e.g. `START`, `NEXT`, `PLAY`, `PAUSE`, `RESUME`) and the party id;
- the ordered current queue — for each entry, its `trackName`, `trackUri`, and entry `id`, in the same sort order `/track/queue` returns;
- `currentlyPlayingEntryId` (the entry the backend considers the current/displayed track);
- the computed next song (the entry `/track/next` would select — the first queue entry other than `currentlyPlayingEntryId`), or an explicit "none" marker when the queue has no such entry;
- the track the Spotify device actually reports loaded — its `uri` and `is_playing`, obtained via a best-effort `getCurrentPlaybackSnapshot` call.

Gathering the log data MUST be best-effort: a failure to read the queue or the Spotify device snapshot MUST NOT change the outcome of the playback operation. Logging MUST NOT alter any playback behavior, response, or persisted state.

#### Scenario: Advance logs backend-vs-device state
- **WHEN** the backend handles `/track/next` for a party whose current track is song B but whose Spotify device still holds song A
- **THEN** a single INFO log line is emitted naming the operation `NEXT`
- **AND** it lists the current queue with each entry's name, uri, and id
- **AND** it reports `currentlyPlayingEntryId` resolving to song B, the computed next song, and the device-loaded uri resolving to song A with its `is_playing` flag

#### Scenario: Device snapshot unavailable does not break the operation
- **WHEN** a start/stop operation runs but the Spotify `getCurrentPlaybackSnapshot` call fails or returns no content
- **THEN** the operation completes normally with its usual response
- **AND** the log line is still emitted, marking the device-loaded track as unavailable

#### Scenario: Logging never changes playback outcome
- **WHEN** any of `/track/start`, `/track/next`, `/track/play`, `/track/pause`, or `/track/resume` is handled
- **THEN** the persisted state, HTTP response, and emitted SSE events are identical to what they would be without the logging
