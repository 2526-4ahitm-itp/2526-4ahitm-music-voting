# Tasks

## 1. Domain model
- [x] 1.1 Add `PartyId` value object (`at.htl.domain.PartyId`).
- [x] 1.2 Add `ProviderKind` enum with `SPOTIFY` and `YOUTUBE`.
- [x] 1.3 Add `Party` aggregate holding `PartyId`, `ProviderKind`, and provider-specific credentials reference.
- [x] 1.4 Add `PartyRegistry` `@ApplicationScoped` bean with `ConcurrentHashMap<PartyId, Party>`.
- [x] 1.5 Implement `PartyRegistry.getOrCreateDefault()` returning a singleton default party; annotate `@Deprecated` with Javadoc pointing at the follow-up change `add-party-lifecycle-endpoints`.

## 2. Provider abstraction
- [x] 2.1 Define `MusicProvider` interface in `at.htl.provider` with every method taking `Party` as the first parameter: `searchTracks`, `getTrack`, `play`, `overwritePlaylist`, `getQueue`, `addTracksToPlaylist`, `removeTrack`, `playNextAndRemove`, `pausePlayback`, `resumePlayback`, `startFirstSongWithoutRemoving`, `getCurrentPlayback`.
- [x] 2.2 Create `SpotifyCredentials` value object under `at.htl.provider.spotify` absorbing `TokenStore`'s fields (access token, refresh token, device id, playlist id, Spotify user id, last-playback uri, last-playback active, iOS installation id).
- [x] 2.3 Create `SpotifyMusicProvider` under `at.htl.provider.spotify` as `@ApplicationScoped`, stateless, implementing `MusicProvider`. Port the HTTP logic from `SpotifyPlayer`. Replace every `tokenStore.getX()` with `party.getSpotifyCredentials().getX()`; every `tokenStore.setX(...)` with `party.getSpotifyCredentials().setX(...)`. Keep `fetchAndStoreUserId`, `ensurePartyPlaylistExists`, `restoreCurrentTrackFromBeginningOnDevice` as Spotify-specific public methods (not on the interface).
- [x] 2.4 Create `MusicProviderFactory` `@ApplicationScoped` bean with `forParty(Party): MusicProvider`. Spotify branch returns the `SpotifyMusicProvider`; YouTube branch throws `UnsupportedOperationException` referencing the future `add-youtube-provider` change.

## 3. Rewire endpoints
- [x] 3.1 `SpotifyTokenResource`: in the OAuth callback, resolve `party = partyRegistry.getOrCreateDefault()` and write the access token + iOS installation id onto `party.getSpotifyCredentials()`. Invoke `SpotifyMusicProvider.fetchAndStoreUserId(party)` and `ensurePartyPlaylistExists(party)`.
- [x] 3.2 `SpotifyTokenResource`: replace all remaining `TokenStore` reads with reads from `partyRegistry.getOrCreateDefault().getSpotifyCredentials()`. Swap the `@Inject SpotifyPlayer` for `@Inject SpotifyMusicProvider` (needed for the Spotify-specific lifecycle hook `restoreCurrentTrackFromBeginningOnDevice`).
- [x] 3.3 `TrackResource`: resolve the default party, obtain `MusicProvider` via `MusicProviderFactory.forParty(party)`, pass the party to each interface method.
- [x] 3.4 Verify no remaining `@Inject TokenStore` / `@Inject SpotifyPlayer` anywhere in the tree.

## 4. Remove the old singleton state
- [x] 4.1 Delete `at.htl.service.TokenStore`.
- [x] 4.2 Delete `at.htl.service.SpotifyPlayer` (confirm all references gone after step 2.3 move).
- [x] 4.3 Verify no remaining imports of `at.htl.service.TokenStore` or `at.htl.service.SpotifyPlayer` anywhere in the tree.

## 5. Tests and verification
- [x] 5.1 Add a unit test that `PartyRegistry.getOrCreateDefault()` returns the same `Party` across calls. (`PartyRegistryTest.getOrCreateDefault_returnsSameInstanceAcrossCalls`)
- [x] 5.2 Add a unit test that writing credentials onto one `Party` does not affect another. (`PartyRegistryTest.credentialsAreIsolatedBetweenParties`)
- [x] 5.3 Add a unit test that `MusicProviderFactory.forParty` returns a `SpotifyMusicProvider` for `SPOTIFY` and throws `UnsupportedOperationException` for `YOUTUBE`. (`MusicProviderFactoryTest`)
- [x] 5.4 Run existing integration tests (`ExampleResourceIT`). Pre-existing missing-config failure for `spotify.client.id`/`secret`/`redirect.uri` reproduces on unchanged `main` — not caused by this change. No new regressions from the refactor.
- [ ] 5.5 Manually exercise Spotify OAuth login → add track → play → skip against the dev backend; confirm no regression vs. pre-change behavior. **Deferred — requires running Spotify credentials; handed to user.**

## 6. Verify against spec
- [x] 6.1 `provider/spec.md` "Provider Tokens Are Party-Scoped" — credentials are reachable only via `Party.getSpotifyCredentials()`. No global singleton holds them any longer. Requirement **satisfied structurally**; deletion-on-end depends on the lifecycle-endpoints change.
- [x] 6.2 `party/spec.md` "Host Provider Login is Party-Scoped" — covered by `PartyRegistryTest.credentialsAreIsolatedBetweenParties`. A second party has its own independent `SpotifyCredentials` instance.
- [x] 6.3 Follow-up changes still blocking per original verification report: `add-party-lifecycle-endpoints` (create/end/PIN/QR — removes `@Deprecated getOrCreateDefault()`), `add-host-authz`, `add-guest-rate-limiting`, `add-blacklist`, `add-voting-and-likes-ordering`, `add-youtube-provider`, `add-token-refresh`, `add-live-update-channel`.
