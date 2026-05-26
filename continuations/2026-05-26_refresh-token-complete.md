# Continuation — refresh-spotify-access-token complete

Branch: `fix/host-authorization`

## What was done this session

- Created missing artifacts for `refresh-spotify-access-token` change: `design.md`, `specs/host/spec.md` (delta), `tasks.md`
- Implemented all 8 tasks:
  - `SpotifyCredentials.java` — added `expiresAt` (`AtomicReference<Instant>`) with getter/setter
  - `SpotifyCallbackResource.java` — both `callback()` and `iosCallback()` now store `refresh_token` and compute `expiresAt = now + expires_in - 60s`
  - `SpotifyMusicProvider.java`:
    - Injected `@ConfigProperty spotify.client.id/secret`
    - Added `refreshAccessToken(Party)` — POSTs to Spotify token endpoint, updates credentials, throws 401 with `"Spotify-Sitzung abgelaufen. Bitte neu anmelden."` on failure
    - Added `ensureValidToken(Party)` — proactive refresh when token is past expiry
    - Added `executeSpotifyRequest(Party, Supplier<HttpRequest>)` — calls `ensureValidToken`, sends request, retries once on 401 after refresh
    - Migrated all `client.send()` call sites (9 total) to `executeSpotifyRequest`: `sendGet`, `sendPut`, `searchTracks`, `fetchAndStoreUserId`, `findExistingPlaylist`, `createPartyPlaylist`, `fetchTrackMetadata`, `resolvePlayableDeviceId`, `getCurrentPlaybackSnapshot`, `restoreCurrentTrackFromBeginningOnDevice` (device-list), `removeTrackFromPlaylist`
- Synced delta spec into `openspec/specs/host/spec.md` (new "Spotify Access Token Is Refreshed Automatically" requirement)
- Archived to `openspec/changes/archive/2026-05-26-refresh-spotify-access-token/`
- Clean compile confirmed (`./mvnw compile -q`)

## Current state

- `openspec/changes/` has no active changes
- `fix/host-authorization` branch: two features committed (`enforce-host-authorization` + token refresh implementation uncommitted yet)
- Both backend files modified: `SpotifyCredentials.java`, `SpotifyCallbackResource.java`, `SpotifyMusicProvider.java`
- Main spec `openspec/specs/host/spec.md` updated

## What's next

No open changes. Possible next steps:
- Commit the token refresh changes to the branch
- Open a PR to merge `fix/host-authorization` into `main`
- Propose a new change if there are new features to add

## How to resume

Read this file and `CLAUDE.md`. Check `git status` to see what's uncommitted.
