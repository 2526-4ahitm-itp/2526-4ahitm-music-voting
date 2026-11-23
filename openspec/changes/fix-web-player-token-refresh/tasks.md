## 1. Implementation

- [x] 1.1 Add `provideOAuthToken(partyId, cb)` to `SpotifyWebPlayerService`: GET `/api/party/{id}/spotify/token` (text), store + pass the new token; on error/empty pass the cached token
- [x] 1.2 Use it in `new Spotify.Player({ getOAuthToken })` instead of returning the cached `this.token`

## 2. Tests

- [x] 2.1 Unit test: every `provideOAuthToken` call issues a new token request and hands the fresh token to the callback (two calls → two tokens)
- [x] 2.2 Unit test: on HTTP error the callback gets the cached token
- [x] 2.3 Unit test: on empty response the callback gets the cached token
- [x] 2.4 Run `npx ng test --watch=false --browsers=ChromeHeadless` in `musicvoting/frontend` — green

## 3. Verify

- [ ] 3.1 Live check: run a party > 60 min (or > 1 token lifetime) without reloading; playback keeps auto-advancing and Play works; no `Spotify auth error` in the startpage console
