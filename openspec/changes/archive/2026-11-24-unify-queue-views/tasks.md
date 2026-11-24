# Tasks

Frontend tests: `cd musicvoting/frontend && CHROME_BIN=/usr/bin/chromium-browser npx ng test --watch=false --browsers=ChromeHeadless`.
Backend tests (regression only, no backend changes): `cd musicvoting/backend && ./mvnw test`.
Every component change needs code comments (why, not what) and DOM-based specs with real `expect`s.

## 1. Shared building blocks

- [x] 1.1 Add `--mv-glow-brand` and `--mv-glow-logo` (`none` in light mode) to `styles.css`; replace the hard-coded glow `rgba` in `startpage.css` and `host-dashboard.css` (design D9). Verify: the now-playing cover `box-shadow` in both files uses `var(--mv-glow-brand)` and no literal `rgba`, and `contrast.tokens.spec.ts` still passes
- [x] 1.2 `mv-theme-toggle` becomes an icon-only 44×44 px button (design D10). Update `mv-theme-toggle.spec.ts`: no visible text at 1280 px and 390 px, `role="switch"`, `aria-label="Heller Modus"`, and the tooltip for both modes

## 2. Guest: one page (`voting-comp`)

- [x] 2.1 Move the provider search from `pages/guest` into `voting-comp` (design D1):
  - the typing-triggered search
  - the blacklist hint
  - the spinner and the status texts
  - the add path with backend error messages

  Remove the local queue filter. Port the matching tests from `guest.spec.ts` into `voting-comp` specs ("Keine Treffer für „…“", "Verbindung verloren …", blacklist hints, blocked results "Nicht verfügbar").
- [x] 2.2 Derive the result states blocked / queued / addable from `tracks()` by URI (design D2). A queued result shows the like count and the heart and calls `toggleVote`.

  Specs:
  - a queued song in the results shows "2" and the heart, not "+"
  - tapping the heart updates the result and the queue row
  - a `queue-updated` event turns a "+" into a heart without a reload
- [x] 2.3 While the search field is non-empty, show the results under the label "Suchergebnisse" in place of the queue; the "Läuft gerade" bar stays visible.

  Specs:
  - clearing the field shows the queue with unchanged ranks ("Filter keeps the ranks")
  - the playing bar stays while searching
  - an empty field sends no Top-Charts request
- [x] 2.4 Add confirmation without the "Zum Voten" action (design D3). Spec: after a successful add "Song hinzugefügt – Platz 4" is shown and the toast has no action button
- [x] 2.5 Remove `mv-guest-tabs` from the template and delete `shared/mv-guest-tabs*`, `pages/guest/*`; title stays "Warteschlange". Verify: `grep -rn "mv-guest-tabs\|pages/guest/" musicvoting/frontend/src` finds nothing; a spec asserts no "Voten"/"Hinzufügen" tab is rendered
- [x] 2.6 Route `guest` → `redirectTo: 'voting'`; check `code-input` still navigates to `/voting` after join. `app.routes.spec.ts` asserts the redirect

## 3. Host dashboard: one queue

- [x] 3.1 Phone rows: rank and likes visible below 560 px, 40 px cover (design D6). Spec at 390 px width: the row shows the rank, the like count and "Song entfernen"
- [x] 3.2 Filter field "In der Warteschlange suchen …" in the queue card; ranks from the unfiltered order; "Kein Song passt zu „…“". Specs for both scenarios of "Host Filters the Queue on the Dashboard" (superseded by 3b.2)
- [x] 3.3 Extract `shared/mv-host-song-search` from `search-host` (search, "Nicht erlaubt.", checkmark for queued songs, add errors) and port `search-host.spec.ts` to it (superseded by 3b.2)
- [x] 3.4 "+ Song" button opens the search card above the queue; "Fertig" and Escape close it and move focus back to "+ Song" (design D5). Spec: adding a song keeps the route `/dashboard`; focus returns on close (superseded by 3b.2)
- [x] 3.5 Delete `pages/voting-host/*` and `pages/search-host/*`; routes `voting-host` and `search-host` → `redirectTo: 'dashboard'` (design D4). `app.routes.spec.ts` asserts both redirects; `host.guard.spec.ts` / `host-stage-pages.dom.spec.ts` / `a11y-baseline.dom.spec.ts` no longer reference the deleted pages
- [x] 3.6 `mv-host-menu`: entries only "Dashboard" and "Blacklist"; logo instead of the text; badge "Party läuft · <Voting-PIN>" (design D9). `mv-host-menu.spec.ts`: entries, no "Voting"/"Suchen", the badge with the PIN in the rail and the burger panel
- [x] 3.7 Focus management in the confirms (design D7). Specs:
  - opening "Song entfernen" focuses "Auch sperren" ("Nur entfernen" for the playing song)
  - opening "Party beenden" focuses "Abbrechen"
  - Escape closes the confirm and refocuses the trigger
  - after a removal, focus is on the queue heading
- [x] 3.8 PIN tags "für Gäste" / "nur für dich" on the dashboard (design D11). Spec asserts both tags

## 3b. Follow-up 2026-11-23: one host search, host votes, clear button

- [x] 3b.1 Clear button "Suche leeren" in `.host-search` (design D12) on the guest page; hide the native cancel button. Specs: shown only with text; one click empties the field, shows the queue and keeps the focus
- [x] 3b.2 Dashboard: replace the filter and the "+ Song" card with one search field like the guest page (design D5); delete `shared/mv-host-song-search*` and port its tests to dashboard specs (blocked "Nicht erlaubt.", queued shows likes + heart, add keeps `/dashboard`, empty field shows the queue, clear button)
- [x] 3b.3 Host likes: load the queue with `deviceId`, heart in every waiting queue row and in queued results, optimistic with rollback. Specs: like and un-like update the count and `aria-pressed`; a failed request restores the state; no heart for the playing song
- [x] 3b.4 Update README, Hugo frontend page and `DESIGN.md` for the dashboard search and host likes

## 3c. Follow-up 2026-11-23: wording, guest feedback, player steps

- [x] 3c.1 Hints "… vom Gastgeber gesperrt." in the guest search; specs updated
- [x] 3c.2 "Auch sperren" → "Entfernen und sperren"; visible "Blacklist" → "Blocklist" (menu, page title, "Ohne Blocklist fortfahren", loading/error texts, route title); specs updated
- [x] 3c.3 Like confirmation "Geliked – jetzt auf Platz N" (reload, then rank); un-like silent. Specs in `voting-comp.vote.spec.ts`
- [x] 3c.4 Toast as filled brand card with icon, bold 1.0625rem text. Specs in `mv-toast.spec.ts`
- [x] 3c.5 Welcome guide (two lines) and auto-close after 10 s, remembered. Spec with `jasmine.clock()`
- [x] 3c.6 "Player auf diesem Gerät öffnen" + `mv-other-device-steps` (five steps, link to the own address) on dashboard and go-live step. Specs in `party-ready.spec.ts` and `host-stage-pages.dom.spec.ts`
- [x] 3c.7 TV layout reverted (see 5.1)
- [x] 3c.8 Docs: README, Hugo frontend page, `DESIGN.md` for the wording, toast, welcome and player steps

## 4. party-ready

- [x] 4.1 Separate-device steps as `<ol>` with the four steps, and the tag "für Gäste" at the Voting-PIN (design D11). Update the party-ready specs: four `li` with the exact texts, the old arrow sentence is gone, the main button and live status are unchanged

## 5. TV (`startpage`)

- [x] 5.1 ~~Grid per design D8~~ reverted on 2026-11-23 (team wants the gap in the middle); layout identical to before, layout test removed, and the existing font-size checks still pass
- [x] 5.2 Like pulse per design D8, colour-only under reduced motion. Specs: a changed count gets `.pulse`, unchanged entries don't, and the class is gone after 600 ms (`jasmine.clock()`)
- [x] 5.3 White logo glow in dark mode via `--mv-glow-logo`, none in light mode. Spec checks the computed `filter` in both modes; check the glow by eye on the real TV and note the result in the PR (open: part of 8.3)

## 6. Landing page

- [x] 6.1 Below 600 px: logo at the left of the top bar, theme toggle at the right (design D9). `entry-pages.dom.spec.ts` at 390 px: the logo is in the header, before the toggle

## 7. Docs

- [x] 7.1 Update `musicvoting/frontend/README.md`, `hugo/content/dev/frontend.md` and `DESIGN.md`: one guest page, host pages without Voting/Suchen, the icon-only theme toggle. Verify: `grep -rn "Hinzufügen\|voting-host\|search-host" README.adoc musicvoting/frontend/README.md hugo/content/dev DESIGN.md` only finds historical mentions

## 8. Integration check

- [x] 8.1 All frontend tests pass (report the count); backend `./mvnw test` passes (regression) — 2026-11-23: frontend 410/410 (after the 3b follow-up: 408/408), backend 192/192; `ng build` OK with budget warnings (new: `host-dashboard.css` +150 B, `voting-comp.css` over 4 kB)
- [x] 8.2 `openspec validate unify-queue-views` and `openspec validate --specs` without errors
- [x] 8.3 Manual run-through in Chrome with a real party. As a guest: join → search → add → like from the results. As the host: phone width with rank/likes → search, add and like → "Suche leeren" → like in the queue → remove with the keyboard (focus and Escape). TV at 1920 px: gap and pulse. Screenshots go to `ai/scratch/`; the slides are only updated at the sprint review — 2026-11-23: passed, driven with playwright-cli in Google Chrome (Spotify Premium, real playback), screenshots in `ai/scratch/8.3/`. Guest at 390 px: PIN join, welcome closes after 10 s, "Song hinzugefügt – Platz N" (~1.5 s), "Geliked – jetzt auf Platz N", "Suche leeren" keeps focus, blocked songs only show the hint line. Host at 390 px: rank/likes, "Nicht erlaubt.", add/like from results, like/un-like in the queue (`aria-pressed`), no heart on the playing song, keyboard: confirm focuses "Entfernen und sperren", Escape refocuses "Song entfernen", after removal focus on "Warteschlange"; menu only Dashboard + Blocklist with logo and "Party läuft · PIN". TV at 1920 px: gap in the middle, pulse 600 ms only on the changed row (reduced motion: colour only), white logo glow in dark mode (also closes the open point in 5.3). "Player auf diesem Gerät öffnen" opens `/startpage`, five steps with the LeoCloud link

## Workflow follow-up

- Archive the change after merge (`/opsx:archive`), so the deltas move into `openspec/specs/`.
- Run a new Impeccable critique afterwards (target ≥ 28/40).
