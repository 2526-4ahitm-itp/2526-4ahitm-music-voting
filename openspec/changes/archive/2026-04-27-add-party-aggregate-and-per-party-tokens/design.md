# Design: Party aggregate and per-party provider tokens

## Technical Approach

Introduce a `Party` domain entity as the aggregate root. Each `Party` owns (a) its provider binding (Spotify today, YouTube later) and (b) the provider-specific credentials and per-party runtime state that currently live in `TokenStore` — access token, refresh token, device ID, playlist ID, Spotify user ID, last-playback URI, last-playback active flag, iOS installation ID.

Provider integration moves behind a narrow `MusicProvider` interface shaped around the operations already exercised by `SpotifyPlayer` (search, add, remove, read queue, play, pause, resume, skip). A `SpotifyMusicProvider` implementation wraps the existing Spotify logic. The interface is designed to admit a future YouTube adapter but YouTube is not implemented in this change.

For the duration of this change, endpoints that currently have no party context (all of them) resolve a single implicit "default party" via `PartyRegistry.getOrCreateDefault()`. This method is marked `@Deprecated` with a pointer to the follow-up change (`add-party-lifecycle-endpoints`); once callers pass a real party-ID, the default-party fallback is deleted. Behavior for Spotify users is unchanged by this transition — it is purely a wiring refactor.

Party state is held in-memory (`ConcurrentHashMap` in an `@ApplicationScoped` `PartyRegistry`). Durable persistence is out of scope: the schema will be shaped by the party-lifecycle change, and committing to one now risks a double-migration.

## Architecture Decisions

### Decision: `Party` is an in-memory aggregate, no persistence yet
Hold `Party` instances in a `ConcurrentHashMap<PartyId, Party>` inside an `@ApplicationScoped` `PartyRegistry`. Because:
- The lifecycle endpoints (create/end/PIN) in the follow-up change will determine the persistence shape; defining a schema now is guesswork.
- The current app has no database wiring, so adding JPA here would expand scope significantly.
- Party state was already effectively in-memory — the old `TokenStore` was a singleton with no persistence either.
Alternatives considered: JPA entity with H2 — rejected as premature; Redis-backed store — rejected as infra creep.

### Decision: Credentials live on the `Party`, not in a separate per-party `TokenStore`
Each `Party` holds a provider-specific credentials value object (`SpotifyCredentials` for now). Because:
- Credentials have no meaning independent of a party, and co-locating them with the aggregate makes lifecycle (delete-on-end) trivially correct.
- Avoids a second lookup structure keyed by party-ID.
Alternatives considered: `TokenStore` keyed by party-ID — rejected because it reproduces the current bug pattern (global structure, party-ID as an afterthought).

### Decision: `MusicProvider` interface covers only today's operations
Shape the interface around what `TrackResource` already calls: `searchTracks`, `getTrack`, `play`, `overwritePlaylist`, `getQueue`, `addToQueue`, `removeTrack`, `playNextAndRemove`, `pausePlayback`, `resumePlayback`, `startFirstSongWithoutRemoving`, `getCurrentPlayback`. Because:
- A speculative interface designed for an imagined YouTube adapter will be wrong. Grow the interface when the YouTube change actually writes the adapter.
- Current call sites are known and small; over-fitting them is the pragmatic move.
Alternatives considered: a rich abstract `Provider` with capability flags — rejected as speculative.

Spotify-specific lifecycle operations (`fetchAndStoreUserId`, `ensurePartyPlaylistExists`, `restoreCurrentTrackFromBeginningOnDevice`) stay on `SpotifyMusicProvider` as concrete methods — not on the interface. `SpotifyTokenResource` calls them directly on the Spotify implementation because they are part of the Spotify OAuth flow and have no YouTube analogue.

### Decision: `MusicProvider` implementations are stateless `@ApplicationScoped` beans; every method takes a `Party`
`SpotifyMusicProvider` is a singleton CDI bean with no instance state; each method takes the `Party` as its first parameter and reads credentials from `party.getSpotifyCredentials()`. A `MusicProviderFactory` resolves the right `MusicProvider` for a `Party`'s `ProviderKind`. Because:
- Quarkus is built around `@ApplicationScoped` stateless beans; per-party provider instances would fight CDI and complicate testing.
- The previous `SpotifyPlayer` was already stateless + singleton (reading from the singleton `TokenStore`) — this preserves that shape while moving state onto the `Party`.
- Callers that used to be `@Inject SpotifyPlayer spotify;` become `@Inject MusicProviderFactory factory; var p = factory.forParty(party);` — one extra indirection, no lifetime changes.
Alternatives considered: per-party provider instances held inside the `Party` aggregate — rejected; would require either custom CDI scopes or manual wiring, and the credentials-as-value-object pattern already captures per-party state cleanly.

### Decision: Transitional `getOrCreateDefault()` fallback
`PartyRegistry` exposes a `@Deprecated` `getOrCreateDefault()` returning a single singleton `Party` for this change's duration. Because:
- Lifecycle endpoints are deferred; without this fallback, existing endpoints have no `Party` to resolve.
- Marking it deprecated documents intent and makes removal in the next change a grep away.
Alternatives considered: (a) ship party-creation in this change — rejected as scope creep; (b) break existing endpoints until lifecycle lands — rejected because it leaves main broken between changes.

### Decision: `SpotifyPlayer` is moved and renamed, not kept + wrapped
Rename `SpotifyPlayer` to `SpotifyMusicProvider` and move it under `at.htl.provider.spotify`. Constructor takes a `SpotifyCredentials` reference (resolved from the `Party`) instead of reading from the singleton `TokenStore`. Because:
- Keeping `SpotifyPlayer` around as a wrapped legacy class would give us two classes doing the same job and no real seam.
- The seam only becomes real if Spotify is actually on one side of the interface.
Alternatives considered: leave `SpotifyPlayer` in place, wrap it — rejected; the next developer would treat the wrapper as the seam and put YouTube behind it, leaving SpotifyPlayer as a historical oddity.

## Data Flow

```
HTTP request
    │
    ▼
[Endpoint]  ──► PartyRegistry.getOrCreateDefault()  ──► Party
    │                                                      │
    │                                                      ├─► providerKind: SPOTIFY
    │                                                      └─► spotifyCredentials: SpotifyCredentials
    │
    ▼
MusicProviderFactory.forParty(party) ──► MusicProvider ──► SpotifyMusicProvider (@ApplicationScoped)
                                                                    │  (reads party.getSpotifyCredentials() per call)
                                                                    ▼
                                                            Spotify Web API
```

After follow-up change lands, the `PartyRegistry.getOrCreateDefault()` call is replaced by `PartyRegistry.resolve(partyIdFromRequest)` and the default-party fallback is deleted.

## File Changes

New:
- `at/htl/domain/Party.java` — aggregate root: id, providerKind, Spotify credentials accessor.
- `at/htl/domain/PartyId.java` — value object wrapping the id.
- `at/htl/domain/PartyRegistry.java` — `@ApplicationScoped`, holds `ConcurrentHashMap<PartyId, Party>`, exposes `getOrCreateDefault()` (deprecated) and a package-private `register`/`remove` for the lifecycle change to use later.
- `at/htl/domain/ProviderKind.java` — enum: `SPOTIFY`, `YOUTUBE`.
- `at/htl/provider/MusicProvider.java` — interface; every method takes a `Party` as its first argument.
- `at/htl/provider/MusicProviderFactory.java` — `@ApplicationScoped`; resolves the right `MusicProvider` for a `Party`'s `ProviderKind`.
- `at/htl/provider/spotify/SpotifyMusicProvider.java` — `@ApplicationScoped`, stateless, implements `MusicProvider`, absorbs the logic previously in `SpotifyPlayer`. Reads credentials from `party.getSpotifyCredentials()` on each call.
- `at/htl/provider/spotify/SpotifyCredentials.java` — value object absorbing `TokenStore`'s fields.

Modified:
- `at/htl/endpoints/SpotifyTokenResource.java` — on OAuth callback, resolve the default party, write credentials onto it instead of into `TokenStore`.
- `at/htl/endpoints/TrackResource.java` — resolve the default party, obtain `MusicProvider` from it, call through interface.
- `at/htl/service/SpotifyApiErrors.java` — unchanged in logic, may need import updates.

Deleted:
- `at/htl/service/TokenStore.java` — fields absorbed into `SpotifyCredentials` on the `Party`.
- `at/htl/service/SpotifyPlayer.java` — replaced by `SpotifyMusicProvider` under `at/htl/provider/spotify/`.
