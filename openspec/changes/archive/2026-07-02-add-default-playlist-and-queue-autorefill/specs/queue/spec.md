# Δ queue/spec.md

## MODIFIED Requirements

### Requirement: No Duplicate Songs in Queue
A song MUST appear at most once among the **waiting** queue entries of a party. The currently playing song is excluded from this check, so a song that is currently playing (or has just finished and is still the current entry) MAY be added again as a waiting entry — the same track URI may therefore appear at most twice for a party: once as the playing entry and once waiting. The duplicate check is enforced at the application level against waiting entries only; there is no longer a database-level uniqueness constraint on `(party_id, track_uri)`.

When the same URI exists both playing and waiting, queue mutations target the waiting entry: removing the song deletes the waiting copy and leaves the playing one untouched, and a vote applies to the waiting copy.

#### Scenario: Guest adds a song already waiting in the queue
- GIVEN song X is already waiting in the queue
- WHEN a guest attempts to add song X
- THEN the add is rejected
- AND the guest sees "Song ist schon in der Warteschlange."

#### Scenario: Guest re-adds the currently playing song
- GIVEN song X is the currently playing song
- AND song X is not otherwise waiting in the queue
- WHEN a guest adds song X
- THEN the add is accepted
- AND song X is queued as a waiting entry to play again later

#### Scenario: Removing a re-queued song keeps the playing one
- GIVEN song X is both currently playing and queued once as a waiting entry
- WHEN the host removes song X from the queue
- THEN the waiting entry is removed
- AND the currently playing song X keeps playing
