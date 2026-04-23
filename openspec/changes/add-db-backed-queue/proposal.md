# Proposal: Add DB-Backed Queue (PostgreSQL as Source of Truth)

## Intent

Currently the voting queue is stored entirely as a Spotify playlist. Every read (`GET /track/queue`),
every add, and every remove makes a live call to the Spotify API. This causes unnecessary API usage,
regularly hits Spotify's rate limits, and makes the queue state dependent on an external service that
was not designed to be a database. The fix is to make PostgreSQL the single source of truth for the
queue: songs are stored locally, sorted and queried from the DB, and Spotify is only called for
playback commands (play, pause, skip) — not for queue state.

## Scope

In scope:
- Design and create the initial database schema (`setup.sql`) covering the queue and its supporting
  entities (parties, tracks in the queue, likes/votes)
- Set up a docker compose stack that starts PostgreSQL and runs `setup.sql` automatically on first
  start
- All table decisions are reviewed as an ER diagram in IntelliJ before any Java code is written

Out of scope (handled in subsequent changes):
- Wiring the Quarkus backend to use the DB (no Java changes in this change)
- Migrating existing in-memory `PartyRegistry` to a `party` DB table (tracked separately under
  `add-party-lifecycle-endpoints`)
- Frontend changes
- Token refresh logic
- Blacklist persistence (separate change)

## Schema Decisions

- **Votes/likes**: `vote` table with `(queue_entry_id, device_id)` unique constraint. Frontend sends
  a `deviceId` to identify the voter. Like count is computed via `COUNT(vote.id)` at query time —
  no denormalized counter.
- **Party table**: stub only — `id` (PK) + `provider_kind` + `created_at`. Full lifecycle columns
  added in `add-party-lifecycle-endpoints`.
- **Currently playing**: `currently_playing_entry_id UUID` FK on `party` → `queue_entry(id)`,
  `ON DELETE SET NULL`. Added via `ALTER TABLE` after `queue_entry` is created to resolve the
  circular reference.
- **Blacklist**: out of scope, separate change.

## Approach

Create `musicvoting/backend/setup.sql` defining the tables for `party`, `queue_entry`, and `vote`
(and optionally `blacklist_word`). Add a `docker-compose.yml` at `musicvoting/` (or
`musicvoting/backend/`) that starts a PostgreSQL 16 container and mounts `setup.sql` into
`/docker-entrypoint-initdb.d/` so it runs automatically on first start. No Quarkus or Angular
changes are made in this step — the goal is to get the schema visible in IntelliJ's database tool
so the ER diagram can be reviewed and the design confirmed before implementation begins.
