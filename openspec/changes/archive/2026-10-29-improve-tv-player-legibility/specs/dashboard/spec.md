## MODIFIED Requirements

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

## ADDED Requirements

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
