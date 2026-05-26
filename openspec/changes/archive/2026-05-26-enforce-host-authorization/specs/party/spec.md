# Delta for Party

## MODIFIED Requirements

### Requirement: Party Created via Explicit API Call
The system MUST expose `POST /api/party` to create a party. The request MUST include the chosen provider (`spotify` or `youtube`). The response MUST include the party ID, 5-digit numeric guest PIN, 5-digit numeric host PIN, and join URL. The party MUST be persisted to the database before the response is returned.

> Change: `hostPin` (a second 5-digit PIN, unique among active parties) is now included in the creation response alongside the guest `pin`. Both are persisted to the database. The host PIN is the bearer credential for all host-only API calls.

#### Scenario: Host creates a party via API and receives a host PIN
- GIVEN a host sends `POST /api/party` with `{"provider": "spotify"}`
- WHEN the request is processed
- THEN the response contains `id`, `pin`, `hostPin`, and `joinUrl`
- AND `hostPin` is a non-empty 5-digit string distinct from `pin`

## ADDED Requirements

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
