# Delta for Queue

## MODIFIED Requirements

### Requirement: Sort Order — Likes Desc, FIFO Tie-Break
The queue MUST be sorted by the count of votes descending, with ties broken by `added_at` ascending. The sort MUST be computed from the database at read time. When the client provides a `deviceId` query parameter on `GET /party/{id}/track/queue`, each entry MUST also include a `hasVoted` boolean indicating whether that device has voted for the entry.
(Previously: no `hasVoted` field; `deviceId` param was not supported.)

#### Scenario: More-liked song moves ahead
- GIVEN the queue contains song X (3 votes, added 10:00) and song Y (1 vote, added 09:55)
- WHEN any client reads the queue
- THEN song X appears before song Y

#### Scenario: Tied votes resolved by request time
- GIVEN the queue contains song X (2 votes, added 10:00) and song Y (2 votes, added 09:55)
- WHEN any client reads the queue
- THEN song Y appears before song X

#### Scenario: Queue read with deviceId returns hasVoted per track
- GIVEN device "abc" has voted for song X but not song Y
- WHEN a client reads the queue with `?deviceId=abc`
- THEN song X has `hasVoted: true`
- AND song Y has `hasVoted: false`

#### Scenario: Queue read without deviceId omits hasVoted
- GIVEN no deviceId is provided
- WHEN a client reads the queue
- THEN entries contain `likeCount` but no `hasVoted` field is required
