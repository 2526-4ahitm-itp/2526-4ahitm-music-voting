## Context

`SpotifyWebPlayerService.initPlayer()` loads a token from `/api/party/{id}/spotify/token`, stores it in `this.token`, and constructs `new Spotify.Player({ getOAuthToken: cb => cb(this.token) })`. The Spotify SDK calls `getOAuthToken` on `connect()` and again whenever its token is about to expire / has expired. Nothing ever updated `this.token` after init, so after 60 minutes the SDK only ever got an expired token.

Backend side is correct: `SpotifyTokenResource.getToken()` → `SpotifyMusicProvider.getValidAccessToken()` → `ensureValidToken()` refreshes when `expiresAt` (set to `expires_in − 60 s`) has passed or the token is missing.

## Decisions

- **Fetch on every callback (no client-side expiry tracking).** The backend is the single owner of token freshness; the frontend just asks it. This avoids duplicating expiry logic and also picks up tokens refreshed by backend calls in between. The SDK only calls the callback rarely, so the extra request is negligible.
- **Fallback to the cached token on error/empty response.** The SDK requires the callback to be invoked; never calling it would hang the SDK. Handing back the last token keeps today's behavior in the failure case, and the SDK retries.
- **Testable seam.** The callback body lives in `provideOAuthToken(partyId, cb)` so it can be unit-tested with `HttpTestingController` without loading the real SDK.

## Non-Goals

- Automatic SDK reconnect on `authentication_error` / `not_ready`. With a valid token this should not be needed; can be a follow-up if live logs still show device loss.
- Investigating why a reload sometimes needs several attempts (likely the stale device still registered at Spotify); re-check after this fix in the live test.
