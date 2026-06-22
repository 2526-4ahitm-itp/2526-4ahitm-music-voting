# Delta for party

## ADDED Requirements

### Requirement: Party Operations Survive Backend Restart
All endpoints that accept a party ID MUST resolve the party from the database if it
is not present in the in-memory registry. The system MUST NOT return 404 solely
because the backend was restarted after the party was created.

#### Scenario: QR endpoint after backend restart
- GIVEN a party was created before the last backend restart
- WHEN `GET /api/party/{id}/qr` is called
- THEN the system finds the party in the database and returns the QR code PNG
- AND HTTP 200 is returned

#### Scenario: Track operations after backend restart
- GIVEN a party was created before the last backend restart
- WHEN `GET /api/party/{id}/track/queue` is called
- THEN the system reconstructs the party from the database and returns the queue
- AND HTTP 200 is returned

#### Scenario: Ended or unknown party still returns 404
- GIVEN no active party exists with a given ID (ended or never created)
- WHEN any `/api/party/{id}/…` endpoint is called
- THEN HTTP 404 is returned
