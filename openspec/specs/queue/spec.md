# Queue Specification

## Purpose

Defines the single per-party queue: how songs get in, how it is ordered, how duplicates and blacklist violations are handled, and how songs leave. The queue is the source of truth for what will play next.

## Requirements

### Requirement: Single Queue per Party
A party MUST have exactly one queue. All guest additions, host removals, and playback selections operate on that one queue.

#### Scenario: Queue is scoped to party
- GIVEN two concurrent parties A and B
- WHEN a guest adds a song in party A
- THEN the song appears in party A's queue only
- AND party B's queue is unaffected

### Requirement: Sort Order — Likes Desc, FIFO Tie-Break
The queue MUST be sorted primarily by like count in descending order, with ties broken by earliest request-time first.

#### Scenario: More-liked song moves ahead
- GIVEN the queue contains song X (3 likes, added 10:00) and song Y (1 like, added 09:55)
- WHEN any client reads the queue
- THEN song X appears before song Y

#### Scenario: Tied likes resolved by request time
- GIVEN the queue contains song X (2 likes, added 10:00) and song Y (2 likes, added 09:55)
- WHEN any client reads the queue
- THEN song Y appears before song X

### Requirement: No Duplicate Songs in Queue
A song MUST appear in the queue at most once per party at any given time. Attempts to add a song already in the queue MUST be rejected with a user-visible message.

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
When a song finishes playing or is skipped, it MUST be removed from the queue. The system MUST NOT retain a history or "recently played" list.

#### Scenario: Song finishes
- GIVEN song X is currently playing
- WHEN song X ends
- THEN song X is removed from the queue
- AND the next song is selected by sort order

### Requirement: Blacklist Enforced on Add
An add MUST be rejected if any blacklist word appears as a substring in the song's title or artist name. See `host/spec.md` for blacklist management.

#### Scenario: Blacklist blocks an add
- GIVEN the blacklist contains "live"
- WHEN a guest attempts to add "Song X (Live)"
- THEN the add is rejected
- AND the guest sees "Nicht erlaubt."
