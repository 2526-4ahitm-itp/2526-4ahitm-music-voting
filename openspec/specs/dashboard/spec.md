# Dashboard Specification

## Purpose

Defines the monitor/TV display: what is continuously visible, what is never visible, and how the dashboard behaves across reloads. The dashboard is a passive viewer plus the audio sink — it contains no host controls.

## Requirements

### Requirement: Persistent Dashboard Elements
The dashboard MUST continuously display:
- a QR code for joining the party, together with the 5-digit Voting-PIN as large readable digits,
- the currently playing song's cover, title, and artist,
- an animated progress bar with elapsed/total time in `mm:ss / mm:ss` format,
- the queue with cover, title, artist, and like count per entry, sorted per `queue/spec.md`.

The dashboard is viewed from across a room, so it MUST be laid out for viewing distance on a 1920×1080 display:
- The now-playing cover MUST be the largest element on screen (at least 40 % of the viewport height). The now-playing title MUST be at least 48px.
- The QR code MUST be at least 25 % of the viewport height and MUST stay in a fixed position while the queue changes.
- The queue MUST show the top 5 entries with title and like count at a font size of at least 32px. If more entries are waiting, a line "+ N weitere" MUST be shown instead of the rest.
- Text on the dashboard MUST NOT be filled with a gradient (`background-clip: text`).
- The "powered by HTL Leonding" credit MUST be shown as a single footer line that is smaller than every queue entry, not as a separate content block. (The landing page `/` shows the same footer, see `web-ui/spec.md`.)

#### Scenario: All elements visible during playback
- GIVEN a party is playing a song with a non-empty queue
- WHEN a viewer looks at the dashboard
- THEN the QR code, Voting-PIN, current song info, animated progress bar, time readout, and sorted queue are all visible simultaneously

#### Scenario: Dashboard queue and now-playing update without reload
- GIVEN the TV dashboard is open and displaying the queue and current track
- WHEN a guest adds a song, a guest votes, or the host skips to the next song
- THEN the dashboard updates its queue or current-track display within a few seconds
- AND no manual page reload is required

#### Scenario: Long queue is truncated
- GIVEN 17 songs are waiting in the queue
- WHEN the dashboard renders the queue
- THEN the 5 highest-ranked songs are shown with title and like count
- AND the line "+ 12 weitere" is shown below them

#### Scenario: Queue is readable at viewing distance
- GIVEN the dashboard runs in a 1920×1080 browser window
- WHEN the queue is rendered
- THEN every queue title and like count has a computed font size of at least 32px
- AND the now-playing title has a computed font size of at least 48px

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
The dashboard MUST NOT expose pause, resume, skip, remove, blocklist, or end-party controls. These live on the host client only.

#### Scenario: Dashboard contains no control affordances
- GIVEN the dashboard is connected to a party
- WHEN a viewer inspects the dashboard UI
- THEN no button or gesture allows pause, resume, skip, remove, blocklist edits, or ending the party

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

### Requirement: Dashboard Shows a Guest-Facing Empty State
When nothing is playing and the queue is empty, the dashboard MUST address the guests in the room, not the host. It MUST show the text "Scan den Code und wünsch dir den ersten Song!" next to the QR code and Voting-PIN. The dashboard MUST NOT refer to the host dashboard or to host actions. In this state the "Als Nächstes" section MUST NOT be shown; instead the join block (QR code, Voting-PIN, hint) MUST take the whole side column with a larger QR code.

#### Scenario: Empty party on the TV
- GIVEN a party has just been created and no song has been added
- WHEN the dashboard loads
- THEN the text "Scan den Code und wünsch dir den ersten Song!" is shown
- AND the QR code and Voting-PIN are visible
- AND no text mentions the "Dashboard" or the host
- AND "Als Nächstes" is not shown and the QR code is larger than while songs are queued

### Requirement: Dashboard Asks for Wishes When the Queue Runs Empty
When a song plays but nothing is waiting, "Als Nächstes" MUST show "Noch nichts in der Warteschlange – wünsch dir was!".

#### Scenario: Song plays, queue empty
- GIVEN a song is playing and no other song is queued
- WHEN the dashboard shows the queue column
- THEN "Als Nächstes" shows "Noch nichts in der Warteschlange – wünsch dir was!"

### Requirement: Dashboard Animates Rank Changes
When a `vote-updated` or `queue-updated` event changes the order of the visible queue, entries MUST move to their new positions with a transition of at most 400 ms instead of jumping. Newly added entries MUST fade in. If the viewer's system requests reduced motion (`prefers-reduced-motion: reduce`), the reorder MUST happen without movement.

#### Scenario: A song overtakes another
- GIVEN song B is ranked below song A on the dashboard
- WHEN votes make song B rank above song A
- THEN song B visibly moves above song A within 400 ms

#### Scenario: Reduced motion
- GIVEN the TV's browser reports `prefers-reduced-motion: reduce`
- WHEN the queue order changes
- THEN the entries switch positions without a movement animation

### Requirement: Dashboard Cover Images Never Break
Every cover image on the dashboard (now playing and queue) MUST show a placeholder when the track has no image or the image fails to load. A track whose `album.images` array is empty or missing MUST NOT cause a rendering error.

#### Scenario: Track without cover
- GIVEN the currently playing track has an empty `album.images` array
- WHEN the dashboard renders it
- THEN the placeholder cover is shown
- AND the rest of the dashboard renders normally

### Requirement: Dashboard Pulses When a Like Count Changes
When the like count of a visible queue entry changes on the TV dashboard, its heart and its number MUST pulse once (at most 600 ms), so the change is noticeable from the couch. Under `prefers-reduced-motion: reduce` the heart and number MUST only change colour briefly, without scaling or movement. Entries whose count did not change MUST NOT pulse.

#### Scenario: A like makes the entry pulse
- GIVEN song B is shown with 2 likes on the dashboard
- WHEN a `vote-updated` event raises B's like count to 3
- THEN B's heart and number pulse once
- AND the other entries do not pulse

#### Scenario: Reduced motion
- GIVEN the TV's browser reports `prefers-reduced-motion: reduce`
- WHEN song B's like count changes
- THEN B's heart and number briefly change colour without scaling
