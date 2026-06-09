# Δ host/spec.md

## ADDED Requirements

### Requirement: Host Sees Synchronized Progress Bar
The host control client MUST display a progress bar for the current song, kept in sync with the TV player. Because the host client does not run the Spotify Web Playback SDK, it MUST derive the position from `progress` SSE events (see `playback/spec.md` "Cross-Client Playback Progress Relay") rather than polling Spotify.

- On each `progress` event the host client MUST set `currentPosition` / `currentDuration` from the payload and recompute the bar.
- The progress bar MUST render **below** the playback control buttons.
- Elapsed / total time MUST display as `m:ss`, measured against the event `duration` (falling back to the queue entry's `duration_ms`).

#### Scenario: Host progress bar mirrors the player
- GIVEN the host control client and the TV player are on the same party
- WHEN the player publishes its position via the progress relay
- THEN the host client's progress bar reflects that position within ~1 s
- AND the host client makes no Spotify API call to obtain it

### Requirement: Host Play/Pause Button Reflects Playback State
The host play/pause control MUST show a Play icon (▶) when playback is stopped or paused (tapping it starts/resumes) and a Pause icon (⏸) while playback is active (tapping it pauses).

#### Scenario: Icon matches the action it triggers
- GIVEN a song is paused on the host control client
- THEN the control shows a Play (▶) icon
- WHEN the host resumes and the song is playing
- THEN the control shows a Pause (⏸) icon
