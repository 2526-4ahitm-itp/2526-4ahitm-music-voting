# Δ dashboard/spec.md

## MODIFIED Requirements

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
