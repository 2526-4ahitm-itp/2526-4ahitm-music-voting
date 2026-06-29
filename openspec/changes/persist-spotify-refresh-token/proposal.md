# Proposal: Persist the Spotify Refresh Token

## Intent

Today a host's Spotify session lives only in memory (`SpotifyCredentials` on the in-memory `Party`). The access token **and** the refresh token are lost whenever the backend restarts (or Quarkus dev live-reloads). After a restart the party row is reconstructed from the DB, but with no tokens — so the host is effectively logged out and must re-authenticate, even though playback state (`currently_playing_entry_id`, etc.) survived. This is disruptive at a real party if the server hiccups.

Persisting the long-lived **refresh token** on the party row fixes this: on restart the refresh token is reloaded, and the next Spotify call (or the player asking for an access token) silently refreshes a new access token. The host stays logged in across restarts.

## Scope

In scope:
- Add a nullable `spotify_refresh_token` column to the `party` table and `PartyEntity`.
- Write the refresh token to the row whenever it is obtained/rotated (OAuth callbacks; token refresh).
- Load it back into `SpotifyCredentials` when a party is reconstructed from the DB.
- Refresh the access token lazily when it is missing but a refresh token is present (not only on expiry).
- Treat a party with a stored refresh token as logged in (`/spotify/status`), and hand out a freshly refreshed access token from `/spotify/token`.

Out of scope:
- Encrypting the stored refresh token (dev DB stores secrets in plaintext already, e.g. the client secret in `application.properties`); noted as a follow-up.
- Persisting the access token, device id, or playlist id (access token is short-lived and just re-derived from the refresh token; device id is re-registered by the player on load).

## Approach

The refresh token is the durable credential. It is persisted at the point it is received (OAuth callback) and, if Spotify rotates it, on refresh. On reconstruct it is loaded into the rebuilt party's credentials. `ensureValidToken` is extended to refresh when the access token is blank but a refresh token exists, so the first call after a restart transparently mints a new access token. `/spotify/status` reports logged-in when either an access token or a refresh token is present, and `/spotify/token` ensures a valid access token before returning it.
