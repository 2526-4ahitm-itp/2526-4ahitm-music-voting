# Δ provider/spec.md

## ADDED Requirements

### Requirement: Provider Lists Host Playlists and Supplies Refill Tracks
The music provider MUST be able to list the authenticated host's playlists, fetch the track URIs of a given playlist, and supply candidate track URIs for an empty-queue refill seeded by the currently playing track. For Spotify these map to `GET /v1/me/playlists`, `GET /v1/playlists/{id}/tracks`, and the recommendations seed lookup respectively, reusing the provider's existing authorized-request and token-refresh handling.

#### Scenario: List host playlists
- GIVEN an authenticated host for a party
- WHEN the provider lists the host's playlists
- THEN it returns the host's playlists with at least an id and name each

#### Scenario: Fetch playlist tracks for refill
- GIVEN a party whose default playlist is set to playlist P
- WHEN the provider fetches P's tracks for a refill
- THEN it returns the track URIs of P

### Requirement: Recommendation Refill Falls Back When Unavailable
When refilling an empty queue with recommendations seeded by the currently playing track, the provider MUST treat the recommendations source as best-effort. If the recommendations request fails or returns nothing, the system MUST fall back to a configured Top-Charts playlist source; if that also yields nothing, the refill MUST produce no songs (and playback then stops per `playback/spec.md`).

#### Scenario: Recommendations unavailable falls back to Top-Charts
- GIVEN no default playlist is set
- AND the Spotify recommendations request fails or is unavailable
- WHEN the system refills the empty queue
- THEN it draws candidate songs from the configured Top-Charts playlist instead

#### Scenario: No source yields songs
- GIVEN no default playlist is set
- AND both recommendations and the configured Top-Charts source yield no songs
- WHEN the system attempts to refill
- THEN no songs are added
