# Continuation — enforce-host-authorization complete

Branch: `fix/host-authorization`

## What was done this session

- Merged `origin/main` into `fix/host-authorization` (clean merge, no file conflicts).
- Discovered teammates implemented a two-PIN system on main (`hostPin` alongside guest `pin`). Adapted our implementation to use `hostPin` as the bearer credential instead of a separate UUID `hostToken`.
- Implemented and verified the full `enforce-host-authorization` change:
  - `Party.java` — uses `hostPin` field (passed in constructor, generated in `PartyResource`)
  - `HostOnly.java` (new) — JAX-RS `@NameBinding` annotation
  - `HostAuthFilter.java` (new) — `@Provider @HostOnly ContainerRequestFilter`; validates `Authorization: Bearer <hostPin>`; returns 401 (missing), 403 (wrong), 404 (party not found)
  - `PartyResource.java` — `@HostOnly` on `DELETE /{id}`; `hostPin` in POST response
  - `TrackResource.java` — `@HostOnly` on `play`, `pause`, `resume`, `next`, `start`, `saveToPlaylist`, `remove`
  - `host-auth.interceptor.ts` (new) — adds `Authorization` header when `mv_party_host_pin` is in localStorage
  - `host.guard.ts` (new) — blocks host routes without stored host PIN
  - `main.ts` — `withInterceptors([hostAuthInterceptor])`
  - `app.routes.ts` — `canActivate: [hostGuard]` on `startpage`, `dashboard`, `voting-host`, `search-host`
- All 30 tasks verified (API: 401/403/204 confirmed; frontend: guard redirect + auth header in DevTools)
- Delta specs synced to `openspec/specs/party/spec.md` and `openspec/specs/host/spec.md`
- Change archived to `openspec/changes/archive/2026-05-26-enforce-host-authorization/`
- Committed as `a7dd1584`

## Known deviation from original design

The original proposal called for a UUID `hostToken`. Implementation uses `hostPin` (5-digit) instead, matching the two-PIN system teammates added on main. The bearer token mechanism (`Authorization: Bearer`) is identical; only the token value differs.

## Current state

- `openspec/changes/` has one remaining active change: `refresh-spotify-access-token` (proposal only)
- `fix/host-authorization` branch is ahead of `origin/main` by several commits
- DB was recreated (`docker compose down -v && docker compose up -d`) — fresh schema with `host_pin` column

## What's next

**`refresh-spotify-access-token`** — proposal exists at `openspec/changes/refresh-spotify-access-token/proposal.md`. Next step: create `design.md`, `specs/`, and `tasks.md`, then implement.

Summary of what that change does:
- Detect HTTP 401 from Spotify API calls in `SpotifyMusicProvider`
- Call `POST https://accounts.spotify.com/api/token` with `grant_type=refresh_token`
- Store new access token (and new refresh token if returned) back into `SpotifyCredentials`
- Retry the original Spotify call once
- Store token expiry timestamp (`expires_in`) on `SpotifyCredentials` for proactive refresh

## How to resume

Read this file and `CLAUDE.md`. Start the DB: `cd musicvoting && docker compose up -d`. Active change is `refresh-spotify-access-token` — start with `/opsx:apply refresh-spotify-access-token` or `/openspec`.
