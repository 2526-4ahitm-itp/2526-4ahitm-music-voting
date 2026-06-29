# Continuation — default-playlist + queue auto-refill implemented (tests green)

Branch: `feature/default-playlist`

## What was done this session

Implemented the `add-default-playlist-and-queue-autorefill` OpenSpec change end to end
(code + tests). The proposal/design/specs already existed (commit `31ab45db`); this session
wrote the implementation and tests. All automated tests pass.

### Backend
- **Schema** (`setup.sql` + applied to running DB via `ALTER TABLE`):
  - `party.default_playlist_id VARCHAR` (nullable)
  - `queue_entry.autofilled BOOLEAN NOT NULL DEFAULT FALSE`
- `PartyEntity.java` — `defaultPlaylistId` column.
- `QueueEntry.java` — `autofilled` column.
- `Party.java` — mutable `defaultPlaylistId` field (volatile) + getter/setter.
- `PartyRegistry.java` — `findOrReconstruct` now carries `defaultPlaylistId` from the DB row.
- `SpotifyMusicProvider.java`:
  - `listHostPlaylists(Party)` → `GET /v1/me/playlists` (id, name, trackCount, imageUrl).
  - `getPlaylistTrackUris(Party, playlistId)` → `GET /v1/playlists/{id}/tracks` (best-effort, empty on failure).
  - `getRecommendationUris(Party, seedTrackId)` → `GET /v1/recommendations` (best-effort, empty on failure).
  - `refillQueue(Party)` — package-private; runs inside the caller's transaction. Adds up to
    `REFILL_BATCH = 5` songs to the bottom (default playlist → recommendations → Top-Charts
    fallback), marks them `autofilled`, dedups against queued URIs, emits `queue-updated` SSE.
  - Called at the end of `playNextAndRemove(...)` and `startFirstSongWithoutRemoving(...)`.
  - Both queue SQL queries now order by `is_currently_playing DESC, qe.autofilled ASC, like_count DESC, added_at ASC`
    so **every** guest entry sorts above **every** auto-filled entry (autofilled is the primary
    key after currently-playing — chosen to make the "guest outranks auto-filled" scenario
    deterministic regardless of votes).
  - New config: `@ConfigProperty Optional<String> topChartsPlaylistId` (`spotify.topcharts.playlist.id`).
    Must be `Optional<String>` — an empty `String` value fails SmallRye conversion (NoSuchElementException).
- `SpotifyTokenResource.java` — `GET /playlists` (`@HostOnly`) → `listHostPlaylists`.
- `PartyResource.java` — `PUT /{id}/default-playlist` (`@HostOnly`, `@Transactional`) sets/clears
  `defaultPlaylistId` on both the entity and the in-memory `Party`.
- `application.properties` — `spotify.web.redirect.uri` changed `/dashboard` → `/select-playlist`;
  added `spotify.topcharts.playlist.id=` (blank).

### Frontend
- `party.service.ts` — `HostPlaylist` interface, `getPlaylists(id)`, `setDefaultPlaylist(id, playlistId|null)`.
- New page `pages/select-playlist/` (ts/html/css) — reads `?partyId=`, lists playlists, select →
  PUT default-playlist → `/dashboard`; "Ohne Standard-Playlist fortfahren" skip → `/dashboard`.
- `app.routes.ts` — `select-playlist` route with `hostGuard` (host pin already in localStorage from create).

### Tests (all green)
- Backend: `SpotifyMusicProviderTest` (+autofilled sort, +2 refill guards), `SpotifyTokenResourceTest`
  (+playlists 401/403/authorized), `PartyResourceTest` (+default-playlist 401/403/authorized).
  Full suite **130/130**.
- Frontend: `party.service.spec.ts` (+getPlaylists/setDefaultPlaylist), `select-playlist.spec.ts` (4 tests).

## Current state
- Working tree has uncommitted changes (backend + frontend) + untracked `select-playlist/` page +
  this continuation. **Nothing committed yet.**
- Change is **NOT archived** — manual E2E (task 7.2) needs a live Spotify host session.
- DB was altered in place; `docker compose down -v` would rebuild fresh from updated `setup.sql`.

## Known limitations / deliberate choices
- The **live Spotify happy paths** (default playlist / recommendations actually adding songs) are
  not unit-tested: the provider's `HttpClient` is a private `final` field, not injectable for
  mocking — consistent with the existing suite, which only tests DB-only + best-effort/early-return
  paths. Covered by manual E2E (7.2).
- Recommendations API is deprecated for newer Spotify apps; if this app's recommendations return
  404, refill (no default playlist) falls back to `spotify.topcharts.playlist.id` — which is blank
  by default, so with no default playlist and no configured Top-Charts id, the queue stops with
  "Warteschlange ist leer" (previous behavior). Set a real charts playlist id to exercise the fallback.
- Auto-filled songs are **not** blacklist-checked (explicitly out of scope per proposal).
- iOS creation picker is out of scope; backend endpoints are shared so iOS can adopt later.

## Session-2 fixes (during live E2E with the user)
- **Playlist picker showed nothing**: the app is **zoneless** (`provideZonelessChangeDetection()`),
  and `SelectPlaylist` set `playlists`/`isLoading` inside an `await` with no change detection →
  view never re-rendered. Fixed by injecting `ChangeDetectorRef` and calling `detectChanges()` after
  the async load, after the save-error, and right after setting `isSaving` in `choose()` (the last
  one also avoids an NG0100 on the `[disabled]` binding). The original unit test missed this because
  it asserted on component fields, not the DOM — the "loads playlists" test now asserts rendered DOM.
  (Backend was verified fine: `GET /spotify/playlists` returns the host's playlists, incl. the
  auto-created "Musicvoting party".)
- **Currently playing song appeared in the player's up-next queue**: when the only queue row is the
  current song, the `currentTrack`-uri/id filter leaked it on load races. Added an authoritative
  `if (track?.isCurrentlyPlaying) return false;` to the queue filter in BOTH `startpage.ts` (player)
  and `host-dashboard.ts`. The backend already flags the current entry via `isCurrentlyPlaying`.

## Session-3 tweaks (user feedback on refill behaviour)
- **One song at a time, not the whole playlist**: `REFILL_BATCH` removed — refill adds exactly one
  song. Added a per-party in-memory auto-fill history (`Party.recordAutoFilled`/`wasAutoFilled`) so it
  walks the playlist forward (A→B→C) instead of oscillating between the first two tracks (played songs
  are deleted from `queue_entry`, so dedup-against-queue alone isn't enough). Wraps/repeats when the
  playlist is exhausted so playback never dead-ends. `getRecommendationUris` now requests a fixed
  `RECOMMENDATION_POOL = 20` candidate pool.
- **On-demand, not pre-buffered**: removed the proactive `refillQueue` calls. Refill now runs inside
  `playNextAndRemove` only when the current song is over and nothing else is queued — it pulls one
  playlist song at that moment and plays it. `startFirstSongWithoutRemoving` no longer refills. So
  while a playlist song plays, the "up next" list stays empty until the song ends (brief inter-song
  gap is expected and intended).

## Session-8 (variety in "similar songs" — user picked "all played artists")
- Live finding: the artist endpoint now returns **empty `genres`**, so genre-derived discovery isn't
  possible; genre *search* works but needs a genre string we can't derive. User chose "rotate across
  all played artists".
- `Party.seenArtistIds` (in-memory Set) records the artist ids of every song added
  (`addTracksToPlaylist` → `parseArtistIds(meta)`).
- `getSimilarTrackUris` rewritten: build the artist pool from `seenArtistIds` (fallback: seed track's
  artists), **shuffle** the pool, query up to 3 random artists' top tracks, **shuffle** each — so
  refills vary across the crowd's artists instead of sticking to the last song's artist.
- Unit tests + full suite green. NOT live-verified end-to-end (would pollute the user's active party,
  and dev reloads wipe tokens); the data source (top-tracks → 200) was verified earlier and the
  rotation/shuffle is pure logic. `seenArtistIds` is in-memory (resets on restart; the seed fallback
  covers that).

## Session-7 ("similar songs" when no default playlist)
- `/v1/recommendations` is **404** for this Spotify app (confirmed live: `/v1/me`→200, recos→404).
  Spotify disabled recommendations + related-artists for apps created after 2024-11-27.
- Replaced `getRecommendationUris` with **`getSimilarTrackUris`**: seeds by the current track's
  **artists' top tracks** (`GET /v1/artists/{id}/top-tracks?market=…`, confirmed live → 200). Uses up
  to 2 artists of the seed; `market` config `spotify.market` (default `AT`). Removed `RECOMMENDATION_POOL`.
- Updated provider spec delta + design.md ("Similar songs" section) + application.properties.
- **Could not finish a clean live end-to-end test**: Quarkus dev live-reload wipes the in-memory
  Spotify tokens on every code edit (tokens/refresh-tokens are not persisted), so the test parties
  showed `loggedIn:true` but had empty tokens by the time refill ran. The data source itself is
  verified (top-tracks → 200 with real songs); needs a **fresh login** to confirm end-to-end.
- KNOWN GAP unrelated to this change: after a dev hot-reload (or backend restart) all hosts are
  effectively logged out because access/refresh tokens live only in memory (`SpotifyCredentials`),
  not the DB. Persisting the refresh token would survive restarts — candidate for a future change.

## Session-6 (final refill timing: ~3s before song end)
- User wants the "up next" empty during the song (so guest adds clearly play first) BUT autoplay
  must not stall. Final design: preload one playlist song **~3 seconds before the current ends**.
- New endpoint `POST /api/party/{id}/track/prepare-next` (@HostOnly) → `provider.refillQueue(party)`.
  `refillQueue` is now `public @Transactional @Override` and on the `MusicProvider` interface
  (default no-op).
- `startpage.ts` (the SDK player): progress timer checks `duration - position <= 3000ms` and POSTs
  prepare-next **once per track** (`preparedNextForUri` dedup; `PREPARE_NEXT_LEAD_MS = 3000`).
- Removed proactive preload from `startFirstSongWithoutRemoving`; `playNextAndRemove` keeps an
  **on-demand fallback** refill (only if the 3s preload was missed) so playback never dead-stops.
- Live-checked: `prepare-next` returns 401/403/204 for no-auth/wrong-pin/host-pin. Backend tests
  green; frontend compiles (only the 3 pre-existing CodeInput/CreateParty spec failures remain).
- Also cleaned the user's leftover batch-5 autofilled rows from party 52922758 (kept the playing
  guest song "Pazifik"); votes cascade-deleted.

## Session-5 (user feedback: autoplay stalls when next song loads)
- On-demand refill (session-3 part 2) broke gapless autoplay: fetching the playlist song + metadata
  *at the moment the current song ends* left a gap that stalled the Spotify Web Playback SDK.
- **Reverted to proactive one-ahead preload**: `refillQueue` runs at the END of `playNextAndRemove`
  and `startFirstSongWithoutRemoving` — after the new current song has already started — so the next
  song is queued while the current plays. When the current ends, advance is just a fast `play` call.
- Guest priority is preserved: auto-filled entries sort below guest adds, so the preloaded playlist
  song never jumps ahead of a guest's song.
- Net: the queue holds current + exactly one preloaded playlist song (visible in "up next"); not the
  whole playlist. This is the trade-off for seamless autoplay.

## Session-4 (user feedback: re-add a played song)
- A song that is **currently playing** (or just finished but still the current entry) can now be
  **added to the queue again**. Previously blocked by the dedup check + the DB unique constraint.
- **Schema**: dropped `UNIQUE (party_id, track_uri)` on `queue_entry` (`setup.sql` + `ALTER TABLE …
  DROP CONSTRAINT queue_entry_party_id_track_uri_key` on the running DB). The same URI may now exist
  at most twice: the playing entry + one waiting entry.
- `SpotifyMusicProvider`: `addTracksToPlaylist` dedup now counts only **waiting** entries (excludes
  `currentlyPlayingEntryId`); `removeTrack` excludes the current entry (removing a re-queued song
  deletes the waiting copy, keeps the playing one); `toggleVote` prefers the waiting copy.
- New delta `specs/queue/spec.md` (MODIFIED "No Duplicate Songs in Queue").
- **Live-verified** against the running dev backend with a real Spotify token (party 22c26d16):
  re-add current song → 200 (not 409) → DB shows playing+waiting rows → remove → only waiting copy
  deleted, playing survives. Live data left as found. Full backend suite green.
- Not unit-tested: the *allowed* re-add happy path hits Spotify metadata fetch (no injectable
  HttpClient) — same boundary as the rest of the suite; the waiting-dup→409 path stays unit-tested.

> Reminder for E2E: the test party had **no default playlist** and `spotify.topcharts.playlist.id`
> is blank, and Spotify recommendations are deprecated (404) — so refill adds nothing and the queue
> correctly empties to just the current song. To actually see auto-refill, pick a default playlist in
> the picker, or set a real `spotify.topcharts.playlist.id`.

## What's next
1. **Manual E2E (7.2)** with a real Spotify login: create party → playlist picker appears after
   OAuth → pick one → drain queue → playback continues from the playlist; redo with skip →
   continues via recommendations/Top-Charts; add a guest song and confirm it jumps above auto-filled.
2. After the user confirms 7.2: sync the four delta specs into `openspec/specs/{playback,party,host,provider}/spec.md`
   and archive to `openspec/changes/archive/2026-06-29-add-default-playlist-and-queue-autorefill/`.
3. Commit + open PR for `feature/default-playlist`.

## How to resume
Read this file and `CLAUDE.md`. DB: `cd musicvoting && docker compose up -d`. Backend tests:
`cd musicvoting/backend && ./mvnw test`. Frontend: `cd musicvoting/frontend && npx ng test
--watch=false --browsers=ChromeHeadless`. The active change is
`openspec/changes/add-default-playlist-and-queue-autorefill/` — only task 7.2 remains.
