# Design: Add DB-Backed Queue

## Technical Approach

PostgreSQL replaces the Spotify playlist as the store for queue state. A `setup.sql` file defines
the schema and is mounted into the PostgreSQL Docker container so it runs automatically on first
start. The Quarkus backend is wired to PostgreSQL via Hibernate ORM with Panache. Three new
entities cover the domain: `QueueEntry` (one row per song per party), `Vote` (one row per
deviceId per song), and a `Party` stub that anchors the FK relationships and tracks the currently
playing entry.

Spotify is only called for playback commands (play, pause, skip, next). Queue reads (`GET
/track/queue`) and writes (add, remove) hit the database only. This eliminates the recurring
Spotify rate-limit problem and makes queue state independent of Spotify API availability.

The like count is not stored as a column. It is computed at query time via `COUNT(vote.id)` with
a `LEFT JOIN` to the `vote` table, then used in an `ORDER BY like_count DESC, added_at ASC`.
This keeps the data consistent without triggers or update logic.

## Architecture Decisions

### Decision: Computed like count, no denormalized counter
Count is derived via SQL aggregate on `vote`. Because:
- Eliminates update races when multiple guests vote simultaneously.
- DB constraint on `(queue_entry_id, device_id)` is the sole enforcement point; no application
  code needs to guard against double-voting.
Alternatives considered: `like_count INTEGER` column updated on each vote — rejected because it
requires a read-modify-write that needs locking.

### Decision: `currently_playing_entry_id` FK on `party`, not a flag on `queue_entry`
A single FK on `party` identifies which song is playing. Because:
- Exactly one song plays at a time per party; a FK expresses that constraint directly.
- Avoids scanning the whole queue to find the `is_playing = true` row.
- `ON DELETE SET NULL` means the column clears automatically when the playing song is removed.
Alternatives considered: `is_playing BOOLEAN` column on `queue_entry` — rejected because it
requires unsetting the previous row on every song transition.

### Decision: Circular FK resolved with ALTER TABLE
`party` references `queue_entry` and `queue_entry` references `party`. `setup.sql` creates
`party` first (without the FK), then `queue_entry`, then adds the FK to `party` via `ALTER TABLE`.
This avoids deferred constraints and keeps `setup.sql` readable.

### Decision: Party table is a stub
Only `id`, `provider_kind`, and `created_at` are stored for now. The full party lifecycle
(PIN, QR, join URL, end) is out of scope and handled under `add-party-lifecycle-endpoints`.
The stub is necessary because `queue_entry.party_id` needs a real FK target.

## Schema

```
party
  id                          VARCHAR  PK
  provider_kind               VARCHAR  NOT NULL
  created_at                  TIMESTAMPTZ  NOT NULL  DEFAULT NOW()
  currently_playing_entry_id  UUID  FK → queue_entry(id)  ON DELETE SET NULL

queue_entry
  id           UUID  PK  DEFAULT gen_random_uuid()
  party_id     VARCHAR  NOT NULL  FK → party(id)  ON DELETE CASCADE
  track_uri    VARCHAR  NOT NULL
  track_name   VARCHAR  NOT NULL
  artist_name  VARCHAR  NOT NULL
  album_name   VARCHAR
  image_url    TEXT
  duration_ms  INTEGER
  added_at     TIMESTAMPTZ  NOT NULL  DEFAULT NOW()
  UNIQUE (party_id, track_uri)

vote
  id              UUID  PK  DEFAULT gen_random_uuid()
  queue_entry_id  UUID  NOT NULL  FK → queue_entry(id)  ON DELETE CASCADE
  device_id       VARCHAR  NOT NULL
  voted_at        TIMESTAMPTZ  NOT NULL  DEFAULT NOW()
  UNIQUE (queue_entry_id, device_id)
```

## Queue Read Query (reference)

```sql
SELECT
    qe.id,
    qe.track_uri,
    qe.track_name,
    qe.artist_name,
    qe.album_name,
    qe.image_url,
    qe.duration_ms,
    qe.added_at,
    COUNT(v.id) AS like_count
FROM queue_entry qe
LEFT JOIN vote v ON v.queue_entry_id = qe.id
WHERE qe.party_id = :partyId
GROUP BY qe.id
ORDER BY like_count DESC, qe.added_at ASC
```

## File Changes

- `musicvoting/backend/setup.sql` (new)
- `musicvoting/docker-compose.yml` (new)
- `musicvoting/backend/src/main/resources/application.properties` (modified — add DB datasource)
- `musicvoting/backend/src/main/java/at/htl/domain/QueueEntry.java` (new — Panache entity)
- `musicvoting/backend/src/main/java/at/htl/domain/Vote.java` (new — Panache entity)
- `musicvoting/backend/src/main/java/at/htl/domain/Party.java` (modified — add Panache annotations)
- `musicvoting/backend/src/main/java/at/htl/provider/spotify/SpotifyMusicProvider.java` (modified — replace playlist API calls with DB reads/writes)
- `musicvoting/backend/src/main/java/at/htl/endpoints/TrackResource.java` (modified — add vote endpoint)
