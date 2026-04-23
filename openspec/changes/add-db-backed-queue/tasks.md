# Tasks

## 1. Infrastructure

- [x] 1.1 Create `musicvoting/backend/setup.sql` with `party`, `queue_entry`, `vote` tables and the
       `ALTER TABLE` for the circular FK (see design.md Schema section)
- [x] 1.2 Create `musicvoting/docker-compose.yml` with PostgreSQL 16, mount `setup.sql` into
       `/docker-entrypoint-initdb.d/`, named volume for data persistence
- [ ] 1.3 Start docker compose stack and verify schema in IntelliJ ER diagram

## 2. Quarkus — Configuration

- [x] 2.1 Add PostgreSQL datasource and Hibernate ORM config to `application.properties`
       (URL, user, password matching docker-compose; `quarkus.hibernate-orm.database.generation=none`)
- [x] 2.2 Add `quarkus-hibernate-orm-panache` and `quarkus-jdbc-postgresql` dependencies to `pom.xml`
       (already present)

## 3. Quarkus — Entities

- [x] 3.1 Create `QueueEntry.java` as a Panache entity mapping `queue_entry` (all columns; no `likeCount`
       field — it is computed)
- [x] 3.2 Create `Vote.java` as a Panache entity mapping `vote` (`queueEntryId`, `deviceId`, `votedAt`)
- [x] 3.3 Created `PartyEntity.java` as a new Panache entity mapping the `party` stub table with
       `currentlyPlayingEntryId` field. **Deviation from design:** `Party.java` was not annotated —
       it is still the in-memory representation used by `PartyRegistry`. `PartyEntity` is a separate
       class to avoid breaking existing in-memory code.

## 4. Quarkus — Queue Read/Write

- [x] 4.1 Replace `SpotifyMusicProvider.getQueue()`: native SQL aggregate query with like count and
       sort; no Spotify playlist API call
- [x] 4.2 Replace `SpotifyMusicProvider.addTracksToPlaylist()`: fetch metadata from Spotify once per
       track, insert into `queue_entry`; duplicate check via DB count
- [x] 4.3 Replace `SpotifyMusicProvider.removeTrack()`: delete the `queue_entry` row by partyId + trackUri
- [x] 4.4 Replace `SpotifyMusicProvider.playNextAndRemove()`: remove currently playing entry from DB,
       read next entry, play via Spotify, update `party.currently_playing_entry_id`
- [x] 4.5 Replace `SpotifyMusicProvider.overwritePlaylist()`: delete all `queue_entry` rows for the
       party, fetch metadata + insert new ones

## 5. Quarkus — Vote Endpoint

- [x] 5.1 Add `POST /track/vote` endpoint to `TrackResource` accepting `{ "uri": "...", "deviceId": "..." }`
- [x] 5.2 Toggle logic: insert `vote` row if absent, delete if present
- [x] 5.3 Return `{ "liked": boolean, "likeCount": long }`

## 6. Verify

- [ ] 6.1 Confirm `GET /track/queue` returns correct sort order (likes DESC, added_at ASC) from DB
- [ ] 6.2 Confirm adding the same song twice returns "Song ist schon in der Warteschlange."
- [ ] 6.3 Confirm vote toggle: second vote from same deviceId removes the row and decreases count
- [ ] 6.4 Confirm no Spotify playlist `GET` calls are made during normal queue reads (check logs)
- [ ] 6.5 Confirm queue persists after backend restart
