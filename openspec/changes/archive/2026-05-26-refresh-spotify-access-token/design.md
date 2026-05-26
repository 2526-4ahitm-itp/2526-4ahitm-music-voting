# Design: Refresh Spotify Access Token

## Overview

Spotify access tokens expire after 1 hour. This change adds automatic proactive and reactive token refresh so parties can run indefinitely without requiring host re-authentication.

## Architecture

All changes are confined to the backend. No frontend changes are needed — the refresh is transparent to all clients.

### `SpotifyCredentials` changes

Add an `expiresAt` field (`AtomicReference<Instant>`) alongside the existing `token` and `refreshToken` fields. This allows the backend to know when the current token will expire.

### `SpotifyCallbackResource` changes

The existing `exchangeAuthorizationCode()` call already returns a `Map` from Spotify that includes `refresh_token` and `expires_in`, but only `access_token` is stored. Both callback paths (`callback()` and `iosCallback()`) must also store:
- `refresh_token` → `creds.setRefreshToken(...)`
- `expires_in` → compute `expiresAt = Instant.now().plusSeconds(expiresIn - 60)` (60 s buffer) → `creds.setExpiresAt(...)`

### `SpotifyMusicProvider` changes

**New injected config:** `@ConfigProperty spotify.client.id` and `@ConfigProperty spotify.client.secret` (needed to call the token endpoint without a separate class).

**New methods:**

1. `void refreshAccessToken(Party)` — calls `POST https://accounts.spotify.com/api/token` with `grant_type=refresh_token`. On success, updates `token`, optionally `refreshToken` (if Spotify returns a new one), and `expiresAt`. On failure, throws `WebApplicationException(401)` with a German message so the host knows to re-authenticate.

2. `void ensureValidToken(Party)` — if `expiresAt` is non-null and `Instant.now().isAfter(expiresAt)`, calls `refreshAccessToken(Party)`. Called at the start of every outbound Spotify request.

3. `HttpResponse<String> executeSpotifyRequest(Party, Supplier<HttpRequest>)` — unified send helper:
   - Calls `ensureValidToken(party)` first (proactive)
   - Builds and sends the request via `client.send(supplier.get(), ...)`
   - If the response is HTTP 401, calls `refreshAccessToken(party)` and retries once using `supplier.get()` (which re-reads `authHeader(party)` and thus picks up the new token)
   - Returns the final `HttpResponse<String>`

**Migration:** Replace all direct `client.send(...)` calls in `SpotifyMusicProvider` with `executeSpotifyRequest(party, () -> <request builder>.build())`. This includes `sendGet`, `sendPut`, `searchTracks`, `fetchAndStoreUserId`, `findExistingPlaylist`, `createPartyPlaylist`, `fetchTrackMetadata`, `resolvePlayableDeviceId`, `getCurrentPlaybackSnapshot`, and the device-list call in `restoreCurrentTrackFromBeginningOnDevice`.

## Error handling

If `refreshAccessToken` fails (e.g. refresh token revoked or expired):
- Throw `WebApplicationException` with status 401
- Error body: `{"error": "Spotify-Sitzung abgelaufen. Bitte neu anmelden."}`

The host sees a 401 from the next playback/search call and must restart the party (re-authenticate via Spotify OAuth).

## Constraints

- No new Maven dependencies — uses existing `java.net.http.HttpClient`
- No DB changes — tokens remain in-memory only
- Thread-safe: `SpotifyCredentials` already uses `AtomicReference` for all fields; `expiresAt` follows the same pattern
- The 60-second buffer on `expiresAt` ensures proactive refresh triggers slightly before the token actually expires
