# Tasks

Backend tests: `cd musicvoting/backend && ./mvnw test` (PostgreSQL must be running).
Frontend tests: `cd musicvoting/frontend && npx ng test --watch=false --browsers=ChromeHeadless`.

## 1. Data model

- [x] 1.1 Add the `blacklist_entry` table (design D1) to `musicvoting/backend/setup.sql` and create it in the running dev DB; verify with `\d blacklist_entry` in psql
- [x] 1.2 Add enum `at/htl/domain/BlacklistKind` (`WORD`, `ARTIST`, `TRACK`) and Panache entity `at/htl/domain/BlacklistEntry` with class/field comments; verify `./mvnw compile` succeeds
- [x] 1.3 Document the manual `CREATE TABLE` for existing dev DBs in `musicvoting/backend/README.md`; verify the statement in the README runs as written against a DB without the table

## 2. Blacklist service and matching

- [x] 2.1 Implement `at/htl/service/BlacklistService` (`list`, `add` with normalization and idempotency, `remove`, `deleteAll`, `load` → `Blacklist` snapshot) with comments explaining the word-boundary pattern (design D2); verify with 2.2
- [x] 2.2 Write `BlacklistServiceTest`: "live" blocks "Song X (Live)" and "LIVE at Wembley" but not "Oliver"/"Delivery"; umlaut word ("grün" vs. "Grünwald"); phrase "radio edit"; artist ID match incl. feature; track URI match; adding "Live" twice keeps one entry; blank word rejected; entries of party A do not affect party B; verify the test class passes
- [x] 2.3 Call `deleteAll` from `PartyService.endParty` (design D7) and extend `PartyServiceTest` with "endParty deletes blacklist entries"; verify the test passes

## 3. Blacklist REST API

- [x] 3.1 Add `MusicProvider.searchArtists(Party, String)` (default: empty list) and implement it in `SpotifyMusicProvider` via `/v1/search?type=artist` and `executeSpotifyRequest`, returning `{id, name, imageUrl}`; verify `./mvnw compile` succeeds
- [x] 3.2 Implement `at/htl/endpoints/BlacklistResource` (GET, POST, DELETE `/{entryId}`, GET `/artists?q=`, all `@HostOnly`, design D6) with method comments; verify with 3.3
- [x] 3.3 Write `BlacklistResourceTest` (pattern of `PartyResourceTest`/`SpotifyTokenResourceTest`): 401 without PIN and 403 with a wrong PIN for every endpoint; POST → 201, duplicate POST → 200, invalid kind or blank value → 400; GET lists entries; DELETE → 204, unknown or foreign entry → 404; blank artist query → empty list; verify the test class passes
- [x] 3.4 Add the four endpoints to `hugo/content/dev/api-reference.md` and to `musicvoting/backend/README.md`; verify every path in the docs matches a `@Path` in `BlacklistResource`

## 4. Enforcement in the provider

- [x] 4.1 Add-path check in `SpotifyMusicProvider.addTracksToPlaylist`: after `fetchTrackMetadata`, reject a blocked song with 403 `{"error":"Nicht erlaubt."}` (design D3), with a comment why the duplicate check stays first; verify with `./mvnw test` (no regressions) and the manual check in 7.1
- [x] 4.2 Refill check in `refillQueue`: filter blocked TRACK URIs before picking, then iterate candidates in the existing preference order checking metadata, at most 10 fetches (design D4), with comments; verify with 4.3
- [x] 4.3 Extend `SpotifyMusicProviderTest`: the candidate ordering is extracted into `orderRefillCandidates` (refill candidates come from Spotify HTTP, which is not mockable) — with the only candidate blocked as TRACK it yields nothing, with an empty blacklist it keeps the previous order and repeat fallback; existing refill tests still pass; verify the full backend suite passes
- [x] 4.4 Search flag in `searchTracks`: add `blocked` to every non-null item using one blacklist snapshot per request (design D5); add a unit-testable helper and a test that marks a blocked item and leaves others `false`; verify the test passes

## 5. Frontend: service and setup page

- [x] 5.1 Add `BlacklistEntry` interface and `getBlacklist`, `addBlacklistEntry`, `removeBlacklistEntry`, `searchArtists` to `services/party.service.ts`, extend `party.service.spec.ts` (URL, method, body for each); verify the spec passes
- [x] 5.2 Create `pages/select-blacklist/` (ts/html/css) per design D8: word input "Wort hinzufügen", tabs "Künstler"/"Songs" with search, entry list with remove, "Weiter" and "Ohne Blacklist fortfahren"; call `detectChanges()` after every `await`; add code comments; verify with 5.3
- [x] 5.3 Write `select-blacklist.spec.ts` asserting on the DOM: entries load and render; adding and removing a word; artist search result → ARTIST entry; song search result → TRACK entry; "Weiter" and "Ohne Blacklist fortfahren" navigate to `/dashboard`; verify the spec passes
- [x] 5.4 Add the `select-blacklist` route with `hostGuard` in `app.routes.ts`; change `select-playlist.ts` `choose()`/`skip()` to navigate to `/select-blacklist?partyId=…`; update `select-playlist.spec.ts`; verify the spec passes

## 6. Frontend: dashboard button and search

- [x] 6.1 Add "Song sperren" with confirmation "Diesen Song für die Party sperren?" to waiting songs in `host-dashboard` (not the current song): `addBlacklistEntry(TRACK)` then `removeTrack`; extend `host-dashboard.spec.ts` (button absent on the current song, confirm calls both in order, cancel calls neither); verify the spec passes
- [x] 6.2 In `guest` and `search-host`, render `track.blocked` results greyed out with a disabled "+" and "Nicht erlaubt."; show the add error message in `guest.ts`; extend `guest.spec.ts` and `search-host.spec.ts` (blocked result disabled with hint, unblocked result unchanged, 403 shows "Nicht erlaubt."); verify the specs pass
- [x] 6.3 Update `musicvoting/frontend/README.md` (new page and flow); verify the described route exists in `app.routes.ts`
- [x] 6.4 Guest search: drop the "Nicht erlaubt." hint on blocked results (greyed out + disabled "+" only, host search unchanged); remove the unused `.blocked-hint` style from `guest.css`; adjust the DOM test in `guest.spec.ts`; verify the specs pass
- [x] 6.5 Blacklist page texts and "Weiter": subtitle only "Gesperrte Wörter, Künstler und Songs können Gäste nicht hinzufügen.", word placeholder "Wort", "Weiter" disabled (greyed out) while there are no entries; extend `select-blacklist.spec.ts` (texts, disabled with no entries, enabled after add, disabled again after removing the last entry); verify the spec passes
- [x] 6.6 Host-dashboard queue layout: stack "Song sperren" and the delete icon in a narrow column (`.track-actions`, normal flow) instead of two absolutely positioned buttons with `padding-right: 8rem`, so title and artist are no longer squeezed; restyle the "Song sperren" confirmation overlay (question on its own centered line, compact rounded buttons below); no behavior change; verify `host-dashboard.spec.ts` still passes
- [x] 6.7 Live greyed-out state: `BlacklistResource` emits `blacklist-updated` (payload only `partyId`) on add (`201`) and remove; forward it in the web branch of `/api/spotify/events`; `guest` and `search-host` pass `partyId` to the event stream and re-run the current search on the event; tests in `BlacklistResourceTest` (event on add/remove, none on duplicate or failure, payload only `partyId`) and `guest.spec.ts`/`search-host.spec.ts`; update `hugo/content/dev/realtime-sse.md` and `api-reference.md`; verify both suites pass
- [x] 6.8 Blacklist page search while typing: debounced 400 ms, outdated responses dropped, empty field clears results, remove the "Suchen" button and the "Suche läuft…" status; "Sperren" gets an outline and a hover fill like "Ohne Blacklist fortfahren"; tests in `select-blacklist.spec.ts`; verify the spec passes

## 7. Integration check

- [ ] 7.1 Manual end-to-end with a real Spotify login: create party → pick playlist → blacklist page appears → block word "live", an artist and a song → guest search shows "(Live)" songs, the artist's songs and the song greyed out, "Oliver …" addable; direct add returns 403 "Nicht erlaubt."; drain the queue and confirm the refill plays no blocked song; "Song sperren" on a waiting song removes it and greys it out in search; end the party and confirm no `blacklist_entry` rows remain
- [x] 7.2 Run the full backend and frontend test suites; verify both are green
- [x] 7.3 Move the blacklist question in `CLAUDE.md` to "Resolved" (whole word, case-insensitive; words, artists, songs); verify `openspec validate add-party-blacklist --strict` passes

## Workflow follow-up

- Propose a commit after each completed group (Conventional Commits, only after asking).
- Archive the change with `openspec archive add-party-blacklist` after 7.1–7.3, then verify the merged specs in `openspec/specs/{host,queue,playback,search}/spec.md`.
