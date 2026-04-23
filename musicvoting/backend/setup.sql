-- MusicVoting — initial schema
-- Runs automatically via docker-entrypoint-initdb.d on first container start.

CREATE TABLE party (
    id              VARCHAR     PRIMARY KEY,
    provider_kind   VARCHAR     NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE queue_entry (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id    VARCHAR     NOT NULL REFERENCES party(id) ON DELETE CASCADE,
    track_uri   VARCHAR     NOT NULL,
    track_name  VARCHAR     NOT NULL,
    artist_name VARCHAR     NOT NULL,
    album_name  VARCHAR,
    image_url   TEXT,
    duration_ms INTEGER,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (party_id, track_uri)
);

CREATE TABLE vote (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_entry_id  UUID        NOT NULL REFERENCES queue_entry(id) ON DELETE CASCADE,
    device_id       VARCHAR     NOT NULL,
    voted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (queue_entry_id, device_id)
);

-- Resolve circular reference: party → queue_entry (added after queue_entry exists)
ALTER TABLE party
    ADD COLUMN currently_playing_entry_id UUID REFERENCES queue_entry(id) ON DELETE SET NULL;
