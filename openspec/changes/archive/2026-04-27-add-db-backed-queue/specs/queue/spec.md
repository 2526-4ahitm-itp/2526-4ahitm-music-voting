# Delta for Queue

## MODIFIED Requirements

### Requirement: Single Queue per Party
The system MUST maintain a persistent, database-backed queue per party. The database MUST be the
single source of truth for queue state; the Spotify playlist MUST NOT be read to determine queue
contents.
(Previously: implied that Spotify playlist was the store — no explicit source-of-truth statement.)

#### Scenario: Queue is scoped to party
- GIVEN two concurrent parties A and B
- WHEN a guest adds a song in party A
- THEN the song is written to the DB under party A's ID
- AND party B's queue row is unaffected

#### Scenario: Queue survives a backend restart
- GIVEN a party has songs in its queue
- WHEN the backend process restarts
- THEN the queue contents are unchanged on next read
- AND no Spotify API call is needed to restore queue state

### Requirement: Sort Order — Likes Desc, FIFO Tie-Break
The queue MUST be sorted by the count of votes (see `voting/spec.md`) descending, with ties broken
by `added_at` ascending. The sort MUST be computed from the database at read time.
(Previously: sort order was defined but the data source was the Spotify playlist.)

#### Scenario: More-liked song moves ahead
- GIVEN the queue contains song X (3 votes, added 10:00) and song Y (1 vote, added 09:55)
- WHEN any client reads the queue
- THEN song X appears before song Y

#### Scenario: Tied votes resolved by request time
- GIVEN the queue contains song X (2 votes, added 10:00) and song Y (2 votes, added 09:55)
- WHEN any client reads the queue
- THEN song Y appears before song X

### Requirement: No Duplicate Songs in Queue
A song MUST appear in the queue at most once per party. The uniqueness constraint MUST be enforced
at the database level on `(party_id, track_uri)` in addition to any application-level check.
(Previously: duplicate prevention was application-level only.)

#### Scenario: Guest adds a song already in the queue
- GIVEN song X is already in the queue
- WHEN a guest attempts to add song X
- THEN the add is rejected
- AND the guest sees "Song ist schon in der Warteschlange."

### Requirement: Songs Removed on Completion or Skip
When a song finishes or is skipped, the corresponding row MUST be deleted from the database. The
system MUST NOT retain a play history.
(Previously: removal was from the Spotify playlist.)

#### Scenario: Song finishes
- GIVEN song X is the currently playing entry
- WHEN song X ends
- THEN the `queue_entry` row for song X is deleted
- AND `currently_playing_entry_id` on the party is updated to the next song
