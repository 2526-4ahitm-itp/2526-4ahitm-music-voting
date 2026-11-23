# Spec Delta

## MODIFIED Requirements

### Requirement: Search-Based Refill Backstop Guarantees a Next Song
When the default-playlist, similar-songs, and Top-Charts sources all yield nothing, the provider MUST fall back to Spotify's `GET /v1/search` (which remains available to the app, unlike the recommendation and editorial-playlist endpoints). The provider MUST first search for tracks by the currently playing song's primary artist, and if that yields nothing, MUST issue a broad query over the current year and the 15 years before it. Results MUST be shuffled. This guarantees there is always a next song to refill with as long as Spotify is reachable; the refill produces no songs only when search itself fails (e.g. no network), in which case playback stops per `playback/spec.md`.

#### Scenario: All playlist/similar sources empty, search by artist succeeds
- GIVEN no default playlist is set
- AND the similar-songs and Top-Charts sources yield nothing
- WHEN the system refills the empty queue
- THEN it searches for tracks by the currently playing song's artist
- AND adds a track from those results so playback continues

#### Scenario: Artist search empty, broad search backstops
- GIVEN the artist search yields nothing (e.g. the current song has no usable artist)
- WHEN the system refills the empty queue
- THEN it issues a broad search query
- AND adds a track from those results

#### Scenario: Broad search covers the last 15 years up to now
- **GIVEN** the current year is 2026
- **WHEN** the provider issues the broad search query
- **THEN** the query is `year:2011-2026`
- **AND** in a later year the range moves along without a code change

#### Scenario: Search itself unavailable
- GIVEN no default playlist is set
- AND every source including search yields no songs (e.g. Spotify is unreachable)
- WHEN the system attempts to refill
- THEN no songs are added
