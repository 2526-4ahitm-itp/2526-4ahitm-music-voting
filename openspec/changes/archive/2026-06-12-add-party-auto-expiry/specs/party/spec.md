# Delta for Party

## ADDED Requirements

### Requirement: Party Auto-Ends After 2 Days
The system MUST automatically end any party that has not been explicitly ended within 2 days of its creation. Auto-ending MUST have the same effects as the host-triggered "Host Ends Party" flow: the queue is emptied, provider tokens are cleared, `endedAt` is set, the party is removed from the active registry, and a `party-ended` event is broadcast to all connected clients.

#### Scenario: Forgotten party auto-ends after 2 days
- GIVEN a party was created more than 2 days ago and was never explicitly ended
- WHEN the auto-expiry job runs
- THEN the party's queue is emptied
- AND its provider tokens are cleared
- AND `endedAt` is set to the current time
- AND every client connected to that party's SSE stream receives a `party-ended` event

#### Scenario: Recently created party is not auto-ended
- GIVEN a party was created less than 2 days ago
- WHEN the auto-expiry job runs
- THEN the party remains active and `endedAt` stays `NULL`

### Requirement: Ended Party Data Deleted After 1 Month
The system MUST permanently delete a party's data (the `party` row and its cascading `queue_entry`/`vote` rows) once 1 month has passed since `endedAt`.

#### Scenario: Old ended party is purged
- GIVEN a party was ended more than 1 month ago
- WHEN the cleanup job runs
- THEN the party's row is deleted from the database
- AND all of its `queue_entry` and `vote` rows are deleted
- AND `GET /api/party/join/{pin}` and any `/api/party/{id}/...` requests for that party return 404

#### Scenario: Recently ended party is retained
- GIVEN a party was ended less than 1 month ago
- WHEN the cleanup job runs
- THEN the party's row and its data remain in the database
