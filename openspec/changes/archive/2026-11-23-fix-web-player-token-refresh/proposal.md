## Why

In a live party, after roughly an hour of playback (≈15–20 songs) the song on the TV/startpage pauses on its own and cannot be started again — neither autoplay nor the host's Play button help. Only reloading the startpage (sometimes several times) or creating a new party brings playback back.

Root cause: the Spotify Web Playback SDK on `/startpage` is the device the audio plays on, and it authenticates with its own access token via the `getOAuthToken` callback. `SpotifyWebPlayerService` fetches that token **once** in `initPlayer()` and the callback always hands back this cached value (`getOAuthToken: (cb) => cb(this.token)`). Spotify access tokens expire after 60 minutes. When the SDK asks for a fresh token it receives the expired one, loses its authorization and stops playing. The backend keeps refreshing its own token (`ensureValidToken`), so its `play`/`next` calls are accepted by Spotify — but the device that should execute them is dead. A reload works because `initPlayer()` fetches a new token.

## What Changes

- The SDK's `getOAuthToken` callback MUST fetch a current token from `GET /party/{id}/spotify/token` on **every** invocation instead of returning the token cached at player start. The backend endpoint already re-mints the access token from the refresh token when it has expired.
- If that fetch fails or returns an empty token, the callback falls back to the last known token (best-effort; the SDK will ask again).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `playback`: the web playback device keeps a valid Spotify token for the whole party, so playback does not stop after the access token expires.

## Impact

- Code: `musicvoting/frontend/src/app/services/spotify-player.ts` (`getOAuthToken` callback, new `provideOAuthToken` helper) + `spotify-player.spec.ts`.
- No backend, API-contract, DB or endpoint changes — `GET /party/{id}/spotify/token` already refreshes.
- Runtime: one extra small HTTP request whenever the SDK asks for a token (on connect and roughly once per hour).
