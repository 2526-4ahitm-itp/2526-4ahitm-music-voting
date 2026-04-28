# Proposal: Introduce Party aggregate and per-party provider tokens

## Intent

The backend currently has no `Party` concept. Provider OAuth tokens are held in an `@ApplicationScoped` `TokenStore`, so every caller shares a single token regardless of which party they belong to. This blocks every other spec requirement that is "per-party" by definition — host authorization, rate limiting, blacklist, voting, queue ordering, dashboard PIN — because there is nothing to attach those things to.

This change introduces the `Party` aggregate as the top-level domain object and moves provider token storage onto it, behind a provider abstraction so a YouTube adapter can be added later without rewriting callers. It is the minimum viable foundation the rest of the verification backlog depends on.

## Scope

In scope:
- Add a `Party` domain entity identified by a party-ID, created in-memory (persistence strategy is a design decision, not a spec concern).
- Introduce a provider-abstraction seam (`MusicProvider` interface or equivalent) with a **Spotify adapter only**; shape the seam so a YouTube adapter can slot in later.
- Move `TokenStore` from `@ApplicationScoped` singleton state to per-party storage, reachable via the `Party`.
- Wire existing `SpotifyPlayer` / `SpotifyTokenResource` / `TrackResource` call sites through the new seam, resolving the `Party` from the request.
- Delta specs against `party/` and `provider/` domains capturing the behavior above.

Out of scope (deferred to follow-up changes):
- Party **lifecycle endpoints**: create, end, PIN/QR generation, join flow. The spec for those exists in `specs/party/` but the endpoints are a separate change.
- **Client reconnect / state reload** after network drop.
- **YouTube provider adapter** — the seam is introduced, the adapter is not.
- **Host authorization** on existing host-only endpoints (`pause`, `resume`, `skip`, `remove`) — tracked as its own change; this proposal only *enables* it by giving those endpoints a `Party` to check against.
- Rate limiting, blacklist, voting, queue re-ordering, dashboard PIN — all depend on this change but each is its own proposal.
- Token refresh logic — the refresh token will be stored on the party, but the refresh call path is deferred.

## Approach

Model `Party` as an aggregate root that owns its provider binding and provider-specific credentials. Replace direct reads of the singleton `TokenStore` with a lookup that starts from a `Party` identifier — for the duration of this change, endpoints that today have no party context will resolve the "default" party so existing behavior keeps working; once party-lifecycle endpoints land in the follow-up change, callers will pass a real party-ID and the default-party fallback is removed.

Provider integration moves behind a narrow interface exposing the operations current call sites already use (search, enqueue, playback control, queue read). The Spotify adapter wraps the existing `SpotifyPlayer` logic; no behavior changes for Spotify users. The interface is shaped to fit YouTube's likely surface but we do not build the YouTube side yet — that's a later proposal.

The goal of this change is structural, not behavioral: after it lands, a grep for `TokenStore` should return per-party storage accessed via `Party`, and the next round of changes (authz, rate limiting, blacklist, voting) has a place to live.
