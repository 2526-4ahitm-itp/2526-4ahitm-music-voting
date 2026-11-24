# Tasks

Backend tests: `cd musicvoting/backend && JAVA_HOME=$HOME/.jdks/temurin-25.0.3 ./mvnw test`.
Frontend tests: `cd musicvoting/frontend && nvm use 26 && CHROME_BIN=/usr/bin/chromium-browser npx ng test --watch=false --browsers=ChromeHeadless`.
Word mapping and exclusions: design D1/D2.

## 1. Database

- [x] 1.1 `setup.sql` and `deployment/k8s/01-postgres.yaml`: table `blocklist_entry`, constraint/index names and comments renamed (D5). Verify: `grep -i blacklist` finds nothing in either file
- [x] 1.2 Run the migration on the local Docker database before the backend starts (D5 pitfall). Verify: `\dt` lists `blocklist_entry` and no `blacklist_entry`

## 2. Backend

- [x] 2.1 `git mv` `BlacklistEntry`, `BlacklistKind`, `BlacklistResource`, `BlacklistService` and their tests to `Blocklist…`; apply the word mapping in all backend sources and tests (REST path `/party/{partyId}/blocklist`, SSE `blocklist-updated`, `@Table(name = "blocklist_entry")`)
- [x] 2.2 Verify: backend tests all green; `grep -ri blacklist musicvoting/backend/src` finds nothing

## 3. Frontend

- [x] 3.1 `git mv pages/select-blacklist` → `pages/select-blocklist` (files `select-blocklist.*`); apply the word mapping in all sources and specs (`SelectBlocklist`, `BlocklistEntry`, `BlocklistKind`, `getBlocklist`, `addBlocklistEntry`, …, REST paths, SSE event)
- [x] 3.2 Route `/select-blocklist`, plus the redirect `/select-blacklist` → `/select-blocklist` with a route test (host spec "Old Blocklist Setup Link Still Works", D3)
- [x] 3.3 Verify: frontend tests all green, `ng build` ok; `grep -ri blacklist musicvoting/frontend/src` only finds the redirect and its test

## 4. iOS

- [x] 4.1 `SongAddView.swift` listens for `blocklist-updated`; comments and `SongAddViewModelTests.swift` use the new word (D4)

## 5. Docs and manual checks

- [x] 5.1 Apply the mapping in the current docs: `README.adoc`, backend/frontend README (+ migration line), `deployment/server/PLACEHOLDERS.md` (migration line), `CLAUDE.md`, `.claude/skills/{backend,frontend}/SKILL.md`, `DESIGN.md`, `PRODUCT.md`, Hugo `dev/`, `docs/`, `swift/docs/`, `data/status.yaml`, `scripts/status-screenshots/screenshots.mjs`, `slides/index.md` (only the one wrong word, ARBEITSREGELN §6); also fix "Teilstring" → whole word in `hugo/content/docs/specification.md`
- [x] 5.2 ~~Manual: build and run the iOS app in Xcode; a blocklist change refreshes an open iOS search~~ — skipped (team decision 2026-11-24: not needed)
- [x] 5.3 Manual: host setup flow in the browser reaches `/select-blocklist`, adding and removing an entry works, a guest search greys out the blocked song live
  - Done 2026-11-24 with Playwright (Chromium, two contexts host + guest), party created via `POST /api/party` without Spotify. 11/11 checks: old link redirects, adding and removing the word "live" works, the frontend only calls `/blocklist` paths, and the guest result greys out and comes back live through the real `blocklist-updated` event (one re-search each). The guest search answer was mocked because there was no Spotify token, but its `blocked` flag was read from the real blocklist in the backend. The step from the playlist picker to `/select-blocklist` is covered by `select-playlist.spec.ts`

## 6. Final check

- [x] 6.1 `grep -rli blacklist` over the repo only finds what D2 excludes, the `/select-blacklist` redirect and this change's own files
- [x] 6.2 `openspec validate --all` ok
