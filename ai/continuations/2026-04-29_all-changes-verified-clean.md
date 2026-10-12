# Continuation — All changes verified, codebase clean

Branch: `feature/db`

## What was done this session

- Audited all open OpenSpec changes against actual code.
- Found and fixed two bugs during verification of `wire-frontend-to-party-endpoints`:
  1. **Missing `join/:pin` route** in `app.routes.ts` — QR-code scanning would have 404'd. Added `{ path: 'join/:pin', component: CodeInput }`.
  2. **Missing SSE subscription in guest views** — `guest.ts` and `voting-comp.ts` had no `party-ended` handler. Added `EventSource('/api/spotify/events?source=web')` with `onmessage` → `navigate(['/'])` to both.
- Merged delta specs from `wire-frontend-to-party-endpoints` into:
  - `openspec/specs/guest/spec.md` — updated "Join via QR Code" + added "Party-Ended Redirect for Guests"
  - `openspec/specs/host/spec.md` — added 4 requirements: create party before login, PIN/QR display, "Party beenden", party-ended redirect
- Archived `wire-frontend-to-party-endpoints` → `openspec/changes/archive/2026-04-29-wire-frontend-to-party-endpoints/`
- Removed stale `openspec/changes/add-db-backed-queue/` (was already in archive since 2026-04-27)
- All 9 verification tasks passed (9.2–9.8 confirmed manually by user)

## Current state

- `openspec/changes/` is **empty** — no active changes.
- All 4 changes archived:
  - `2026-04-27-add-db-backed-queue`
  - `2026-04-27-add-party-aggregate-and-per-party-tokens`
  - `2026-04-28-add-party-lifecycle-endpoints`
  - `2026-04-29-wire-frontend-to-party-endpoints`
- `openspec/specs/` fully reflects implemented behavior.
- Backend compiles clean. Frontend builds clean (CSS budget warnings only — pre-existing).

## Known deviations from design docs

- `PartyService` uses `localStorage` instead of `sessionStorage` (design.md said sessionStorage). The implementation uses localStorage intentionally for better resilience during OAuth redirects on mobile. Not a bug.
- `removeTrackFromPlaylist()` in `SpotifyMusicProvider.java` (~line 730) is dead code — never called. Safe to delete in a cleanup PR.

## What's next

No open changes. The next feature work should start a new OpenSpec change proposal under `openspec/changes/<name>/`. Likely candidates based on project state:

- **Host authorization** — endpoints are currently unprotected; any client can call `DELETE /api/party/{id}`. A future change should add host-token validation.
- **Token refresh** — Spotify access tokens expire after 1 hour; refresh logic is not yet implemented.
- **Guest identity persistence** — currently guests get a new identity on every reload (open question: localStorage vs cookie vs DeviceId).
- **Rate limiting** — spec says 10 songs/min per guest; implementation status unknown.

## How to resume

Read this file and `CLAUDE.md`. Start the DB: `cd musicvoting && docker compose up -d`. No in-progress change exists — start fresh with a new OpenSpec change via `/openspec`.
