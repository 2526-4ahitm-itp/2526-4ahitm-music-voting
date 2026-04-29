# Queue Specification

## Purpose

Defines the single per-party queue: how songs get in, how it is ordered, how duplicates and blacklist violations are handled, and how songs leave. The queue is the source of truth for what will play next.

## Requirements

### Requirement: Single Queue per Party
The system MUST maintain a persistent, database-backed queue per party. The database MUST be the single source of truth for queue state; the Spotify playlist MUST NOT be read to determine queue contents. Every queue operation MUST use the real party ID from the request path — the hardcoded `"default"` party shim MUST NOT be used.

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

#### Scenario: Queue operations use the real party ID
- GIVEN an active party with a UUID party ID
- WHEN a guest adds a song via `POST /api/party/{id}/track/…`
- THEN the `queue_entry` row is inserted with `party_id` equal to that UUID
- AND no row with `party_id = "default"` is created

### Requirement: Sort Order — Likes Desc, FIFO Tie-Break
The queue MUST be sorted by the count of votes (see `voting/spec.md`) descending, with ties broken by `added_at` ascending. The sort MUST be computed from the database at read time.

#### Scenario: More-liked song moves ahead
- GIVEN the queue contains song X (3 votes, added 10:00) and song Y (1 vote, added 09:55)
- WHEN any client reads the queue
- THEN song X appears before song Y

#### Scenario: Tied votes resolved by request time
- GIVEN the queue contains song X (2 votes, added 10:00) and song Y (2 votes, added 09:55)
- WHEN any client reads the queue
- THEN song Y appears before song X

### Requirement: No Duplicate Songs in Queue
A song MUST appear in the queue at most once per party. The uniqueness constraint MUST be enforced at the database level on `(party_id, track_uri)` in addition to any application-level check.

#### Scenario: Guest adds a song already in the queue
- GIVEN song X is already in the queue
- WHEN a guest attempts to add song X
- THEN the add is rejected
- AND the guest sees "Song ist schon in der Warteschlange."

### Requirement: Songs Are Added Only via Search
Guests MUST add songs via search results only. Pasting links or IDs MUST NOT be a supported add path.

#### Scenario: Guest adds a song from search
- GIVEN a guest has searched and received results
- WHEN the guest taps the "+" on a result
- THEN that song enters the queue (subject to duplicate and blacklist checks)

### Requirement: Songs Removed on Completion or Skip
When a song finishes or is skipped, the corresponding row MUST be deleted from the database. The system MUST NOT retain a play history.

#### Scenario: Song finishes
- GIVEN song X is the currently playing entry
- WHEN song X ends
- THEN the `queue_entry` row for song X is deleted
- AND `currently_playing_entry_id` on the party is updated to the next song

### Requirement: Live Queue Updates via SSE
The backend MUST emit a `queue-updated` SSE event scoped to the party whenever a song is added to or removed from the queue. All connected clients that display the queue MUST reload it on receipt so that the displayed queue stays consistent without relying on polling alone.

#### Scenario: Guest adds a song — all views update immediately
- GIVEN the host dashboard, the TV dashboard, and a guest voting view are all open
- WHEN a guest adds a new song
- THEN the backend emits `queue-updated` on the party SSE stream
- AND the host dashboard, TV dashboard, and guest voting view each reload the queue
- AND the new song appears in all views without any manual refresh

#### Scenario: Host removes a song — all views update immediately
- GIVEN the host removes a song from the queue on the host dashboard
- WHEN the removal succeeds
- THEN the backend emits `queue-updated` on the party SSE stream
- AND the removed song disappears from all connected views immediately

### Requirement: Blacklist Enforced on Add
An add MUST be rejected if any blacklist word appears as a substring in the song's title or artist name. See `host/spec.md` for blacklist management.

#### Scenario: Blacklist blocks an add
- GIVEN the blacklist contains "live"
- WHEN a guest attempts to add "Song X (Live)"
- THEN the add is rejected
- AND the guest sees "Nicht erlaubt."
