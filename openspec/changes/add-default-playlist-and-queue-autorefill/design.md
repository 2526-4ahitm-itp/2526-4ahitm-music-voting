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

The refill is triggered **~3 seconds before the current song ends**, not at song start and not at song end. The player (`startpage`, which runs the Spotify Web Playback SDK) watches the SDK position each second; when `duration - position <= 3000ms` it POSTs `/api/party/{id}/track/prepare-next` once per track, which calls `refillQueue(party)`. This keeps the "up next" list empty for almost the whole song — so guests have the full song to add their own tracks, which sort above auto-fill and play next — while still loading one playlist song just early enough that autoplay continues without a gap.

`refillQueue` is a no-op when a guest song is already queued (`others > 0`), so the 3s preload only fills in when the queue would otherwise be empty.

Two earlier timings were rejected:
- **Preload at song start** (one ahead): worked but kept a playlist song sitting in "up next" the whole song.
- **Load at song end** (purely on-demand): the playlist+metadata fetch at end-time left a gap that stalled the SDK.

`playNextAndRemove` keeps an **on-demand fallback**: if the 3s preload was missed (very short song, dropped request) and nothing is queued when the song ends, it refills then — a possible short gap, but playback never dead-stops. `startFirstSongWithoutRemoving` does not preload (the first song's 3s-before-end trigger handles the hand-off).

Guests keep priority: auto-filled entries sort **below** any guest entry (see the `autofilled` sort), so a guest add always slots above any auto-filled song.

`refillQueue` adds **exactly one** song to the **bottom** of the queue (one at a time — the queue is never pre-filled with the whole playlist; the next song is loaded only once the queue would empty again):
- **Default playlist set:** fetch the playlist's tracks, pick the first track not currently queued and not already auto-filled this party (so it walks the playlist forward in order); if every candidate was already used, allow a repeat so playback never dead-ends. Add it as a queue entry.
- **No default playlist:** source "similar" songs seeded by the current track (the seed track's artists' top tracks); add one not-yet-used track.

Already-auto-filled track URIs are tracked in memory on the `Party` (`recordAutoFilled`/`wasAutoFilled`). This is needed because played songs are deleted from `queue_entry` on advance — without the history, a one-at-a-time refill would oscillate between the first two playlist tracks instead of progressing.

Auto-filled entries must sort **below** any guest entry. The queue already sorts by vote count; auto-filled and guest entries both start at 0 votes, so ordering among 0-vote entries must put auto-filled last. Implementation: either a boolean `autofilled` flag on the entry used as a secondary sort key (guest entries first), or insert auto-filled entries with an order/timestamp that always trails real adds. The flag is preferred because a later guest add must still slot above an already-present auto-filled song.

## "Similar songs" source + fallback

Spotify **disabled `GET /v1/recommendations`** (and `related-artists`) for apps created after 2024-11-27 — they return **404** (confirmed live: `/v1/me` → 200 but `/v1/recommendations` → 404). The artist endpoint also no longer returns genres (`genres: []` live), so genre-based discovery isn't available either. So "similar songs" cannot use recommendations or genres.

Instead, the party records the **artist ids of every song added** (`Party.seenArtistIds`, populated in `addTracksToPlaylist`). When no default playlist is set, the refill **rotates randomly across all those artists' top tracks** (`GET /v1/artists/{id}/top-tracks?market=…`, not deprecated, confirmed live → 200): the artist pool is shuffled, up to 3 random artists are queried, and each artist's top tracks are shuffled — so successive refills vary across the artists the crowd has shown interest in, rather than sticking to the last song's artist. If no artists are recorded yet (e.g. right after a restart), it falls back to the currently playing track's artists. `market` is config (`spotify.market`, default `AT`).

Limitation: this is same-pool-of-artists variety, not true cross-artist "similar artists" discovery (that API is gone). It widens as more guests add different artists.

Order of sources when no default playlist is set:
1. Top tracks rotated (shuffled) across all artists seen this party ("similar").
2. On failure/empty, fall back to a configurable **Top-Charts playlist ID** (`spotify.topcharts.playlist.id`).
3. If that also yields nothing, do nothing — playback stops with "Warteschlange ist leer".

## Provider additions (`MusicProvider` / `SpotifyMusicProvider`)

- `List<Map<String,Object>> listHostPlaylists(Party party)` — `GET /v1/me/playlists`.
- `List<String> getPlaylistTrackUris(Party party, String playlistId)` — `GET /v1/playlists/{id}/tracks`.
- `List<String> getSimilarTrackUris(Party party, String seedTrackId)` — shuffled top tracks across the party's seen artists (`GET /v1/artists/{id}/top-tracks`); best-effort, empty → caller handles fallback.

These reuse the existing authorized-request/token-refresh plumbing in `SpotifyMusicProvider`.

## Endpoints

- `GET /api/party/{id}/spotify/playlists` — host-only; returns `[{ id, name, trackCount, imageUrl }]`.
- `PUT /api/party/{id}/default-playlist` — host-only; body `{ playlistId | null }`; stores on the party.

Both `@HostOnly`, resolved via `findById` (DB-backed) like other party endpoints.

## Open considerations
- Batch size and whether refill should top up to a target depth vs. add a fixed batch — start with a fixed batch of 5.
- De-duplication window: avoid re-adding songs already played this party (track played URIs, or filter against current + recent history).
- iOS creation picker is a deliberate follow-up; the backend endpoints are shared so iOS can adopt them later.
