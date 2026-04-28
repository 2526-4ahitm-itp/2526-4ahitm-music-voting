# Continuation — Frontend party spec written, backend change pending

Branch: `feature/db`

## What was done this session

- Created `add-party-lifecycle-endpoints` in `openspec/changes/`:
  - `proposal.md` — `POST /api/party`, `DELETE /api/party/{id}`, `GET /api/party/join/{pin}`, `GET /api/party/{id}/qr`; all existing endpoints move to `/api/party/{id}/…`; auth deferred; frontend out of scope
  - `specs/party/spec.md` (delta) — 4 ADDED requirements (create, end, join-by-PIN, QR endpoint, all-paths-scoped); 1 MODIFIED (Party Identity and Join Artifacts, adds DB persistence + QR endpoint)
  - `specs/queue/spec.md` (delta) — 1 MODIFIED (Single Queue per Party, explicitly prohibits "default" shim)
  - `design.md` — ZXing for QR, PIN retry loop, QR as separate endpoint, ended_at soft-delete, OAuth state threading (`"web:<partyId>"` / `"ios:<installationId>:<partyId>"`), split SpotifyTokenResource into callback class + host class
  - `tasks.md` — 27 tasks across 7 groups (schema, maven, domain model, PartyResource, TrackResource migration, SpotifyTokenResource migration, verify)
  - **Not yet implemented.**

- Created `wire-frontend-to-party-endpoints` in `openspec/changes/`:
  - `proposal.md` — new `PartyService` (BehaviorSubject + sessionStorage), update `TrackService` + `SpotifyWebPlayerService` to prefix calls with party ID, new `/join/:pin` route + component, party-creation screen before OAuth, PIN + QR display on dashboard, "Party beenden" button, party-ended SSE handling
  - `specs/guest/spec.md` (delta) — MODIFIED: join-by-PIN resolution step; ADDED: party-ended redirect
  - `specs/host/spec.md` (delta) — ADDED: create-party-before-login, PIN+QR display, "Party beenden" button, party-ended redirect
  - **No design.md or tasks.md yet — this is the next thing to write.**

## Current state

Two open changes:
- `add-party-lifecycle-endpoints` — backend, fully spec'd, tasks written, ready to implement
- `wire-frontend-to-party-endpoints` — frontend, proposal + delta specs only, needs design.md + tasks.md

`openspec/specs/` is unchanged (no archiving done this session).

## Key design decisions already made (do not re-litigate)

- Party ID in URL path (`/api/party/{id}/…`) — not header, not implicit singleton
- QR code served as `GET /api/party/{id}/qr` PNG — not embedded in POST response
- Auth deferred — endpoints unprotected for now
- PIN: 5-digit numeric, SecureRandom, retry up to 10 collisions
- OAuth callbacks stay at `/spotify/callback`, party ID travels in `state` param
- `SpotifyTokenResource` splits into a callback class (stays at `/spotify`) and a host class (moves to `/api/party/{id}/spotify`)
- Frontend: `PartyService` with `BehaviorSubject<string | null>`, persisted to `sessionStorage`

## Frontend code to know before writing design.md + tasks.md

Key files already read:
- `musicvoting/frontend/src/app/services/spotify-tracks.ts` — `TrackService`, calls `/api/track/search` and `/api/track/next`
- `musicvoting/frontend/src/app/services/spotify-player.ts` — `SpotifyWebPlayerService`, calls `/api/spotify/token`, `/api/spotify/deviceId`, `/api/spotify/login`, `/api/track/addToPlaylist`, `/api/track/queue`, `/api/track/play`
- `musicvoting/frontend/src/app/app.routes.ts` — routes: `guest`, `startpage`, `dashboard`, `voting-host`, `search-host`, `voting`; no `/join/:pin` yet

Components not yet read — check `musicvoting/frontend/src/app/pages/` before writing tasks.

## How to resume

Read this file and `CLAUDE.md`. The branch is `feature/db`.

Start by reading the existing frontend change artifacts:
- `openspec/changes/wire-frontend-to-party-endpoints/proposal.md`
- `openspec/changes/wire-frontend-to-party-endpoints/specs/guest/spec.md`
- `openspec/changes/wire-frontend-to-party-endpoints/specs/host/spec.md`

Then explore the Angular components under `musicvoting/frontend/src/app/pages/` to understand which ones make API calls and need updating.

Then write `design.md` (PartyService architecture, sessionStorage schema, route plan) and `tasks.md` for `wire-frontend-to-party-endpoints`.

Do NOT implement yet — this session is spec + design + tasks only.
