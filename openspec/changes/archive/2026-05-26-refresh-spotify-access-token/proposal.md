# Proposal: Refresh Spotify Access Token

## Intent

Spotify access tokens expire after 1 hour. The backend already stores the refresh token in `SpotifyCredentials` (set during the OAuth callback) but never uses it. Any party running longer than an hour will silently fail all Spotify API calls with HTTP 401 from Spotify, causing playback, skip, and add-track to stop working without any user-visible feedback. This change adds automatic token refresh so parties can run indefinitely.

## Scope

In scope:
- Detect HTTP 401 responses from Spotify API calls in `SpotifyMusicProvider`.
- On 401, call `POST https://accounts.spotify.com/api/token` with `grant_type=refresh_token` and the stored refresh token.
- Store the new access token (and new refresh token if Spotify returns one) back into `SpotifyCredentials`.
- Retry the original request once with the new token.
- If the refresh call itself fails (e.g. refresh token revoked), surface a meaningful error to the caller so the host can re-authenticate.
- Add the `SpotifyCredentials` token expiry timestamp so the backend can proactively refresh before the first 401 (optional but preferred).

Out of scope:
- YouTube token refresh (YouTube is not yet implemented beyond the enum value).
- Frontend-visible token refresh UI — this is transparent to all clients.
- Persisting tokens to the database between restarts (tokens already live in memory only; this change does not change that).
- Forced re-authentication flow (out of scope — if refresh fails, the host sees an error and must restart the party).

## Approach

Add a `refreshAccessToken()` method to `SpotifyMusicProvider` (or a helper on `SpotifyCredentials`) that calls Spotify's token endpoint using the stored `refreshToken`. Wrap every outbound Spotify HTTP call in `SpotifyMusicProvider` with a small helper that catches HTTP 401 responses, invokes `refreshAccessToken()`, and retries once. Additionally, store the token expiry timestamp (current time + `expires_in` seconds from the OAuth callback) on `SpotifyCredentials` and check it proactively at the start of each Spotify call, refreshing before expiry rather than waiting for a 401. Quarkus `MutinyVertx`/`RestClient` or plain `java.net.http.HttpClient` (already in use for Spotify calls) can handle the refresh HTTP call without new dependencies.
