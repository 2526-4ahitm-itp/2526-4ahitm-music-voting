# Design: Default Playlist and Automatic Queue Refill

## Data model

Add to `PartyEntity`:
- `defaultPlaylistId` (`String`, nullable) — Spotify playlist ID chosen at creation, or `null` for "no default playlist".

No new table is needed. The auto-fill writes ordinary `queue_entry` rows.

## Creation flow (web)

Current flow:
1. `create-party` → `POST /api/party` (createParty) → redirect to `/api/party/{id}/spotify/login?source=web`.
2. Spotify OAuth → callback → host dashboard.

New flow inserts a playlist-picker step after the callback:
1. unchanged.
2. OAuth callback redirects to a **playlist picker** route instead of straight to the dashboard.
3. Picker calls `GET /api/party/{id}/spotify/playlists`, lists the host's playlists, plus a prominent **"Ohne Standard-Playlist fortfahren"** (skip) action.
4. Selecting a playlist → `PUT /api/party/{id}/default-playlist` `{ playlistId }`; skip → no call (or explicit clear). Both → navigate to host dashboard.

The OAuth token is required to read the host's playlists, which is why the picker comes after the callback. The `playlist-read-private` scope is already requested (`SpotifyTokenResource`), so no consent change is needed.

## Refill trigger

"One current song and no songs in the queue" means: a track is currently playing (`currentlyPlayingEntryId != null`) and there is no other `queue_entry` for the party besides the playing one.

The check runs server-side right after the queue advances or a song starts:
- after `playNextAndRemove(...)`
- after `startFirstSongWithoutRemoving(...)`

If the post-advance queue (excluding the currently playing entry) is empty, call `refillQueue(party)`.

`refillQueue` adds up to `REFILL_BATCH = 5` songs to the **bottom** of the queue:
- **Default playlist set:** fetch the playlist's tracks, filter out any track URI already played/queued in this party, take the next batch (in playlist order; if exhausted, wrap or pick randomly). Add them as queue entries.
- **No default playlist:** call Spotify recommendations seeded by the current track; add the returned tracks.

Auto-filled entries must sort **below** any guest entry. The queue already sorts by vote count; auto-filled and guest entries both start at 0 votes, so ordering among 0-vote entries must put auto-filled last. Implementation: either a boolean `autofilled` flag on the entry used as a secondary sort key (guest entries first), or insert auto-filled entries with an order/timestamp that always trails real adds. The flag is preferred because a later guest add must still slot above an already-present auto-filled song.

## Recommendations API risk + fallback

Spotify **deprecated `GET /v1/recommendations`** for apps created after 2024-11-27. If this project's Spotify app was registered after that date, the endpoint returns 404. The design therefore treats recommendations as best-effort:

1. Try recommendations seeded by the current track.
2. On failure (404/403/empty), fall back to a configurable **Top-Charts playlist ID** (env var, e.g. a public Spotify charts playlist) and pull from it like a default playlist.
3. If that also yields nothing, do nothing — playback stops with "Warteschlange ist leer" (previous behavior).

This keeps the chosen "recommendations from current song" behavior where the API is available, without leaving parties with dead air where it isn't. The fallback Top-Charts playlist ID is config-only and does not change the host UX.

## Provider additions (`MusicProvider` / `SpotifyMusicProvider`)

- `List<Map<String,Object>> listHostPlaylists(Party party)` — `GET /v1/me/playlists`.
- `List<String> getPlaylistTrackUris(Party party, String playlistId)` — `GET /v1/playlists/{id}/tracks`.
- `List<String> getRecommendationUris(Party party, String seedTrackId)` — `GET /v1/recommendations?seed_tracks=...` (may fail → caller handles fallback).

These reuse the existing authorized-request/token-refresh plumbing in `SpotifyMusicProvider`.

## Endpoints

- `GET /api/party/{id}/spotify/playlists` — host-only; returns `[{ id, name, trackCount, imageUrl }]`.
- `PUT /api/party/{id}/default-playlist` — host-only; body `{ playlistId | null }`; stores on the party.

Both `@HostOnly`, resolved via `findById` (DB-backed) like other party endpoints.

## Open considerations
- Batch size and whether refill should top up to a target depth vs. add a fixed batch — start with a fixed batch of 5.
- De-duplication window: avoid re-adding songs already played this party (track played URIs, or filter against current + recent history).
- iOS creation picker is a deliberate follow-up; the backend endpoints are shared so iOS can adopt them later.
