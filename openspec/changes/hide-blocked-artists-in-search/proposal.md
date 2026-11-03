# Proposal

## Why

When the host bans an artist, guests currently still see every song of that artist in the search — greyed out, without any explanation. Searching for a banned artist then shows a whole page of dead results, which looks broken. Guests should not see those songs at all, and the search should tell them briefly why results are missing.

## What Changes

- In the **web guest search**, songs by a banned artist (blacklist entry of kind `ARTIST`) are **removed** from the results instead of being shown greyed out.
- Songs blocked only by a **word** or **song** entry stay as today: shown greyed out with a disabled "+" and no text.
- Below the guest search field a hint appears when songs were removed:
  - "Dieser Artist ist nicht zulässig." when the search term is the name of a banned artist,
  - otherwise "Einige Ergebnisse sind auf dieser Party nicht zulässig.".
- If every result was removed, the hint replaces "Keine Treffer für „…“".
- The **host search** is unchanged (blocked songs greyed out with "Nicht erlaubt.").
- The search endpoint gets an opt-in guest mode (`audience=guest`); without it the response is unchanged, so the host search and the iOS app keep their current behaviour.
- **BREAKING (spec):** guests may now learn that an artist they searched for by name is banned. The rule "guests are never told why a song is blocked" is relaxed for this one case; the blacklist entries themselves stay hidden.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `search`: "Blacklisted Search Results Cannot Be Added" — banned-artist songs are hidden in the guest search, with the new hint texts.
- `host`: "Blacklist Requires the Host Credential" — guests may be told that the artist they searched for is banned; entries are still never listed.

## Impact

- Backend: `SpotifyMusicProvider.searchTracks` / `markBlockedSearchResults`, `BlacklistService.Blacklist` (artist check + artist labels), `TrackResource` search endpoint (`audience` query parameter), `MusicProvider` interface.
- Frontend: `services/spotify-tracks.ts` (`searchTracks` guest flag), `pages/guest/guest.{ts,html,css}`; `search-host` unchanged.
- Tests: `BlacklistServiceTest`, a new/extended unit test for the search filtering, `TrackResourceTest`, `guest.spec.ts`, `spotify-tracks.spec.ts`.
- Overlap: the in-progress change `refactor-design-fixes` references the greyed-out behaviour in its guest delta ("Nicht verfügbar" tooltip); that still holds for word/song blocks and needs no edit.
- iOS: no change (it does not send `audience=guest`); can follow later.
