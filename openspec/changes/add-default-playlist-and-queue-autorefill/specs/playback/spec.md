# Δ playback/spec.md

## MODIFIED Requirements

### Requirement: Empty Queue Behavior
While a song is playing and the queue would otherwise contain no further songs, the system MUST automatically refill the queue so playback continues, instead of stopping:
- If the party has a default playlist set, the system MUST add songs from that default playlist.
- If the party has no default playlist set, the system MUST add songs from Spotify recommendations seeded by the currently playing song.

Auto-filled songs MUST be added to the bottom of the queue and MUST sort below any guest-added song, so that guest adds and upvotes always take precedence. Auto-filled songs are ordinary queue entries that guests may also vote on.

The system MUST stop or pause and show the "Warteschlange ist leer" state only when refill genuinely yields no songs (e.g. no default playlist is set and recommendations are unavailable). Refill MUST be evaluated server-side after a track advance or after a song starts.

#### Scenario: Last guest song finishes, default playlist set
- GIVEN the party has a default playlist set
- AND only song X is in the queue and it is playing
- WHEN song X ends and no other guest songs are queued
- THEN the system adds songs from the default playlist to the bottom of the queue
- AND the next song starts automatically
- AND the dashboard does NOT show a stopped "Warteschlange ist leer" state

#### Scenario: Last guest song finishes, no default playlist
- GIVEN the party has no default playlist set
- AND only song X is in the queue and it is playing
- WHEN song X ends and no other guest songs are queued
- THEN the system adds Spotify recommendations seeded by song X to the bottom of the queue
- AND the next song starts automatically

#### Scenario: Guest song outranks auto-filled songs
- GIVEN the queue currently holds only auto-filled songs below the playing song
- WHEN a guest adds a new song
- THEN the guest's song sorts above all auto-filled songs
- AND the guest's song plays before any auto-filled song

#### Scenario: Refill yields nothing
- GIVEN the party has no default playlist set
- AND Spotify recommendations are unavailable
- WHEN the playing song ends with no other guest songs queued
- THEN the dashboard displays "Warteschlange ist leer"
- AND no further song starts automatically
