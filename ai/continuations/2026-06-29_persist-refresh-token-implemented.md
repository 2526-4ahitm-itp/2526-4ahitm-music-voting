# Continuation — persist-spotify-refresh-token implemented (tests green)

Branch: `feature/default-playlist` (same working branch as the default-playlist work)

## What this change does
Persists the host's Spotify **refresh token** on the `party` row so a host's login survives a backend
restart / Quarkus dev live-reload. Previously all Spotify tokens lived only in memory
(`SpotifyCredentials`), so any restart logged every host out (surfaced during default-playlist testing).

## Implementation
- **Schema**: `party.spotify_refresh_token TEXT` (nullable) — `setup.sql` + `ALTER TABLE` on running DB.
- `PartyEntity.spotifyRefreshToken`.
- `PartyService.persistSpotifyRefreshToken(PartyId, String)` (@Transactional; ignores blank).
- `PartyRegistry.findOrReconstruct` loads it into `SpotifyCredentials` (Spotify parties only).
- `SpotifyCallbackResource.callback` + `iosCallback` persist it after `setRefreshToken`
  (injected `PartyService`).
- `SpotifyMusicProvider`:
  - injected `PartyService`; `refreshAccessToken` persists a rotated refresh token.
  - `ensureValidToken` now also refreshes when the **access token is blank but a refresh token
    exists** (the post-restart case), not only on expiry.
  - new `public String getValidAccessToken(Party)` — ensures + returns the access token.
- `SpotifyTokenResource`:
  - `/token` returns `getValidAccessToken(...)` (re-mints after restart).
  - `/status` reports `loggedIn` when an access **or** refresh token is present.

## Tests
- `PartyServiceTest`: persist writes the column / ignores blank.
- `PartyRegistryReconstructTest`: reconstruct restores the refresh token into credentials.
- `SpotifyTokenResourceTest`: `/status` → `loggedIn:true` with only a refresh token; `getToken` test
  updated to stub the now-delegated `getValidAccessToken`.
- Full backend suite green.

## Live verification
- A fresh `party` row with a persisted `spotify_refresh_token` (never loaded into the registry) →
  `GET /api/party/{id}/spotify/status` returns `{"loggedIn":true}` (reconstruct loads it). Test row
  deleted afterwards.
- NOT exercised live: the actual refresh-token→access-token exchange with Spotify (needs a genuine
  refresh token). That path is the pre-existing `refreshAccessToken`, now fed from the persisted token.
  Do once manually: real login → restart backend → confirm host still logged in + playback/token work.

## OpenSpec
- Change dir: `openspec/changes/persist-spotify-refresh-token/` (proposal, design-less — small;
  delta `specs/host/spec.md`, tasks). Not archived — pending the one manual restart check (task 5.2).

## Security note (called out, not done)
Refresh token is stored in plaintext in the dev DB (consistent with the client secret in
`application.properties`). Encrypting at rest is a follow-up if this goes near production.

## How to resume
Read this + `CLAUDE.md`. DB: `cd musicvoting && docker compose up -d`. Backend tests:
`cd musicvoting/backend && ./mvnw test`. Two active changes:
`add-default-playlist-and-queue-autorefill` and `persist-spotify-refresh-token` — both implemented,
both awaiting a manual live-Spotify check before archiving.
