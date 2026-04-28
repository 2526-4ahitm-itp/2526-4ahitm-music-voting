# Delta for Queue

## MODIFIED Requirements

### Requirement: Single Queue per Party
The system MUST maintain a persistent, database-backed queue per party. The database MUST be the single source of truth for queue state; the Spotify playlist MUST NOT be read to determine queue contents. Every queue operation MUST use the real party ID from the request path — the hardcoded `"default"` party shim MUST NOT be used.
(Previously: the same requirement but without the explicit prohibition on the "default" shim; in practice all queue DB operations used `"default"` as the party ID.)

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
