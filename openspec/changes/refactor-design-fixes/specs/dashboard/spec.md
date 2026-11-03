# Spec Delta: dashboard

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Dashboard Shows a Guest-Facing Empty State
When nothing is playing and the queue is empty, the dashboard MUST address the guests in the room, not the host. It MUST show the text "Scan den Code und wünsch dir den ersten Song!" next to the QR code and Voting-PIN. The dashboard MUST NOT refer to the host dashboard or to host actions.

#### Scenario: Empty party on the TV
- GIVEN a party has just been created and no song has been added
- WHEN the dashboard loads
- THEN the text "Scan den Code und wünsch dir den ersten Song!" is shown
- AND the QR code and Voting-PIN are visible
- AND no text mentions the "Dashboard" or the host

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
