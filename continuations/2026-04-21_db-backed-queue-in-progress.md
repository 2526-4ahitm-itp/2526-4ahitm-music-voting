# Continuation — DB-Backed Queue (add-db-backed-queue), Implementation in Progress

Branch: `feature/db`

## What was done this session

Implemented all code tasks for the `add-db-backed-queue` OpenSpec change. Read
`openspec/changes/add-db-backed-queue/` for the full spec, design, and task list.

### Files created
- `musicvoting/backend/setup.sql` — PostgreSQL schema (party, queue_entry, vote + circular FK via ALTER TABLE)
- `musicvoting/docker-compose.yml` — PostgreSQL 16 container, mounts setup.sql, named volume
- `musicvoting/backend/src/main/java/at/htl/domain/QueueEntry.java` — Panache entity
- `musicvoting/backend/src/main/java/at/htl/domain/Vote.java` — Panache entity
- `musicvoting/backend/src/main/java/at/htl/domain/PartyEntity.java` — stub Panache entity for `party` table

### Files modified
- `application.properties` — added datasource + `hibernate-orm.database.generation=none`
- `MusicProvider.java` — added `toggleVote(Party, String trackUri, String deviceId)` to interface
- `SpotifyMusicProvider.java` — replaced `getQueue`, `addTracksToPlaylist`, `removeTrack`,
  `playNextAndRemove`, `startFirstSongWithoutRemoving`, `overwritePlaylist` with DB-backed
  implementations; added `toggleVote`; added `EntityManager` injection and private metadata helpers
- `TrackResource.java` — added `POST /track/vote` endpoint

### Key deviation from design.md
`Party.java` was NOT annotated as a Panache entity. Instead, `PartyEntity.java` was created as a
separate class. `Party.java` stays as the in-memory representation used by `PartyRegistry`.
This avoids breaking existing in-memory code before `add-party-lifecycle-endpoints` lands.

## What still needs to happen

1. **Task 1.3** — Run `docker compose up -d` inside `musicvoting/`, connect IntelliJ to
   `localhost:5432` (DB: musicvoting, user: musicvoting, pw: musicvoting), review ER diagram.
2. **Tasks 6.1–6.5** — Smoke-test verification (queue sort, duplicate rejection, vote toggle,
   no Spotify playlist GET in logs, queue survival across restart).
3. If verification passes → **archive** the change:
   - Merge delta specs into `openspec/specs/queue/spec.md` and `openspec/specs/voting/spec.md`
   - Move `openspec/changes/add-db-backed-queue/` to
     `openspec/changes/archive/2026-04-21-add-db-backed-queue/`

## Pitfalls to watch for

- `PartyEntity.findOrCreate` is called inside `@Transactional` methods in `SpotifyMusicProvider`.
  The default party ID comes from `PartyRegistry.getOrCreateDefault()` which uses `"default"` as
  the ID. The party row will be auto-created on first DB write — this is intentional.
- `removeTrackFromPlaylist` (the old Spotify helper) still exists in `SpotifyMusicProvider` — it
  is no longer called by any of the replaced methods, but it is still referenced nowhere. It can be
  deleted once you confirm nothing else calls it.
- `pom.xml` already had `quarkus-hibernate-orm-panache` and `quarkus-jdbc-postgresql` — no change
  was needed there.
- The `ExampleResourceTest` still fails on missing Spotify credentials — pre-existing, ignore.

## How to resume

Read this file, then read `openspec/changes/add-db-backed-queue/tasks.md` to see checked-off state.
If the user wants to verify, start with `docker compose up -d` and the IntelliJ DB connection.
If the user wants to archive, run the OpenSpec archive flow (skill section 9).
If code review is needed, read `SpotifyMusicProvider.java` in full — that is where all the
significant changes landed.
