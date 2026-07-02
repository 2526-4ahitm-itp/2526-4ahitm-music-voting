# Party Specification

## Purpose

Defines the lifecycle of a party: how it is created, how it is identified to clients, which music provider it uses, and how it ends. A party is the top-level aggregate that owns a queue, a host session, guests, a dashboard, and a provider binding.
## Requirements
### Requirement: Party Creation by Host
The system MUST allow a host to create a new party and MUST require the host to select exactly one music provider (Spotify or YouTube) during creation.

#### Scenario: Host creates a party with Spotify
- GIVEN a host has opened the application
- WHEN the host clicks "Create party" and selects Spotify
- THEN the system creates a new party bound to Spotify
- AND the host is prompted to authenticate with Spotify via OAuth

#### Scenario: Host creates a party with YouTube
- GIVEN a host has opened the application
- WHEN the host clicks "Create party" and selects YouTube
- THEN the system creates a new party bound to YouTube
- AND the host is prompted to authenticate with YouTube via OAuth

### Requirement: Party Created via Explicit API Call
The system MUST expose `POST /api/party` to create a party. The request MUST include the chosen provider (`spotify` or `youtube`). The response MUST include the party ID, 5-digit numeric guest PIN, 5-digit numeric host PIN, and join URL. Both PINs MUST be persisted to the database before the response is returned.

#### Scenario: Host creates a party via API
- GIVEN a host sends `POST /api/party` with `{"provider": "spotify"}`
- WHEN the request is processed
- THEN the response contains `id`, `pin`, `hostPin` (both 5-digit numeric strings), and `joinUrl`
- AND the party row exists in the database with the given ID, provider, and both PINs
- AND `pin` and `hostPin` are different values

#### Scenario: Both PINs are unique among active parties
- GIVEN active parties already hold certain guest and host PINs
- WHEN a new party is created
- THEN the system retries until both a unique guest PIN and a unique host PIN are produced
- AND neither PIN collides with any active party's guest or host PIN

### Requirement: Single Provider per Party
A party MUST use exactly one provider for its entire lifetime. The provider MUST NOT be changed after the party has been created.

#### Scenario: Provider is fixed after creation
- GIVEN a party bound to Spotify
- WHEN any client inspects the party
- THEN the provider is reported as Spotify for the entire lifetime of the party
- AND no API allows switching the provider

### Requirement: Party Identity and Join Artifacts
On creation, the system MUST generate a party ID, a 5-digit numeric PIN, and a join URL suitable for QR-code encoding. The PIN and join URL MUST uniquely identify the party among all currently active parties. The system MUST also persist the PIN to the database and MUST serve the QR code as a PNG image from `GET /api/party/{id}/qr`.

#### Scenario: Host sees party credentials after creation
- GIVEN the host has just called `POST /api/party`
- WHEN the creation completes
- THEN the response includes the PIN and the join URL
- AND `GET /api/party/{id}/qr` returns a PNG QR code encoding that join URL

#### Scenario: PIN is unique among active parties
- GIVEN two parties are created in quick succession
- WHEN the system assigns each a PIN
- THEN no two concurrently-active parties share the same PIN

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

### Requirement: Host Provider Login is Party-Scoped
The host's provider login MUST apply only to the party in which the login occurred. A new party MUST require a new provider login and MUST NOT reuse tokens from a previous party.

#### Scenario: New party requires new provider login
- GIVEN the host previously created and ended a party with Spotify
- WHEN the host creates a new party with Spotify
- THEN the host is prompted to authenticate with Spotify again

### Requirement: Host Ends Party
The host MUST be able to end the party. Ending a party MUST close the party, empty its queue, delete provider tokens associated with the party, and notify all connected clients that the party has ended.

#### Scenario: Host ends the party
- GIVEN an active party with guests connected and songs in the queue
- WHEN the host triggers "End party"
- THEN the party transitions to ended
- AND the queue is emptied
- AND provider tokens for this party are deleted
- AND every connected client receives a "party ended" notification

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

### Requirement: Host PIN Required for Party-Mutating Requests
Requests to host-only endpoints MUST include the party's host PIN as an `Authorization: Bearer <hostPin>` header. The server MUST reject requests that omit the header with HTTP 401. The server MUST reject requests that supply an incorrect host PIN with HTTP 403.

#### Scenario: Host endpoint called without Authorization header
- GIVEN an active party
- WHEN `DELETE /api/party/{id}` is called without an `Authorization` header
- THEN HTTP 401 is returned

#### Scenario: Host endpoint called with wrong host PIN
- GIVEN an active party with host PIN `"12345"`
- WHEN `DELETE /api/party/{id}` is called with `Authorization: Bearer 99999`
- THEN HTTP 403 is returned

#### Scenario: Host endpoint called with correct host PIN
- GIVEN an active party with host PIN `"12345"`
- WHEN `DELETE /api/party/{id}` is called with `Authorization: Bearer 12345`
- THEN the request is processed normally

### Requirement: Clients Reconnect Automatically
All clients (host, guest, dashboard) MUST automatically attempt to reconnect when the network connection drops, and MUST reload the current party state (queue, current playback, likes) after reconnect.

#### Scenario: Guest loses connection briefly
- GIVEN a guest is connected to a party
- WHEN the guest's network drops and recovers within a reasonable window
- THEN the client reconnects without user action
- AND the displayed queue and playback state match the server state after reconnect

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

### Requirement: Party Stores an Optional Default Playlist
A party MUST be able to store an optional default-playlist reference (the Spotify playlist id) chosen at creation. The value MUST be nullable (a party may have no default playlist) and MUST be persisted on the party's database row so it survives a backend restart and is available wherever the party is resolved by id.

#### Scenario: Default playlist persists across restart
- GIVEN a party was created with a default playlist set
- WHEN the backend restarts and the party is reconstructed from the database
- THEN the party's default playlist id is still present

#### Scenario: Party without a default playlist
- GIVEN a party was created without choosing a default playlist
- WHEN the party is resolved
- THEN its default playlist reference is null

