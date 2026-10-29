# Dashboard Specification

## Purpose

Defines the monitor/TV display: what is continuously visible, what is never visible, and how the dashboard behaves across reloads. The dashboard is a passive viewer plus the audio sink — it contains no host controls.
## Requirements
### Requirement: Persistent Dashboard Elements
The dashboard MUST continuously display:
- a QR code for joining the party, together with the party PIN,
- the currently playing song's cover, title, and artist,
- an animated progress bar with elapsed/total time in `mm:ss / mm:ss` format,
- an „Als Nächstes“ list of the next up to five queue entries (excluding the currently playing song), each with its position, cover, title, artist, and like count, sorted per `queue/spec.md`,
- when more than five entries wait, the number of further entries (e.g. „+ 3 weitere“).

The up-next list MUST be a single vertical list in queue order (position 1 at the top), not a multi-column grid, so the reading order matches the play order.

#### Scenario: All elements visible during playback
- GIVEN a party is playing a song with a non-empty queue
- WHEN a viewer looks at the dashboard
- THEN the QR code, PIN, current song info, animated progress bar, time readout, and the up-next list are all visible simultaneously

#### Scenario: Like counts are visible on the TV
- GIVEN the next song in the queue has 4 likes
- WHEN a viewer looks at the up-next list
- THEN the entry at position 1 shows that song with its like count 4

#### Scenario: Long queue is summarized
- GIVEN 8 songs wait in the queue besides the playing one
- WHEN the dashboard renders the up-next list
- THEN it shows positions 1–5
- AND it shows „+ 3 weitere“

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

### Requirement: TV Legible From Across the Room
The TV player (`/startpage`) MUST size its text and join elements relative to the screen height so they stay readable from a sofa distance of about 3–5 m on a typical living-room TV. At a 1920×1080 viewport:
- the current song's title MUST be at least 5vh, its artist at least 3.2vh,
- up-next titles MUST be at least 3.2vh and like counts at least 3.2vh,
- the PIN digits MUST be at least 8vh,
- the QR code MUST be at least 30vh tall,
- no text on the TV MUST be smaller than 2.2vh.
All TV text MUST meet WCAG AA contrast (4.5:1, or 3:1 for text of at least 3.2vh bold). The layout MUST NOT clip or overflow content at 1920×1080, 1440×900 or 1280×720. The binding „powered by HTL Leonding“ mark MUST remain visible.

#### Scenario: Readable at TV size
- GIVEN the TV player at 1920×1080 with a playing song and 7 queued songs
- WHEN the computed styles are measured
- THEN the title is at least 54px, up-next titles at least 34px, PIN digits at least 86px and the QR code at least 324px tall
- AND no visible text is smaller than 23px

#### Scenario: No clipping on a laptop screen
- GIVEN the TV player at 1440×900 with 7 queued songs
- WHEN a viewer looks at the screen
- THEN no element overflows its panel and no up-next entry is cut off

### Requirement: Room-Facing Idle States
When no song is playing, the TV player MUST address the guests in the room, not the host: it MUST invite them to join via the QR code or PIN and MUST NOT tell the room to use host controls (e.g. no „im Dashboard starten“). When the queue is empty, the up-next area MUST say how to add the first song.

#### Scenario: Playlist not started yet
- GIVEN a party has queued songs but nothing is playing
- WHEN a viewer looks at the TV player
- THEN the now-playing area invites guests to scan the QR code and vote
- AND no text refers to the host dashboard

#### Scenario: Empty party
- GIVEN a party with no queued songs and nothing playing
- WHEN a viewer looks at the TV player
- THEN the up-next area explains that guests can add the first song via the QR code

