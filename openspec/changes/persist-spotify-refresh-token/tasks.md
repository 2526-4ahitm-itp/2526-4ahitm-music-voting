# Tasks

## 1. Persistence
- [x] 1.1 Add nullable `spotify_refresh_token` column to the `party` table (`setup.sql` + ALTER running DB)
- [x] 1.2 Add `spotifyRefreshToken` field to `PartyEntity`
- [x] 1.3 `PartyService.persistSpotifyRefreshToken(PartyId, String)` (@Transactional) to write it
- [x] 1.4 Load `spotifyRefreshToken` into `SpotifyCredentials` in `PartyRegistry.findOrReconstruct` (Spotify parties only)

## 2. Write on obtain / rotate
- [x] 2.1 `SpotifyCallbackResource.callback` + `iosCallback` — persist the refresh token after setting it
- [x] 2.2 `SpotifyMusicProvider.refreshAccessToken` — persist a rotated refresh token when Spotify returns one

## 3. Use after restart
- [x] 3.1 `ensureValidToken` — refresh when the access token is blank but a refresh token is present (in addition to expiry)
- [x] 3.2 `SpotifyMusicProvider.getValidAccessToken(Party)` — ensure a valid token, return it
- [x] 3.3 `/spotify/token` returns a freshly ensured access token; `/spotify/status` reports logged-in when an access **or** refresh token is present

## 4. Tests
- [x] 4.1 `PartyService.persistSpotifyRefreshToken` writes the column (+ ignores blank)
- [x] 4.2 `PartyRegistry.findById` restores the refresh token from the DB into credentials
- [x] 4.3 `/spotify/status` returns `loggedIn: true` for a party that has only a refresh token

## 5. Verify
- [x] 5.1 Backend test suite green
- [~] 5.2 Manual: logged-in-after-restart **verified live** at the HTTP level — a fresh party row with a
      persisted refresh token reports `/spotify/status` → `loggedIn:true` (reconstruct loads it). The
      real refresh-token→access-token exchange uses the existing `refreshAccessToken` path and needs a
      genuine Spotify refresh token to exercise fully (do once with a real login + backend restart).
