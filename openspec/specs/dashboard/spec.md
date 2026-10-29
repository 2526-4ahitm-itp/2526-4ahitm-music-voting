# Dashboard Specification

## Purpose

Defines the monitor/TV display: what is continuously visible, what is never visible, and how the dashboard behaves across reloads. The dashboard is a passive viewer plus the audio sink — it contains no host controls.
## Requirements
### Requirement: Persistent Dashboard Elements
The dashboard MUST continuously display:
- a QR code for joining the party,
- the currently playing song's cover, title, and artist,
- an animated progress bar with elapsed/total time in `mm:ss / mm:ss` format,
- the queue with cover, title, artist, and like count per entry, sorted per `queue/spec.md`.

#### Scenario: All elements visible during playback
- GIVEN a party is playing a song with a non-empty queue
- WHEN a viewer looks at the dashboard
- THEN the QR code, current song info, animated progress bar, time readout, and sorted queue are all visible simultaneously

#### Scenario: Dashboard queue and now-playing update without reload
- GIVEN the TV dashboard is open and displaying the queue and current track
- WHEN a guest adds a song, a guest votes, or the host skips to the next song
- THEN the dashboard updates its queue or current-track display within a few seconds
- AND no manual page reload is required

### Requirement: Live Updates via SSE
The TV dashboard MUST maintain a persistent SSE connection to `/api/spotify/events?source=web&partyId={id}`. It MUST react to the following events:

| Event | Action |
|---|---|
| `queue-updated` | Reload queue from `GET /track/queue` |
| `vote-updated` | Reload queue (to refresh like counts and sort order) |
| `track-changed` | Reload current track from `GET /track/current` and reload queue |
| `party-ended` | Navigate to home page |

The dashboard MUST NOT rely exclusively on polling for any of the above state changes; SSE MUST be the primary update path.

#### Scenario: Queue refreshes live on an SSE event
- GIVEN the TV dashboard holds an open SSE connection to its party
- WHEN a `queue-updated` event arrives
- THEN the dashboard reloads the queue from `GET /track/queue`
- AND no manual page reload is required

### Requirement: No Host Controls on Dashboard
The dashboard MUST NOT expose pause, resume, skip, remove, blacklist, or end-party controls. These live on the host client only.

#### Scenario: Dashboard contains no control affordances
- GIVEN the dashboard is connected to a party
- WHEN a viewer inspects the dashboard UI
- THEN no button or gesture allows pause, resume, skip, remove, blacklist edits, or ending the party

### Requirement: Dashboard Does Not Attribute Songs to Guests
The dashboard MUST NOT display which guest requested a given song.

#### Scenario: No requester shown
- GIVEN guest A added song X
- WHEN the dashboard renders the queue entry for song X
- THEN no indication of guest A (or any guest) is shown

### Requirement: Timestamp-Based Progress Bar
The TV player (`/startpage`) runs the Web Playback SDK, so its progress bar MUST follow the SDK's reported position rather than accumulating a counter or recomputing from `playbackStartedAt`.

On every 1-second tick the TV player MUST read `player.getCurrentState()` and set `currentPosition = state.position`, falling back to local interpolation (`currentPosition += 1000 ms`) only when the SDK returns no state. The progress percentage MUST be measured against the SDK `state.duration`, falling back to the queue entry's `duration_ms` only before the first SDK state arrives.

Clients that do NOT own the SDK (e.g. the host control client) MUST instead mirror the player position via the `progress` SSE relay — see `playback/spec.md` "Cross-Client Playback Progress Relay" and `host/spec.md` "Host Sees Synchronized Progress Bar".

#### Scenario: Player bar tracks the SDK position and survives a seek
- GIVEN song X is playing on the TV player
- WHEN the listener seeks within the track
- THEN within ~1 s the player's progress bar reflects the new SDK position
- AND the bar does not drift from the audio over time

#### Scenario: Progress bar resumes after startpage reload
- GIVEN the player shows song X at 1:30
- WHEN the TV browser reloads the startpage (device re-registers)
- THEN the backend resumes song X at ≈ 1:30 (see playback "Device Re-registration Resumes At Current Position")
- AND the player's progress bar continues from ≈ 1:30 rather than resetting to 0:00

### Requirement: Dashboard Reconnects Without PIN
After a reload or transient disconnect, the dashboard MUST automatically reconnect to the same party without prompting for the PIN again.

#### Scenario: Dashboard reloads
- GIVEN the dashboard is bound to party P (PIN entered previously)
- WHEN the dashboard's browser reloads
- THEN the dashboard rejoins party P automatically
- AND the PIN is not requested again

