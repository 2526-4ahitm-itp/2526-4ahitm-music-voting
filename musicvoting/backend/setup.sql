-- MusicVoting — initial schema
-- Runs automatically via docker-entrypoint-initdb.d on first container start.

CREATE TABLE party (
    id              VARCHAR     PRIMARY KEY,
    provider_kind   VARCHAR     NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pin             VARCHAR(5)  NOT NULL DEFAULT '',
    host_pin        VARCHAR(5),
    ended_at        TIMESTAMPTZ
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

ALTER TABLE party ADD COLUMN playback_started_at TIMESTAMPTZ;
ALTER TABLE party ADD COLUMN paused_position_ms  BIGINT;

-- Active parties must have unique PINs; ended parties free their PIN slot
CREATE UNIQUE INDEX party_pin_active_idx ON party (pin) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX party_host_pin_active_idx ON party (host_pin) WHERE ended_at IS NULL;
