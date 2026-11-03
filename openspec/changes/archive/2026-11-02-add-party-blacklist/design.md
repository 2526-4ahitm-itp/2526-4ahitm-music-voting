# Design: Party Blacklist

## Context

See `proposal.md` for motivation. Relevant current state:

- **Add path**: `TrackResource.addToPlaylist` → `SpotifyMusicProvider.addTracksToPlaylist`. It checks for duplicates (409 "Song ist schon in der Warteschlange."), then calls `fetchTrackMetadata` (title, artists including IDs via `parseArtistIds`), then persists a `QueueEntry`. `TrackResource` emits `queue-updated` only on a 2xx response.
- **Refill path**: `SpotifyMusicProvider.refillQueue` builds a candidate list of **track URIs only** from a fall-through chain (default playlist → similar songs → Top-Charts → search), picks one with `findFirst` (preferring tracks not yet auto-filled), then fetches its metadata and persists it with `autofilled = true`. It is called by `prepare-next` (about 3 s before the song ends) and as a fallback in `playNextAndRemove`. Everything is best-effort and wrapped in `try/catch`.
- **Search path**: `TrackResource /search` → `SpotifyMusicProvider.searchTracks` returns Spotify's raw response (`tracks.items[]` with `uri`, `name`, `artists[]{id,name}`, `album.images`).
- **Party end**: `PartyService.endParty` deletes the queue and soft-deletes the party (`ended_at`); the `party` row stays, so `ON DELETE CASCADE` does not fire.
- **Host auth**: `@HostOnly` + `HostAuthFilter` (401 missing, 403 wrong PIN, 404 unknown party). The Angular `hostAuthInterceptor` adds the header automatically.
- **Frontend** is zoneless: after every `await`, components call `ChangeDetectorRef.detectChanges()` (see `select-playlist.ts`).

## Goals / Non-Goals

**Goals:**
- One matching function used by the add, refill and search paths, so the three can never disagree.
- No extra Spotify calls on the add path (metadata is already loaded there).
- A bounded number of extra Spotify calls on the refill path.

**Non-Goals:**
- iOS UI (setup page, block button, greyed-out search). The backend check still applies to iOS adds.
- Editing words or artists after the setup step (only "Song sperren" during the party).
- Retroactively removing waiting songs when an entry is added (the queue is empty during setup; "Song sperren" removes its own song).
- YouTube provider support (Spotify only, like the rest of the current backend).

## Decisions

### D1: Separate table `blacklist_entry`, keyed by kind + value
```
blacklist_entry
  id          UUID PK DEFAULT gen_random_uuid()
  party_id    VARCHAR NOT NULL REFERENCES party(id) ON DELETE CASCADE
  kind        VARCHAR NOT NULL       -- WORD | ARTIST | TRACK
  value       VARCHAR NOT NULL       -- WORD: lower-case word; ARTIST: Spotify artist ID; TRACK: spotify:track:… URI
  label       VARCHAR                -- display name (artist name, "Title – Artist", or the word)
  image_url   TEXT
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  UNIQUE (party_id, kind, value)
```
New Panache entity `BlacklistEntry` + enum `BlacklistKind`, in the style of `QueueEntry`.
- *Why*: the DB is the source of truth for party state (queue spec), so the blacklist survives a backend restart like the refresh token does. `UNIQUE` makes "add twice" idempotent at the DB level.
- *Alternatives*: an in-memory set on `Party` (lost on restart, like `seenArtistIds`); three separate tables (more code for no benefit, as all kinds share the same shape).
- Artists and songs are matched by **ID/URI**, not by name: names are ambiguous (namesakes) and an artist ID also catches features. `label` and `image_url` exist only for display on the setup page.

### D2: `BlacklistService` owns all matching
`at/htl/service/BlacklistService` (`@ApplicationScoped`):
- `list(partyId)`, `add(partyId, kind, value, label, imageUrl)` → returns the existing entry if present, `remove(partyId, entryId)`, `deleteAll(partyId)`.
- `load(partyId)` → an immutable `Blacklist` snapshot (sets of track URIs and artist IDs, list of compiled word patterns).
- `Blacklist.isBlocked(trackUri, title, artistIds, artistNames)` → pure, no DB access.
- *Why a snapshot*: search checks up to 50 items and refill up to 10 candidates; loading once per request avoids one query per item.
- **Normalization on add**: words are trimmed, collapsed to single spaces and lower-cased with `Locale.ROOT`; an empty word → 400. Artist values must be non-blank IDs; track values must be non-blank URIs.
- **Word pattern**: `(?<![\p{L}\p{N}])` + `Pattern.quote(word)` + `(?![\p{L}\p{N}])`, flags `CASE_INSENSITIVE | UNICODE_CASE`. Letters and digits are word characters; everything else (spaces, brackets, hyphens, punctuation) is a boundary. Umlauts count as letters.
- *Alternative*: `\b` word boundaries — rejected because Java's `\b` without `UNICODE_CHARACTER_CLASS` treats "ü" as a non-word character, which would split "Grün".

### D3: Add path rejects with 403 after the metadata fetch
In `addTracksToPlaylist`, after `fetchTrackMetadata` and before `persist`: if `isBlocked` → `403` with body `{"error":"Nicht erlaubt."}`, same shape as the existing 409.
- The duplicate check stays first (cheaper, no Spotify call).
- *Why 403*: the action is understood but not permitted. The frontend distinguishes it from a `HostAuthFilter` 403 by the add endpoint not being `@HostOnly` and by the `error` body text.
- *Alternative*: 422 — rejected; the request is well-formed. The frontend reads the `error` text from the body, so the exact status matters only for distinguishing it from 409.

### D4: Refill filters before picking and checks metadata while picking
In `refillQueue`, after the candidate chain and after building `alreadyQueued`:
1. Load the blacklist snapshot once.
2. Remove candidates whose URI is a blocked TRACK (no Spotify call).
3. Replace the single `findFirst` with an ordered iteration: first unused candidates, then repeats (same preference as today). For each one, fetch the metadata and call `isBlocked`; persist the first allowed one. **Stop after 10 metadata fetches.**
4. If none is allowed, return without adding (existing "yields nothing" behavior).
- *Why fetch per candidate*: candidates are URIs only, but word and artist checks need title and artist IDs. The playlist endpoint does return them, but changing every source to return metadata would touch the whole chain for little gain.
- *Why 10*: one refill normally needs 1 fetch; 10 bounds a pathological playlist full of blocked songs to about 10 Spotify calls per refill.
- *Alternative*: fall through to the next source when all candidates of one source are blocked — rejected for this change; the iteration over the chosen source plus the existing repeat fallback is enough, and it keeps the chain unchanged.

### D5: Search results carry a `blocked` flag
`searchTracks` loads the snapshot once and adds `"blocked": true|false` to each item in `tracks.items` (using `uri`, `name`, `artists[].id`, `artists[].name`). Null items are left untouched (the iOS client already filters them). The flag says nothing about the reason, so guests learn nothing about the blacklist.
- *Alternative*: hide blocked results — rejected by the team ("Ausgegraut, + deaktiviert").

### D6: `BlacklistResource` endpoints, all `@HostOnly`
`@Path("/party/{partyId}/blacklist")`:

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `` | – | 200 `[{id, kind, value, label, imageUrl}]` |
| POST | `` | `{kind, value, label?, imageUrl?}` | 201 new entry, 200 existing entry, 400 invalid kind/value |
| DELETE | `/{entryId}` | – | 204, 404 if not in this party |
| GET | `/artists?q=` | – | 200 `[{id, name, imageUrl}]`, empty list for a blank query |

Artist search goes through a new `MusicProvider.searchArtists(Party, String)` (default: empty list) implemented in `SpotifyMusicProvider` via `/v1/search?type=artist&limit=20` and `executeSpotifyRequest`, like `searchTrackUris`.
- **Song search** on the setup page reuses the existing `GET /track/search` — no new endpoint.
- **"Song sperren"** reuses `POST /blacklist` (`kind: TRACK`) followed by the existing `DELETE /track/remove`, which already emits `queue-updated`. *Alternative*: a combined endpoint — rejected; two existing calls are enough, and if the remove fails the song is still blocked for future adds.

- **Live update:** every successful add (`201`, not a duplicate `200`) and remove emits the SSE event `blacklist-updated` with payload `{partyId}` only — never the entry, so guests learn nothing about the blacklist. The web branch of `/api/spotify/events` forwards it to clients of that party (iOS: not forwarded, it has no greyed-out UI). `guest` and `search-host` re-run their current search on it. Both pages now pass `partyId` to the event stream; before, they connected without it and therefore never received party events (also no `queue-updated`). *Alternative*: send the blocked track URI and grey it out client-side — rejected, it would expose entries and does not cover words/artists.

### D7: Party end deletes entries
`PartyService.endParty` calls `BlacklistEntry.delete("partyId", …)` next to the existing queue delete. `PartyExpiryScheduler` goes through `endParty`, so expiry is covered too. `ON DELETE CASCADE` remains for a hard delete of a party row.

### D8: Frontend
- New standalone page `pages/select-blacklist/` (route `select-blacklist`, `canActivate: [hostGuard]`, reads `?partyId=` like `select-playlist`). Sections: word input with "Wort hinzufügen"; search with two tabs "Künstler" (uses `searchArtists`) and "Songs" (uses `TrackService` search); list of current entries with remove; buttons "Weiter" and "Ohne Blacklist fortfahren" → `/dashboard?partyId=…`. "Weiter" is disabled while there are no entries (with nothing blocked, "Ohne Blacklist fortfahren" is the way on). Subtitle: "Gesperrte Wörter, Künstler und Songs können Gäste nicht hinzufügen."; word placeholder: "Wort". The artist/song search runs while typing (debounced 400 ms like the guest search, outdated responses are dropped); there is no "Suchen" button and no "Suche läuft…" status, Enter still searches immediately. "Sperren" on a result is an outline pill that fills white on hover, like "Ohne Blacklist fortfahren".
- `select-playlist.ts`: `choose()` and `skip()` navigate to `/select-blacklist` instead of `/dashboard`.
- `party.service.ts`: `BlacklistEntry` interface + `getBlacklist`, `addBlacklistEntry`, `removeBlacklistEntry`, `searchArtists`.
- `host-dashboard`: "Song sperren" button next to the delete button on waiting songs, with a confirmation "Diesen Song für die Party sperren?".
- `guest` and `search-host`: `track.blocked` → result greyed out (CSS class), "+" disabled; only `search-host` shows the hint "Nicht erlaubt." (the team wants guests to see just the greyed-out result, no text). `guest.ts` shows the add error message instead of only logging it.

## Risks / Trade-offs

- [Search results are a snapshot] Open results are refreshed on `blacklist-updated`; if the event is missed (connection drop), a song may look addable until the next search → the backend still rejects the add with "Nicht erlaubt.", so nothing gets in.
- [Re-search on every blacklist change] Each block triggers one Spotify search per guest with open results → blocks during a party are rare and manual, so the extra load is small.
- [Refill limited to 10 fetches] A default playlist where the first 10 candidates are all blocked stops autoplay ("Warteschlange ist leer") although allowed songs exist further down → acceptable edge case; the limit can be raised later without spec changes.
- [Word list on artist names] Blocking the word "the" blocks every artist with "The" in the name → this is what the host asked for; the setup page lists the entries so mistakes can be removed before the party starts.
- [Metadata-based checks are not unit-testable] `SpotifyMusicProvider`'s `HttpClient` cannot be mocked, so word/artist matches on add and refill are covered by `BlacklistService` unit tests plus a manual end-to-end check. The DB-only part (TRACK filter in refill) is unit-tested.
- [iOS search shows blocked songs as addable] → the add is rejected by the backend; the iOS error message handling decides what the guest sees.

## Migration Plan

- `setup.sql` gets the new table (fresh DBs and `docker compose down -v`).
- Existing dev DBs: run the `CREATE TABLE blacklist_entry …` statement by hand (documented in the backend README). No data migration — existing parties simply have an empty blacklist.
- Rollback: drop the table and revert the code; no other table changes.
