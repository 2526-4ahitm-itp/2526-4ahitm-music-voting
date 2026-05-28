# Delta for Playback

## ADDED Requirements

### Requirement: Spotify Player Disconnects When Party Ends
When the startpage (TV/dashboard) receives a `party-ended` SSE event or is otherwise navigated away from, the Spotify Web Playback SDK player MUST be paused and disconnected before navigation completes so that no audio continues on the device after the party is over.

#### Scenario: Party ended while music is playing
- GIVEN the startpage has an active Spotify Web Playback SDK player with a song playing
- WHEN a `party-ended` SSE event is received
- THEN the player is paused and disconnected
- AND the app navigates to the home page
- AND no audio is audible after navigation

#### Scenario: Startpage destroyed for any reason
- GIVEN the startpage component is active with a connected Spotify player
- WHEN the component is destroyed (any navigation away)
- THEN the player is disconnected as part of cleanup
