# Continuation — First OpenSpec change applied: add-party-aggregate-and-per-party-tokens

Second session on MusicVoting (see `continuations/2026-04-20_functional-spec-openspec.md` for the first). User confirmed **Option A** framing (baseline = target) and applied the first close-the-gap change. What-was-done inventory and verification findings are derivable from `openspec/changes/add-party-aggregate-and-per-party-tokens/` and git log — this file captures only what isn't in those.

## Key design decisions during apply

- **`MusicProvider` is a stateless `@ApplicationScoped` bean**, every method takes `Party` as first arg, reads credentials via `party.getSpotifyCredentials()`. `design.md` initially had per-party provider instances; changed mid-apply when the CDI idiom became clear. The old `SpotifyPlayer` was already stateless-singleton-reading-from-singleton-TokenStore — this pattern preserves that shape with state relocated onto `Party`.
- **Spotify-specific lifecycle methods** (`fetchAndStoreUserId`, `ensurePartyPlaylistExists`, `restoreCurrentTrackFromBeginningOnDevice`) stay on `SpotifyMusicProvider` concrete class, NOT on the `MusicProvider` interface. They're called directly by `SpotifyTokenResource` because they are OAuth-flow-specific and have no YouTube analogue.
- **Refresh token now written** in the OAuth callback (`creds.setRefreshToken(tokenMap.get("refresh_token"))`). Was a dead field in the old `TokenStore`. Minor hygiene fix; actual token-refresh call path still deferred to a later change.

## Pitfalls specific to this session's output

- **`PartyRegistry.getOrCreateDefault()` is deliberately `@Deprecated`.** It's a transitional hack that makes existing endpoints work until `add-party-lifecycle-endpoints` lands. A future agent seeing it and "cleaning up" will break every endpoint. The Javadoc + deprecation marker is the only guardrail.
- **`ExampleResourceTest` fails with missing `spotify.client.id/secret/redirect.uri`** — pre-existing on clean `main`, not a regression. Don't chase. (Covered in memory; repeating here because it's easy to trip over.)
- **`SpotifyMusicProvider` absorbed `SpotifyPlayer` wholesale.** If Spotify playback regresses after this change, the diff is mechanical (`tokenStore.X()` → `party.getSpotifyCredentials().X()`) and should bisect cleanly — look for a missed replacement.

## How to resume

1. If user has smoke-tested (task 5.5 in `tasks.md`): archive the change to `openspec/changes/archive/2026-04-20-add-party-aggregate-and-per-party-tokens/`. **No baseline spec merge** — this change has no delta files (close-the-gap change under Option A).
2. Next natural change is `add-party-lifecycle-endpoints`: create/end/PIN/QR/join-URL, deletes the default-party fallback, wires request → partyId resolution. Baseline `openspec/specs/party/spec.md` already specifies the behavior.
3. Full follow-up chain is in memory entry `project_first-change-status.md`.
