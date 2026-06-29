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

### Requirement: Similar-Songs Refill Falls Back When Unavailable
When no default playlist is set, the empty-queue refill MUST source "similar" songs from the artists the party has played. Because Spotify's `/v1/recommendations` and related-artists endpoints are disabled for newer apps (404) and the artist endpoint no longer returns genres, the provider MUST approximate "similar" by rotating across the **top tracks of the artists added this party** (`/v1/artists/{id}/top-tracks`), varied (shuffled) so successive refills are not repetitive. The set of artists MUST grow as guests add songs by new artists. This MUST be best-effort: if the lookup fails or returns nothing, the system MUST fall back to a configured Top-Charts playlist source; if that also yields nothing, the refill MUST produce no songs (and playback then stops per `playback/spec.md`).

#### Scenario: Similar songs vary across the party's artists
- GIVEN no default playlist is set
- AND guests have added songs by artists A and B
- WHEN the system refills the empty queue over several songs
- THEN it draws candidate songs from the top tracks of A and B (not only the last-played artist)

#### Scenario: Similar lookup unavailable falls back to Top-Charts
- GIVEN no default playlist is set
- AND the similar-songs lookup fails or is unavailable
- WHEN the system refills the empty queue
- THEN it draws candidate songs from the configured Top-Charts playlist instead

#### Scenario: No source yields songs
- GIVEN no default playlist is set
- AND both the similar-songs lookup and the configured Top-Charts source yield no songs
- WHEN the system attempts to refill
- THEN no songs are added
