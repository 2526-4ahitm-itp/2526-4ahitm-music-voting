# Delta for Party

## MODIFIED Requirements

### Requirement: Party Created via Explicit API Call
The system MUST expose `POST /api/party` to create a party. The request MUST include the chosen provider (`spotify` or `youtube`). The response MUST include the party ID, 5-digit numeric PIN, join URL, **and a one-time host token**. The party MUST be persisted to the database before the response is returned.

> Change: `hostToken` (opaque UUID string) is now included in the creation response. The token is generated server-side and stored in memory on the `Party` aggregate. It is NOT persisted to the database.

#### Scenario: Host creates a party via API and receives a host token
- GIVEN a host sends `POST /api/party` with `{"provider": "spotify"}`
- WHEN the request is processed
- THEN the response contains `id`, `pin`, `joinUrl`, and `hostToken`
- AND `hostToken` is a non-empty UUID string

## ADDED Requirements

### Requirement: Host Token Required for Party-Mutating Requests
Requests to host-only endpoints MUST include the party's host token as an `Authorization: Bearer <token>` header. The server MUST reject requests that omit the header with HTTP 401. The server MUST reject requests that supply an incorrect token with HTTP 403.

#### Scenario: Host endpoint called without Authorization header
- GIVEN an active party
- WHEN `DELETE /api/party/{id}` is called without an `Authorization` header
- THEN HTTP 401 is returned

#### Scenario: Host endpoint called with wrong token
- GIVEN an active party with host token `"abc-123"`
- WHEN `DELETE /api/party/{id}` is called with `Authorization: Bearer wrong-token`
- THEN HTTP 403 is returned

#### Scenario: Host endpoint called with correct token
- GIVEN an active party with host token `"abc-123"`
- WHEN `DELETE /api/party/{id}` is called with `Authorization: Bearer abc-123`
- THEN the request is processed normally
