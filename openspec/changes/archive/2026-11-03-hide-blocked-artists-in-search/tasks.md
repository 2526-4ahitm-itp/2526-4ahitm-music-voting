# Tasks

## 1. Backend: blacklist artist check

- [x] 1.1 `BlacklistService.Blacklist`: keep the lower-cased labels of `ARTIST` entries; add `isArtistBlocked(Collection<String> artistIds)` and `isBannedArtistName(String name)` with comments (design D4); verify with new cases in `BlacklistServiceTest` (ID match, no match, name case-insensitive with spaces trimmed, no substring match, empty blacklist)

## 2. Backend: guest-mode search

- [x] 2.1 `TrackResource.search`: add optional `@QueryParam("audience")`; pass a `guest` flag to `MusicProvider.searchTracks` (interface + Spotify implementation; other providers ignore it); verify `TrackResourceTest` still passes without the parameter
- [x] 2.2 `SpotifyMusicProvider`: in guest mode remove songs by a banned artist after `markBlockedSearchResults` and set `hiddenHint` to `ARTIST` / `SOME` / `null` (design D2, D3), as a static, HTTP-free helper; verify in `SpotifyMusicProviderTest`: artist songs removed, word-blocked songs kept with `blocked: true`, `ARTIST` for an exact name (label and Spotify name), `SOME` for an unrelated term or "drake remix", `null` when nothing was removed, host mode unchanged, no artist name or count in the response
- [x] 2.3 Run `cd musicvoting/backend && ./mvnw test` (DB via `docker compose up -d`) and verify everything passes

## 3. Frontend: guest search

- [x] 3.1 `services/spotify-tracks.ts`: `searchTracks(query, { guest: true })` appends `&audience=guest`; verify in `spotify-tracks.spec.ts` (with and without the option)
- [x] 3.2 `pages/guest/guest.ts`: call the search in guest mode, keep `hiddenHint` in a signal (reset on empty query and error), comment the why; `guest.html`: show "Dieser Artist ist nicht zulässig." / "Einige Ergebnisse sind auf dieser Party nicht zulässig." in the `aria-live` status block, and "Keine Treffer für „…“" only when there is no hint; verify in `guest.spec.ts`: both texts, no hint for `null`, hint instead of "Keine Treffer" when all results are gone, re-search on `blacklist-updated` updates the hint, word-blocked result still greyed out
- [x] 3.3 Check that `search-host` still calls the search without guest mode and keeps "Nicht erlaubt."; verify with `search-host.spec.ts`
- [x] 3.5 `guest.ts`: also show "Einige Ergebnisse sind auf dieser Party nicht zulässig." when a shown result is `blocked` (greyed out) and the backend sent no `ARTIST` hint (design D5); verify in `guest.spec.ts` (unit + DOM: greyed-out result → general hint; `ARTIST` stays; no blocked result → no hint), then re-run the full frontend tests
- [x] 3.4 Run `cd musicvoting/frontend && CHROME_BIN=/usr/bin/chromium-browser npx ng test --watch=false --browsers=ChromeHeadless` and verify everything passes

## 4. Docs

- [x] 4.1 Update `musicvoting/backend/README.md` (search endpoint: `audience=guest`, `hiddenHint`) if the endpoint is documented there; verify the README matches the code
- [x] 4.2 `openspec validate hide-blocked-artists-in-search --strict` passes

## Workflow follow-up

- Archive with `/opsx:archive` after review. Note: `openspec/specs/host/spec.md` has duplicate iOS requirements that may block archiving (see the refactor-design-fixes hand-off).
- Optional later: the iOS app can opt in to `audience=guest`.
