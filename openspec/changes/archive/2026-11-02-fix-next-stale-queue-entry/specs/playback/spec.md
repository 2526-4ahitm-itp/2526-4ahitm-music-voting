# Spec Delta: playback

## ADDED Requirements

### Requirement: Advance Tolerates an Already Removed Finished Entry
When the system advances to the next song, removing the finished queue entry MUST NOT fail if that entry was already removed by a parallel request. The advance MUST complete normally in that case.

#### Scenario: Two advances for the same finished song overlap
- GIVEN song A is playing and song B is next in the queue
- AND a parallel request has already removed song A's queue entry
- WHEN the system advances to the next song
- THEN the advance does not fail with an error
- AND song B becomes the current song
