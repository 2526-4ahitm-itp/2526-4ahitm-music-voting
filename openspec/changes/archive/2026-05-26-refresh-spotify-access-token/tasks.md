# Tasks: Refresh Spotify Access Token

## Backend

- [x] **Task 1 — Add `expiresAt` to `SpotifyCredentials`**
  Add `AtomicReference<Instant> expiresAt` (initially `null`) with `getExpiresAt()` and `setExpiresAt(Instant)` following the same pattern as the existing `AtomicReference` fields.

- [x] **Task 2 — Store `refresh_token` and `expires_in` during OAuth callback**
  In `SpotifyCallbackResource`, in both `callback()` and `iosCallback()`, after calling `exchangeAuthorizationCode()`:
  - Set `creds.setRefreshToken(tokenMap.get("refresh_token"))`
  - Parse `tokenMap.get("expires_in")` as an int, then set `creds.setExpiresAt(Instant.now().plusSeconds(expiresIn - 60))`
  (The `tokenMap` is `Map<String, String>` so parse with `Integer.parseInt`.)

- [x] **Task 3 — Inject Spotify client credentials into `SpotifyMusicProvider`**
  Add `@ConfigProperty(name = "spotify.client.id") String clientId` and `@ConfigProperty(name = "spotify.client.secret") String clientSecret` to `SpotifyMusicProvider` (same config properties already used in `SpotifyCallbackResource`).

- [x] **Task 4 — Add `refreshAccessToken(Party)` to `SpotifyMusicProvider`**
  Private method that:
  - Builds a `POST https://accounts.spotify.com/api/token` request with `grant_type=refresh_token&refresh_token=<stored>&client_id=<id>&client_secret=<secret>`
  - Sends via the existing `client` (plain `HttpClient.send`)
  - On success (2xx): updates `creds.setToken(newAccessToken)`, conditionally updates `refreshToken` if a new one is returned, and sets `expiresAt` from `expires_in` (with 60 s buffer)
  - On failure: throws `WebApplicationException` with status 401, body `{"error": "Spotify-Sitzung abgelaufen. Bitte neu anmelden."}`

- [x] **Task 5 — Add `ensureValidToken(Party)` to `SpotifyMusicProvider`**
  Private method that checks `creds.getExpiresAt()`: if non-null and `Instant.now().isAfter(expiresAt)`, calls `refreshAccessToken(party)`.

- [x] **Task 6 — Add `executeSpotifyRequest(Party, Supplier<HttpRequest>)` helper**
  Private method that:
  1. Calls `ensureValidToken(party)`
  2. Sends `supplier.get()` via `client.send(...)`
  3. If response status is 401, calls `refreshAccessToken(party)` and retries with `supplier.get()` (new request = new `authHeader`)
  4. Returns the final `HttpResponse<String>`
  Add `import java.util.function.Supplier;`.

- [x] **Task 7 — Migrate `sendGet` and `sendPut` to use `executeSpotifyRequest`**
  Replace the `client.send(request, ...)` call in each with `executeSpotifyRequest(party, () -> <same request builder>.build())`.

- [x] **Task 8 — Migrate all remaining direct `client.send()` calls to `executeSpotifyRequest`**
  Update these methods, replacing direct `client.send(request, ...)` with `executeSpotifyRequest(party, () -> request_builder.build())`:
  - `searchTracks` (one direct `client.send`)
  - `fetchAndStoreUserId` (one direct `client.send`)
  - `findExistingPlaylist` (one direct `client.send`)
  - `createPartyPlaylist` (one direct `client.send`)
  - `fetchTrackMetadata` (one direct `client.send`)
  - `resolvePlayableDeviceId` (one direct `client.send`)
  - `getCurrentPlaybackSnapshot` (one direct `client.send`)
  - `restoreCurrentTrackFromBeginningOnDevice` (device-list call — best-effort, keep the surrounding try/catch; other `sendPut` calls already covered by Task 7)
  Note: `removeTrackFromPlaylist` also has a `client.send` — migrate it too.
