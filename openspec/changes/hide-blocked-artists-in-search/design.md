# Design

## Context

- `GET /api/party/{id}/track/search?q=…` (`TrackResource.search`) is shared by the web guest search, the web host search (`search-host`) and the iOS app. It is not `@HostOnly`.
- `SpotifyMusicProvider.markBlockedSearchResults` sets `blocked: true|false` on every result using `BlacklistService.Blacklist.isBlocked`, which treats track, artist and word entries alike. The response says nothing about *why* a song is blocked.
- `ARTIST` entries store the Spotify artist ID in `value` and the readable artist name in `label`. `Blacklist.of` currently keeps only the IDs.
- The Angular `hostAuthInterceptor` attaches `Authorization: Bearer <hostPin>` to **every** request whenever `mv_party_host_pin` is in localStorage. So "has a host header" does not mean "this is the host search": the host's own phone opening the guest view also sends it.

## Goals / Non-Goals

**Goals:**
- Hide banned-artist songs from the guest search on the server, so the hidden songs never reach the guest's browser.
- One matching rule: the artist check reuses the same blacklist snapshot as `blocked`.

**Non-Goals:**
- iOS app changes (it keeps the current response; can opt in later).
- Hiding word- or song-blocked results.
- Changing the add path, the refill, or the host search UI.

## Decisions

### D1 — Opt-in `audience=guest` query parameter instead of deciding by the host header
The guest page calls `…/track/search?q=…&audience=guest`. Only then does the backend remove banned-artist songs and add the hint. Without the parameter the response is exactly as today.

- *Alternative: filter unless the host PIN is sent.* Rejected: the interceptor sends the PIN from any page on the host's device, so the host testing the guest view would see different results than guests. It would also change the iOS response without an iOS spec change.
- *Alternative: filter in the frontend only.* Rejected: the full list (with banned artists) would still reach every guest's browser, and the "artist name matches" check would need the backend to say which songs are artist-blocked anyway.
- A guest can leave out the parameter and get the greyed-out list. That only shows what is already shown today, so it is not a new leak.

### D2 — Response shape
In guest mode the response keeps `tracks.items` (without the removed songs; the others still carry `blocked`) and gets one extra top-level field:

```json
{ "tracks": { "items": [ … ] }, "hiddenHint": "ARTIST" | "SOME" | null }
```

- `ARTIST` → frontend shows "Dieser Artist ist nicht zulässig."
- `SOME` → "Einige Ergebnisse sind auf dieser Party nicht zulässig."
- `null` → nothing removed, no hint.

The backend sends a code, not the German text, so the wording lives in the frontend with the other UI strings. No count and no artist name is returned, so the response reveals nothing beyond the spec.

### D3 — When is it `ARTIST`?
`ARTIST` if at least one song was removed **and** the trimmed, lower-cased query equals the lower-cased `label` of an `ARTIST` entry, or the name of one of the banned artists on a removed song (covers entries whose label differs slightly from Spotify's current spelling). Otherwise `SOME` if something was removed. Exact match, not substring: "drake remix" gives `SOME`, because the guest did not search for the artist.

### D4 — `Blacklist` gets an artist-only check
Add `Blacklist.isArtistBlocked(Collection<String> artistIds)` and `Blacklist.isBannedArtistName(String name)` (from the lower-cased labels). `isBlocked` stays the single rule for "may this be added"; the new methods only decide hide-vs-grey-out. A song by a banned artist that also matches a word is hidden (artist wins).

### D5 — Frontend
- `SpotifyTracks.searchTracks(query, { guest: true })` appends `&audience=guest`; `search-host` keeps calling it without the option.
- `guest.ts` stores `hiddenHint` in a signal next to `lastSearchedTerm`, reset on empty query and on error.
- Greyed-out results (word/song blocks) also trigger the general hint. The frontend derives this itself from the existing `blocked` flags — no backend change: `ARTIST` from the backend wins, else `SOME` if the backend sent it **or** any shown result has `blocked: true`.
- `guest.html`: the hint goes into the existing `aria-live` `search-status` block as a `host-status` paragraph. "Keine Treffer" only shows when there are no tracks **and** no hint.
- The existing `blacklist-updated` SSE handler already re-runs the search, so a newly banned artist disappears without extra code.

## Risks / Trade-offs

- [Guests can probe artist names one at a time and see which ones are banned] → Accepted by the team. The search still only answers for the exact name typed and never lists entries.
- [Spotify returns fewer than 25 usable results when many are hidden] → Accepted; the hint explains the gap. No re-fetch of more pages.
- [The artist label is the spelling from when the host added it] → D3 also compares against the artist names on the removed songs.
- [Two places now decide about blacklisted results (`blocked` and the hide step)] → Both run on one `Blacklist` snapshot inside `markBlockedSearchResults`, and both are covered by one test class.

## Migration Plan

No DB or config change. Backward-compatible API (new optional parameter, new optional field). Rollback = revert the commit.
