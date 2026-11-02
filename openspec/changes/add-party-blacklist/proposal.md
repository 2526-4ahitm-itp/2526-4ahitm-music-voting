# Proposal: Party Blacklist for Words, Artists and Songs

## Why

The specs already promise a party-scoped blacklist (`host/spec.md` "Host Manages Party Blacklist", `queue/spec.md` "Blacklist Enforced on Add"), but nothing is implemented: today any song can enter the queue, whether a guest adds it or the auto-refill pulls it from the fallback chain (default playlist → similar songs → Top-Charts → search). Hosts have no way to keep unwanted songs or artists off the party.

The existing spec also leaves the matching rule open (CLAUDE.md "Blacklist: case-insensitive substring matching? Partial word matching?"). Plain substring matching would block "Oliver" for the word "live", so the team decided on whole-word matching.

## What Changes

- **Three kinds of blacklist entries** per party: a **word** (whole-word, case-insensitive match against title and artist names), an **artist** (Spotify artist ID — blocks every song the artist takes part in), and a **song** (Spotify track URI).
- **New host setup step**: after the default-playlist picker (`/select-playlist`), the web host flow shows a new, skippable blacklist page with word input, artist search and song search. This is the only place to add words and artists.
- **"Song sperren" button** on waiting songs in the host-dashboard queue: blocks exactly that track for the party and removes it from the queue.
- **Enforcement on add**: a guest (or host) add of a blocked song is rejected with "Nicht erlaubt." This applies to every client, including the iOS app, because it is enforced by the backend.
- **Enforcement on auto-refill**: the refill skips blocked candidates, so a blocked song never plays automatically.
- **Search results are marked**: blocked tracks in search results are greyed out with a disabled "+" and the hint "Nicht erlaubt." Guests never see the blacklist itself or why a song is blocked.
- **Host-only**: reading and editing the blacklist and the artist search are host-only endpoints.
- Blacklist entries are stored in the database per party and are deleted when the party ends.
- **Changed matching rule**: the existing substring rule becomes whole-word matching ("live" blocks "Song X (Live)" but not "Oliver").

## Capabilities

### New Capabilities

None. The blacklist is part of the existing `host` capability, which already owns "Host Manages Party Blacklist".

### Modified Capabilities

- `host`: "Host Manages Party Blacklist" gains the three entry kinds, whole-word matching and the setup step after the default-playlist picker. "Host Selects an Optional Default Playlist at Party Creation" now continues to the blacklist step instead of the dashboard. New requirement for the "Song sperren" button.
- `queue`: "Blacklist Enforced on Add" switches to whole-word matching and covers artist and song entries.
- `playback`: new requirement that the empty-queue auto-refill skips blacklisted songs.
- `search`: new requirement that blacklisted results are shown greyed out and cannot be added.

## Impact

- **Database**: new table `blacklist_entry` in `musicvoting/backend/setup.sql`. An existing dev DB needs a `CREATE TABLE` by hand or `docker compose down -v`.
- **Backend**: new entity, service and `BlacklistResource` (`/api/party/{id}/blacklist`, plus `/blacklist/artists?q=` for artist search). Changes to `SpotifyMusicProvider.addTracksToPlaylist`, `refillQueue` and `searchTracks` (new `blocked` flag per result), `MusicProvider` (`searchArtists`) and `PartyService.endParty`.
- **Frontend**: new page `select-blacklist`, new route, `party.service.ts` methods, navigation change in `select-playlist`, "Song sperren" in `host-dashboard`, blocked state in `guest` and `search-host`.
- **iOS**: no UI changes. iOS guest adds are rejected by the backend like web adds. The iOS search does not grey out blocked songs yet.
- **Docs**: `hugo/content/dev/api-reference.md`, READMEs, and CLAUDE.md (resolve the blacklist open question).
