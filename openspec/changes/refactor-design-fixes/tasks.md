# Tasks

> All questions in `questions.md` are answered; the tasks reflect the answers.

Frontend tests: `cd musicvoting/frontend && npx ng test --watch=false --browsers=ChromeHeadless`.
Backend tests (regression only, no backend changes planned): `cd musicvoting/backend && ./mvnw test`.
Every component change needs code comments (why, not what) and DOM-based specs with real `expect`s.

## 0. Foundation

- [x] 0.1 Run `/impeccable init` to write `PRODUCT.md` (audience, party scene, tone) using the answers to Q14/Q15; verify the file exists and `impeccable context` no longer reports `NO_PRODUCT_MD`
- [x] 0.2 Add design tokens (design D1) to `src/styles.css` and a `prefers-reduced-motion` block that zeroes the motion tokens; verify `ng build` succeeds
- [x] 0.3 Add the self-hosted fonts and Lucide (latest stable, pinned); verify the fonts load in `ng serve` and the `ng build` bundle-size increase is reported in the PR
- [x] 0.4 Set `<html lang="de">` in `src/index.html`; add a spec asserting `document.documentElement.lang === 'de'`

## 1. Shared components

- [x] 1.1 Create `shared/mv-cover` (design D2) with fallback on a missing URL, an empty/missing `images` array and `(error)`; spec covers all three cases plus `alt=""`
- [x] 1.2 Create `shared/mv-icon` (Lucide wrapper, `aria-hidden`); spec asserts the SVG renders and is hidden from assistive technology
- [x] 1.3 Create `shared/mv-spinner` (`role="status"`, hidden label "Lädt …"); spec asserts role and label
- [x] 1.4 Create `ToastService` + `shared/mv-toast` (polite/alert live region, optional action button, auto-dismiss); spec with `jasmine.clock()` for dismiss and action
- [x] 1.5 Create `shared/mv-host-menu` (burger in the sticky top bar) replacing the copied side menu in `host-dashboard`, `search-host` and `voting-host`; add the "Blacklist" entry, remove "Startseite"; delete the copied CSS; spec asserts the entries and navigation
- [ ] 1.6 (2026-11-03: all covers now use `mv-cover`; only the `impeccable detect` check is still open) Replace every hand-written cover `<img>` (startpage, host-dashboard, guest, search-host, voting-comp, voting-host, select-playlist, select-blacklist) with `mv-cover`; verify `impeccable detect` no longer reports a real broken-image finding

## 2. TV page (`startpage`) — first priority

- [x] 2.1 Rebuild `startpage` layout per design D4 (stage background, large cover/title, fixed QR block with "Voting-PIN", top 5 + "+ N weitere", footer credit; same footer on the landing page `/`); remove the gradient text
- [x] 2.2 Guest-facing empty state "Scan den Code und wünsch dir den ersten Song!"; remove host-facing copy
- [x] 2.3 FLIP rank animation keyed by queue entry ID, disabled under reduced motion
- [x] 2.4 Update `startpage.spec.ts`: all persistent elements visible; 17 entries → 5 rows + "+ 12 weitere"; computed font size ≥ 32px for queue rows and ≥ 48px for the title at 1920×1080; empty state text and no "Dashboard" mention; track with empty `images` renders the placeholder

## 3. Voting (P0)

- [x] 3.1 Implement optimistic toggle with rollback and `pendingVotes` merge (design D3) in `voting-comp.ts`
- [x] 3.2 Restyle `.voted` (tint/outline, filled coral heart, pop animation); remove `pointer-events`/`opacity`/`grayscale`; always show the count including 0
- [x] 3.3 Add `aria-pressed` and `aria-label` "Song liken"/"Like entfernen" to the vote button
- [x] 3.4 Update `voting-comp.spec.ts`: count changes before the HTTP response; rollback on a 500 response; a liked card is clickable and un-likes; no `grayscale` filter on `.voted`; count "0" rendered; aria attributes switch

## 4. Guest join and feedback

- [x] 4.1 `code-input`: keep the app redirect, show "Party wird gesucht …" from the moment a PIN is present (including the 1.5 s wait) (design D5), add the error hint, keep the boxes editable; switch copy to "du"
- [x] 4.2 `code-input` a11y: group "Party-Code", labels "Ziffer 1"–"Ziffer 5", visible focus ring
- [x] 4.3 Welcome sheet on `/voting`, once per party (design D6)
- [x] 4.4 `guest` search: spinner, "Keine Treffer für „…“", network error text, "Song hinzugefügt" toast, backend errors via toast; "Nicht verfügbar" `aria-label`/tooltip on blocked results; fix the error colour contrast
- [x] 4.5 Party-ended screen "Die Party ist beendet." / "Danke fürs Mitfeiern!" / "Zur Startseite" in `voting-comp` and `guest`
- [x] 4.6 Remove dead code in `guest.ts` (`menuOpen`, `toggleMenu`, `goToVoting` → `/vote`)
- [x] 4.7 Specs: `code-input.spec.ts` (loading text during the app-redirect wait, error + hint, retry without reload, no "Sie"), welcome shown once and not after reload, search empty/error/added states, party-ended screen and no further requests

## 5. Accessibility baseline (all pages)

- [ ] 5.1 Replace `<div (click)>` back arrows and the `<p>` burger with `<button>` + `aria-label` in every page
- [ ] 5.2 Add `aria-label`s to all icon buttons (add, player controls, remove, block)
- [ ] 5.3 Fix the nested buttons in the "Party beenden" confirmation (`host-dashboard.html:196-207`)
- [ ] 5.4 Add `:focus-visible` styles globally; remove `outline: none` without a replacement
- [ ] 5.5 Check every text/background token pair against AA, including gradient endpoints; add a unit test over the token pairs
- [ ] 5.6 Specs: a DOM check per page that no `button`/`a` contains another, that every icon-only button has an `aria-label`, and that back buttons respond to Enter
- [ ] 5.7 Run `/impeccable audit musicvoting/frontend` and fix remaining P0/P1 accessibility findings

## 5b. Light mode (added 2026-11-03)

- [x] 5b.1 Theme tokens `--mv-stage-*` for dark and `[data-theme='light']` in `styles.css`; stage CSS uses only tokens; `ThemeService` (localStorage, `storage` sync) and `mv-theme-toggle` in every host top bar
- [x] 5b.2 Specs: default dark, toggle + persistence, cross-tab sync, light tokens applied, switch present with `role="switch"` on every host page, light background on the dashboard

## 5c. Stage look for the remaining pages (added 2026-11-03)

- [x] 5c.1 `home`: stage background, top bar with theme switch, large wordmark, two `host-btn` choices, HTL credit footer; verify with a DOM spec (no gradient background, buttons navigate, credit shown)
- [x] 5c.2 `code-input` (also `/join/:pin`): stage look, back button as `host-icon-btn`, digit boxes and paste button in the stage input/button style, status and error unchanged; verify existing `code-input.spec.ts` plus theme switch present
- [x] 5c.3 `host-options`: stage look, option cards with Lucide icons instead of emoji, back buttons as real buttons, "Gastgeber-PIN" wording and "Player öffnen" title (covers 6.1 for this page); verify in `host-options.spec.ts`
- [x] 5c.4 `create-party`: stage look, provider choice per host spec "Only Supported Providers Are Selectable" without inline `!important` styles (covers 6.2); verify in `create-party.spec.ts`
- [x] 5c.5 `select-playlist`: stage look, playlist rows as `host-row` with `mv-cover` (covers 1.6 for this page); verify in `select-playlist.spec.ts`
- [x] 5c.6 `mv-party-ended`: stage background and glow instead of the gradient fill, button as `host-btn primary`; verify in `mv-party-ended.spec.ts`
- [x] 5c.7 Check contrast of the new pages in dark and light mode (screenshots + measured worst points) and run the full frontend tests

## 6. Host setup

- [x] 6.1 Label the codes "Voting-PIN" / "Gastgeber-PIN" (with the hint "Geheim – damit kommst du zurück ins Dashboard."), remove "Host-PIN", use different icons, in host-options, host-dashboard and startpage; fix "Startseite öffnen" vs. "Player öffnen"
- [x] 6.2 `create-party`: Spotify selectable + "Du brauchst Spotify Premium.", "YouTube (bald verfügbar)" disabled, remove "Amazon Music" and the inline `!important` styles
- [ ] 6.3 New `party-ready` page + route with `hostGuard`; `select-blacklist` ("Weiter" / "Ohne Blacklist fortfahren") navigates there; "Player auf dem TV öffnen" + instructions for a separate device; "Party ist live 🎉" on device registration (design D8)
- [x] 6.4 `select-blacklist`: keep the setup mode unchanged; add `mode=edit` opened from the dashboard menu with the full editing and a single "Fertig" button back to `/dashboard`
- [x] 6.5 Removal question in `host-dashboard` (design D7): "Song entfernen" asks "„<Titel>“ aus der Warteschlange entfernen?" with "Auch sperren" / "Nur entfernen" / "Abbrechen" (no "Auch sperren" for the playing song); remove the separate "Song sperren" button; verify in `host-dashboard.spec.ts`: each choice sends the right requests (block + remove / remove only / none), playing song has no "Auch sperren", no ban button in rows
- [x] 6.6 Fix the typo "befor" and the English `alt="delete"`; remove the commented-out block and the invalid `height="300px"`
- [ ] 6.7 Specs: code labels and no "Voting-PIN"/"Host-PIN" text; no "Amazon Music", YouTube disabled; `select-blacklist` setup → `/party-ready`; `party-ready` button, separate-device instructions, code and live state; blacklist edit mode loads entries, adds/removes, "Fertig" → `/dashboard`

## 7. Verify and document

- [ ] 7.1 Full frontend test suite passes; backend suite passes (regression)
- [ ] 7.2 Run `/impeccable critique musicvoting/frontend/src/app` again and save the new score in `openspec/analyse/impeccable/`; target ≥ 28/40
- [ ] 7.3 Run `/impeccable document` to write `DESIGN.md` from the finished build
- [ ] 7.4 Update `musicvoting/frontend/README.md` (shared components, tokens, fonts/icons) and the host flow in `hugo/content/dev/` docs if described there
- [ ] 7.5 New screenshots in `hugo/content/status/screens/` for the next sprint review
