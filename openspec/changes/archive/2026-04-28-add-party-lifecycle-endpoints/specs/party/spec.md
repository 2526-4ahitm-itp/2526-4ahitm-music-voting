# Delta for Party

## ADDED Requirements

### Requirement: Party Created via Explicit API Call
The system MUST expose `POST /api/party` to create a party. The request MUST include the chosen provider (`spotify` or `youtube`). The response MUST include the party ID, 5-digit numeric PIN, join URL, and QR code as a PNG data URL. The party MUST be persisted to the database before the response is returned.

#### Scenario: Host creates a party via API
- GIVEN a host sends `POST /api/party` with `{"provider": "spotify"}`
- WHEN the request is processed
- THEN the response contains `id`, `pin` (5-digit numeric string), `joinUrl`, and `qrCode` (PNG data URL)
- AND the party row exists in the database with the given ID and provider

#### Scenario: PIN is unique among active parties
- GIVEN one active party already holds PIN `"12345"`
- WHEN another party is created and the system would generate the same PIN
- THEN the system retries until a unique PIN is produced
- AND the new party receives a different PIN

### Requirement: Party Ended via Explicit API Call
The system MUST expose `DELETE /api/party/{id}` to end a party. Ending MUST empty the queue, delete all provider tokens held for the party, and broadcast a `party-ended` event to all clients connected to that party's SSE stream.

#### Scenario: Host ends the party via API
- GIVEN an active party with queue entries and a Spotify token
- WHEN `DELETE /api/party/{id}` is called
- THEN all `queue_entry` rows for that party are deleted
- AND the Spotify token is cleared from memory
- AND every SSE client connected to that party receives a `party-ended` event
- AND subsequent requests for that party ID return 404

### Requirement: Guest Joins via PIN Resolution
The system MUST expose `GET /api/party/join/{pin}` that resolves a 5-digit PIN to the corresponding active party ID.

#### Scenario: Valid PIN resolves to a party
- GIVEN an active party with PIN `"47291"`
- WHEN `GET /api/party/join/47291` is called
- THEN the response body contains the party ID
- AND HTTP 200 is returned

#### Scenario: Unknown or ended party PIN returns 404
- GIVEN no active party holds PIN `"99999"`
- WHEN `GET /api/party/join/99999` is called
- THEN HTTP 404 is returned

### Requirement: QR Code Served by Backend
The system MUST expose `GET /api/party/{id}/qr` that returns a PNG image of the QR code encoding the join URL for that party.

#### Scenario: QR code is returned as image
- GIVEN an active party
- WHEN `GET /api/party/{id}/qr` is called
- THEN the response has `Content-Type: image/png`
- AND the image encodes the join URL for that party

### Requirement: All Request Paths Are Scoped to a Party ID
Every API endpoint that operates on party state (queue, playback, provider) MUST include the party ID as a URL path segment in the form `/api/party/{id}/…`. Requests for an unknown or ended party ID MUST return HTTP 404.

#### Scenario: Request for unknown party returns 404
- GIVEN no party exists with ID `"abc"`
- WHEN any request is made to `/api/party/abc/track/…`
- THEN HTTP 404 is returned

#### Scenario: Request for ended party returns 404
- GIVEN a party that has been ended
- WHEN a request is made to `/api/party/{id}/track/…`
- THEN HTTP 404 is returned

## MODIFIED Requirements

### Requirement: Party Identity and Join Artifacts
On creation, the system MUST generate a party ID, a 5-digit numeric PIN, and a join URL suitable for QR-code encoding. The PIN and join URL MUST uniquely identify the party among all currently active parties. The system MUST also persist the PIN to the database and MUST serve the QR code as a PNG image from `GET /api/party/{id}/qr`.
(Previously: the spec required generation of a party ID, PIN, and join URL but did not specify storage or a dedicated QR endpoint.)

#### Scenario: Host sees party credentials after creation
- GIVEN the host has just called `POST /api/party`
- WHEN the creation completes
- THEN the response includes the PIN and the join URL
- AND `GET /api/party/{id}/qr` returns a PNG QR code encoding that join URL

#### Scenario: PIN is unique among active parties
- GIVEN two parties are created in quick succession
- WHEN the system assigns each a PIN
- THEN no two concurrently-active parties share the same PIN
