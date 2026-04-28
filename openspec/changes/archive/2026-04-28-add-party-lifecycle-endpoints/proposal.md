# Proposal: Add Party Lifecycle Endpoints

## Intent

Right now every backend request resolves to a single implicit "default" party via `PartyRegistry.getOrCreateDefault()`, which is a deliberate transitional shim. This change replaces it with real party management: the host explicitly creates a party (getting back a PIN and QR code), guests join via PIN, and the host ends the party when done. All existing endpoints move under a `/api/party/{id}/…` prefix so every request is scoped to a real party.

## Scope

In scope:
- `POST /api/party` — create a party (provider selection, generates UUID, 5-digit PIN, join URL, QR code image)
- `DELETE /api/party/{id}` — end a party (empty queue, delete provider tokens, notify connected clients via SSE)
- `GET /api/party/join/{pin}` — resolve a 5-digit PIN to the party ID (used by the QR scan landing page)
- `GET /api/party/{id}/qr` — serve the QR code PNG for the join URL
- Add `pin` and `ended_at` columns to the `party` DB table
- Move all existing `/track/*` endpoints to `/api/party/{id}/track/*`
- Move host-facing `/spotify/*` endpoints to `/api/party/{id}/spotify/*` (OAuth callback URLs `/spotify/callback` and `/spotify/ios/callback` stay at their current paths; the party ID is threaded through the OAuth `state` parameter)
- Remove `PartyRegistry.getOrCreateDefault()` and all callers — replace with explicit party lookup that returns 404 if the party does not exist or has ended
- Wire `party_id` into the DB-backed queue so queue entries are scoped to the real party, not the hardcoded `"default"` string

Out of scope:
- Host authentication / authorization (endpoints remain unprotected; auth is a separate change)
- PIN regeneration UI / QR refresh after creation
- Multiple simultaneous active parties (one active party at a time remains the runtime assumption)
- Guest identity or per-guest token management
- Frontend Angular changes (backend API only; frontend routing is a follow-up)

## Approach

Add `pin` (5-digit numeric string, unique among active parties) and `ended_at` (nullable timestamp) to the `party` DB table via a SQL migration in `setup.sql`. `POST /api/party` generates the PIN with collision retry, persists a `PartyEntity`, registers an in-memory `Party`, and returns the party ID, PIN, join URL, and QR code as a PNG data URL. `DELETE /api/party/{id}` marks `ended_at`, evicts the in-memory `Party`, purges the queue, and broadcasts a `party-ended` SSE event. `GET /api/party/join/{pin}` looks up the active party with that PIN and returns its ID. A new `PartyResource` JAX-RS class handles these three new endpoints. All existing `TrackResource` and relevant `SpotifyTokenResource` handlers gain a `@PathParam("partyId")` and resolve the `Party` via a shared helper that throws 404 on miss or ended party. QR code PNG generation uses the ZXing library (already available in the Maven ecosystem).
