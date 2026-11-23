# Tasks

Frontend tests: `cd musicvoting/frontend && CHROME_BIN=/usr/bin/chromium-browser npx ng test --watch=false --browsers=ChromeHeadless`.
Backend tests (regression only, no backend changes): `cd musicvoting/backend && ./mvnw test`.
Every component change needs code comments (why, not what) and DOM-based specs with real `expect`s.

## 1. Shared building blocks

- [ ] 1.1 Add `--mv-glow-brand` and `--mv-glow-logo` (`none` in light mode) to `styles.css`; replace the hard-coded glow `rgba` in `startpage.css` and `host-dashboard.css` (design D9). Verify: the now-playing cover `box-shadow` in both files uses `var(--mv-glow-brand)` and no literal `rgba`, and `contrast.tokens.spec.ts` still passes
- [ ] 1.2 `mv-theme-toggle` becomes an icon-only 44×44 px button (design D10). Update `mv-theme-toggle.spec.ts`: no visible text at 1280 px and 390 px, `role="switch"`, `aria-label="Heller Modus"`, and the tooltip for both modes

## 2. Guest: one page (`voting-comp`)

- [ ] 2.1 Move the provider search from `pages/guest` into `voting-comp` (design D1):
  - the typing-triggered search
  - the blacklist hint
  - the spinner and the status texts
  - the add path with backend error messages

  Remove the local queue filter. Port the matching tests from `guest.spec.ts` into `voting-comp` specs ("Keine Treffer für „…“", "Verbindung verloren …", blacklist hints, blocked results "Nicht verfügbar").
- [ ] 2.2 Derive the result states blocked / queued / addable from `tracks()` by URI (design D2). A queued result shows the like count and the heart and calls `toggleVote`.

  Specs:
  - a queued song in the results shows "2" and the heart, not "+"
  - tapping the heart updates the result and the queue row
  - a `queue-updated` event turns a "+" into a heart without a reload
- [ ] 2.3 While the search field is non-empty, show the results under the label "Suchergebnisse" in place of the queue; the "Läuft gerade" bar stays visible.

  Specs:
  - clearing the field shows the queue with unchanged ranks ("Filter keeps the ranks")
  - the playing bar stays while searching
  - an empty field sends no Top-Charts request
- [ ] 2.4 Add confirmation without the "Zum Voten" action (design D3). Spec: after a successful add "Song hinzugefügt – Platz 4" is shown and the toast has no action button
- [ ] 2.5 Remove `mv-guest-tabs` from the template and delete `shared/mv-guest-tabs*`, `pages/guest/*`; title stays "Warteschlange". Verify: `grep -rn "mv-guest-tabs\|pages/guest/" musicvoting/frontend/src` finds nothing; a spec asserts no "Voten"/"Hinzufügen" tab is rendered
- [ ] 2.6 Route `guest` → `redirectTo: 'voting'`; check `code-input` still navigates to `/voting` after join. `app.routes.spec.ts` asserts the redirect

## 3. Host dashboard: one queue

- [ ] 3.1 Phone rows: rank and likes visible below 560 px, 40 px cover (design D6). Spec at 390 px width: the row shows the rank, the like count and "Song entfernen"
- [ ] 3.2 Filter field "In der Warteschlange suchen …" in the queue card; ranks from the unfiltered order; "Kein Song passt zu „…“". Specs for both scenarios of "Host Filters the Queue on the Dashboard"
- [ ] 3.3 Extract `shared/mv-host-song-search` from `search-host` (search, "Nicht erlaubt.", checkmark for queued songs, add errors) and port `search-host.spec.ts` to it
- [ ] 3.4 "+ Song" button opens the search card above the queue; "Fertig" and Escape close it and move focus back to "+ Song" (design D5). Spec: adding a song keeps the route `/dashboard`; focus returns on close
- [ ] 3.5 Delete `pages/voting-host/*` and `pages/search-host/*`; routes `voting-host` and `search-host` → `redirectTo: 'dashboard'` (design D4). `app.routes.spec.ts` asserts both redirects; `host.guard.spec.ts` / `host-stage-pages.dom.spec.ts` / `a11y-baseline.dom.spec.ts` no longer reference the deleted pages
- [ ] 3.6 `mv-host-menu`: entries only "Dashboard" and "Blacklist"; logo instead of the text; badge "Party läuft · <Voting-PIN>" (design D9). `mv-host-menu.spec.ts`: entries, no "Voting"/"Suchen", the badge with the PIN in the rail and the burger panel
- [ ] 3.7 Focus management in the confirms (design D7). Specs:
  - opening "Song entfernen" focuses "Auch sperren" ("Nur entfernen" for the playing song)
  - opening "Party beenden" focuses "Abbrechen"
  - Escape closes the confirm and refocuses the trigger
  - after a removal, focus is on the queue heading
- [ ] 3.8 PIN tags "für Gäste" / "nur für dich" on the dashboard (design D11). Spec asserts both tags

## 4. party-ready

- [ ] 4.1 Separate-device steps as `<ol>` with the four steps, and the tag "für Gäste" at the Voting-PIN (design D11). Update the party-ready specs: four `li` with the exact texts, the old arrow sentence is gone, the main button and live status are unchanged

## 5. TV (`startpage`)

- [ ] 5.1 Grid and gap per design D8; remove the `max-width: 46vw` cap. `startpage.layout.spec.ts` at 1920×1080: the gap between the columns is ≤ 115 px, and the existing font-size checks still pass
- [ ] 5.2 Like pulse per design D8, colour-only under reduced motion. Specs: a changed count gets `.pulse`, unchanged entries don't, and the class is gone after 600 ms (`jasmine.clock()`)
- [ ] 5.3 White logo glow in dark mode via `--mv-glow-logo`, none in light mode. Spec checks the computed `filter` in both modes; check the glow by eye on the real TV and note the result in the PR

## 6. Landing page

- [ ] 6.1 Below 600 px: logo at the left of the top bar, theme toggle at the right (design D9). `entry-pages.dom.spec.ts` at 390 px: the logo is in the header, before the toggle

## 7. Docs

- [ ] 7.1 Update `musicvoting/frontend/README.md`, `hugo/content/dev/frontend.md` and `DESIGN.md`: one guest page, host pages without Voting/Suchen, the icon-only theme toggle. Verify: `grep -rn "Hinzufügen\|voting-host\|search-host" README.adoc musicvoting/frontend/README.md hugo/content/dev DESIGN.md` only finds historical mentions

## 8. Integration check

- [ ] 8.1 All frontend tests pass (report the count); backend `./mvnw test` passes (regression)
- [ ] 8.2 `openspec validate unify-queue-views` and `openspec validate --specs` without errors
- [ ] 8.3 Manual run-through in Chrome with a real party. As a guest: join → search → add → like from the results. As the host: phone width with rank/likes → "+ Song" → filter → remove with the keyboard (focus and Escape). TV at 1920 px: gap and pulse. Screenshots go to `ai/scratch/`; the slides are only updated at the sprint review

## Workflow follow-up

- Archive the change after merge (`/opsx:archive`), so the deltas move into `openspec/specs/`.
- Run a new Impeccable critique afterwards (target ≥ 28/40).
