# Continuation — Both open changes archived, feature/db clean

Branch: `feature/db`

## What was done this session

- Created `CLAUDE.md` in the project root with permanent project context (stack, OpenSpec rules, pitfalls, German strings, Docker config, open questions).
- Verified `add-db-backed-queue`: smoke tests 6.1–6.5 all passed. Fixed two bugs found during verification:
  1. **Datasource config missing** — `quarkus.datasource.*` and `quarkus.hibernate-orm.database.generation=none` were never written to `application.properties`. Added them.
  2. **`docker exec` without `-i` drops stdin** — the smoke test script's psql heredoc was silently doing nothing. Fixed by adding `-i` to the `PSQL` variable and `\set ON_ERROR_STOP 1` to each psql block.
- Created `musicvoting/smoke-test-db-queue.sh` — reusable smoke test for the DB queue (seeds test data, runs curl checks, cleans up).
- Archived `add-db-backed-queue` → `openspec/changes/archive/2026-04-27-add-db-backed-queue/`. Delta specs merged into `openspec/specs/queue/spec.md` and `openspec/specs/voting/spec.md`.
- Verified `add-party-aggregate-and-per-party-tokens` (task 5.5): Spotify OAuth → add track → play → skip all passed manually.
- Archived `add-party-aggregate-and-per-party-tokens` → `openspec/changes/archive/2026-04-27-add-party-aggregate-and-per-party-tokens/`. No spec merge needed (close-the-gap change, no deltas).

## Current state

- `openspec/changes/` is empty. No active changes.
- Both archived changes are in `openspec/changes/archive/`.
- `openspec/specs/` reflects the current agreed behavior including DB-backed queue and deviceId-based voting.

## Dead code to clean up (minor, non-blocking)

`removeTrackFromPlaylist()` private method in `SpotifyMusicProvider.java` (around line 730) is no longer called by any method. Safe to delete in a future cleanup or as part of the next change.

## Git note

`openspec/changes/add-db-backed-queue/proposal.md` had a stray leading space on the `#` heading (was in `git status` at the start of the session). Still uncommitted — worth fixing before the next commit.

## Next change: `add-party-lifecycle-endpoints`

This is the natural next step. It should:
- Add `POST /api/party` (create party) and `DELETE /api/party/{id}` (end party)
- Add PIN and QR code generation on party create
- Add `GET /api/party/join/{pin}` (guest join URL resolution)
- Remove `PartyRegistry.getOrCreateDefault()` and replace all callers with proper party-ID resolution from request context
- Wire `party_id` into guest requests so the DB-backed queue is scoped to a real party (not always `"default"`)

Read `openspec/specs/party/spec.md` before proposing the change.

## How to resume

Read this file and `CLAUDE.md`. The codebase is on branch `feature/db`, DB is started via `cd musicvoting && docker compose up -d`. No in-progress change exists — start fresh with `add-party-lifecycle-endpoints` via the OpenSpec `/openspec` skill (section 2: Create a change).
