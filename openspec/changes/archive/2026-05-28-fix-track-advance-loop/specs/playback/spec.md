# Delta for Playback

## ADDED Requirements

### Requirement: Track Advance Selects the Entry After the Current One
`POST /track/next` MUST advance to the first queue entry whose ID is different from the currently playing entry's ID. The currently playing entry MUST NOT be selected as the next track, even though it is still present in the `queue_entry` table at the time of the call.

#### Scenario: Normal advance with multiple tracks
- GIVEN the queue contains [Song A (currently playing), Song B, Song C] in sort order
- WHEN `POST /track/next` is called
- THEN Song B is played (not Song A)
- AND Song A is removed from the queue
- AND `currentlyPlayingEntryId` is set to Song B's ID

#### Scenario: Advance when only the current track remains
- GIVEN the queue contains only Song A (currently playing)
- WHEN `POST /track/next` is called
- THEN Song A is deleted from the queue
- AND `currentlyPlayingEntryId` is cleared
- AND the response indicates the queue is empty

### Requirement: Track Advance Is Idempotent Within a Short Window
The frontend MUST NOT call `POST /track/next` more than once for a single song-end event. A guard MUST prevent concurrent or near-concurrent calls within 3 seconds of a successful advance.

#### Scenario: Spotify SDK fires spurious state during track transition
- GIVEN a song just ended and `playNext()` was called successfully
- WHEN the Spotify SDK fires another `paused=true, position=0` state during the transition to the new track
- THEN the second `playNext()` call is ignored
- AND the newly started track continues playing uninterrupted
