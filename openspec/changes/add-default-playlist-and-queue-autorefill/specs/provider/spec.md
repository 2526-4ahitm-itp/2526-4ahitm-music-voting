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

#### Scenario: Default playlist read yields nothing falls through
- GIVEN a party with a default playlist set
- AND reading that playlist yields no tracks (transient error / unreadable / empty)
- WHEN the system refills the empty queue
- THEN it does NOT stop, but falls through to the next sources (similar → Top-Charts → search)
- AND adds a song so playback continues

### Requirement: Similar-Songs Refill Falls Back When Unavailable
When no default playlist is set, the empty-queue refill MUST source "similar" songs from the artists the party has played. Because Spotify's `/v1/recommendations` and related-artists endpoints are disabled for newer apps (404) and the artist endpoint no longer returns genres, the provider MUST approximate "similar" by rotating across the **top tracks of the artists added this party** (`/v1/artists/{id}/top-tracks`), varied (shuffled) so successive refills are not repetitive. The set of artists MUST grow as guests add songs by new artists.

The refill MUST try sources in this order, falling through on empty: (1) the default playlist if set; (2) similar songs (artist top-tracks); (3) a configured Top-Charts playlist; (4) a **search fallback**. Each step is best-effort — failures or empty results fall through to the next.

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

### Requirement: Search-Based Refill Backstop Guarantees a Next Song
When the default-playlist, similar-songs, and Top-Charts sources all yield nothing, the provider MUST fall back to Spotify's `GET /v1/search` (which remains available to the app, unlike the recommendation and editorial-playlist endpoints). The provider MUST first search for tracks by the currently playing song's primary artist, and if that yields nothing, MUST issue a broad query (e.g. a recent-years range). Results MUST be shuffled. This guarantees there is always a next song to refill with as long as Spotify is reachable; the refill produces no songs only when search itself fails (e.g. no network), in which case playback stops per `playback/spec.md`.

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

#### Scenario: Search itself unavailable
- GIVEN no default playlist is set
- AND every source including search yields no songs (e.g. Spotify is unreachable)
- WHEN the system attempts to refill
- THEN no songs are added
