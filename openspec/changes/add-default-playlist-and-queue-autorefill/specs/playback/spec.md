# Δ playback/spec.md

## MODIFIED Requirements

### Requirement: Empty Queue Behavior
While a song is playing and the queue would otherwise contain no further songs, the system MUST automatically refill the queue so playback continues, instead of stopping:
- If the party has a default playlist set, the system MUST add songs from that default playlist.
- If the party has no default playlist set, the system MUST add similar songs (the artist top-tracks / Top-Charts / search chain defined in `provider/spec.md`).

Auto-filled songs MUST be added to the bottom of the queue and MUST sort below any guest-added song, so that guest adds and upvotes always take precedence. Auto-filled songs are ordinary queue entries that guests may also vote on.

Because the refill chain ends in a Spotify search backstop, refill MUST yield a next song whenever Spotify is reachable; the system MUST stop or pause and show the "Warteschlange ist leer" state only when every source including search genuinely yields nothing. Refill MUST be evaluated server-side after a track advance or after a song starts.

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
- THEN the system adds a similar song (artist top-tracks / Top-Charts / search chain) to the bottom of the queue
- AND the next song starts automatically

#### Scenario: Guest song outranks auto-filled songs
- GIVEN the queue currently holds only auto-filled songs below the playing song
- WHEN a guest adds a new song
- THEN the guest's song sorts above all auto-filled songs
- AND the guest's song plays before any auto-filled song

#### Scenario: Refill yields nothing
- GIVEN the party has no default playlist set
- AND every refill source including Spotify search yields nothing (e.g. Spotify is unreachable)
- WHEN the playing song ends with no other guest songs queued
- THEN the dashboard displays "Warteschlange ist leer"
- AND no further song starts automatically

## ADDED Requirements

### Requirement: Autoplay Advances Reliably Across Tracks
The shared-screen player (`/startpage`, the only client running the Spotify Web Playback SDK) MUST drive autoplay: it detects that the current track has ended and asks the backend to advance (`POST /track/next`), which plays the next queued song and refills per "Empty Queue Behavior".

The player MUST advance at the track's **natural end**, not before it, so the displayed/now-playing song stays in sync with the audio (advancing early makes the backend's "current song" lead the audio by the lead time).

End detection MUST NOT rely on a single Spotify SDK event, because the SDK can drop the end event or report no state when the web player is briefly not the active device. The player MUST therefore detect the end through multiple independent paths (the SDK state event, a periodic poll of the SDK state, and elapsed-time reaching the track duration). Each track MUST be advanced at most once regardless of how many paths or duplicate events fire (keyed to the track URI).

#### Scenario: Still-playing track is not advanced early
- GIVEN a track is playing on the shared-screen player
- WHEN it is near its end but still playing
- THEN the player does NOT advance yet (so the shown song matches the audio)

#### Scenario: Dropped SDK end event does not stall playback
- GIVEN a track was playing on the shared-screen player
- AND the Spotify SDK does not emit an end event and returns no state for it
- WHEN the track's elapsed time reaches its duration
- THEN the player still asks the backend to advance to the next song

#### Scenario: A finished track advances only once
- GIVEN multiple detection paths observe the same track finishing
- WHEN they each evaluate whether to advance
- THEN the backend is asked to advance exactly once for that track

### Requirement: Adding a Song to an Idle Party Starts Playback
When nothing is currently playing (the party is idle — e.g. playback previously stopped because the queue ran dry) and a song is then added to the queue, the shared-screen player MUST start playback automatically. The player MUST NOT interrupt or override a song that is already playing or a track the host has intentionally paused; it starts playback only when the backend reports no active track.

#### Scenario: Song added after playback stopped
- GIVEN nothing is currently playing and the queue is empty
- WHEN a guest adds a song
- THEN the shared-screen player starts playing that song automatically

#### Scenario: Adding a song does not disturb active playback
- GIVEN a song is currently playing
- WHEN a guest adds another song
- THEN the added song waits in the queue
- AND the currently playing song is not interrupted
