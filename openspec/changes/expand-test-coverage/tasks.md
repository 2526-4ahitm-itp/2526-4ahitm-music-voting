# Tasks

## 1. Backend tests
- [x] 1.1 `SpotifyMusicProviderTest` — queue ordering, voting, track removal, playlist add conflicts, playback control without/with party entity
- [x] 1.2 `SpotifyTokenResourceTest` — `/api/party/{partyId}/spotify/{token,status,deviceId,login}` endpoints incl. web/iOS status and SSE `track-changed` emission
- [x] 1.3 `SpotifyCallbackResourceTest` — callback/iosCallback validation branches and SSE `events()` source filtering
- [x] 1.4 `SpotifyApiErrorsTest` — rate-limit/error-message formatting for Spotify HTTP responses
- [x] 1.5 `PartyRegistryReconstructTest` — reconstruction of `Party` from `PartyEntity` after registry restart
- [x] 1.6 `HostAuthFilterTest` — all 5 branches of the `@HostOnly` filter (missing path param, unknown party, missing/invalid auth header, wrong host pin, success)
- [x] 1.7 Add `quarkus-junit5-mockito` to `pom.xml`

## 2. Frontend tests
- [x] 2.1 `host.guard.spec.ts`, `host-auth.interceptor.spec.ts`
- [x] 2.2 `services/spotify-tracks.spec.ts`, `services/spotify-player.spec.ts` (incl. `getCurrentState`, `disconnectPlayer`, `getPlayerStatus`, `getQueueUpdates`, `initPlayer` outside `/startpage`)
- [x] 2.3 `pages/create-party/create-party.spec.ts` (error path + `goBack`; success path skipped, see proposal limitation)
- [x] 2.4 `pages/code-input/code-input.spec.ts` (pin entry, paste, delete, resolve/join)
- [x] 2.5 `pages/home/home.spec.ts`, `pages/host-options/host-options.spec.ts`
- [x] 2.6 `pages/voting-host/voting-host.spec.ts`, `pages/voting-comp/voting-comp.spec.ts` (incl. SSE handling)
- [x] 2.7 `pages/search-host/search-host.spec.ts`, `pages/guest/guest.spec.ts` (search, add-to-playlist, SSE)
- [x] 2.8 `pages/startpage/startpage.spec.ts`, `pages/host-dashboard/host-dashboard.spec.ts` (remaining logic beyond existing `.progress.spec.ts`)
- [x] 2.9 `app.spec.ts`, `app.routes.spec.ts`

## 3. Verification
- [x] 3.1 `./mvnw test` — 114/114 passing
- [x] 3.2 `npx ng test --watch=false --browsers=ChromeHeadless` — 178/178 passing
