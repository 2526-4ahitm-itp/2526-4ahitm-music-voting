## 1. Baseline

- [x] 1.1 Run the frontend tests and note the result (`cd musicvoting/frontend && dbx "npx ng test --watch=false --browsers=ChromeHeadless"`; in the Superbox use the no-sandbox Karma config from `ai/scratch/design-tokens/karma.conf.cjs`)
- [x] 1.2 Take "before" screenshots of `/code` (empty, wrong PIN), `/voting` (full list, scrolled to the end, liked song) and `/guest` (empty, results, no results) at 390×844 into `ai/scratch/fix-guest-voting-ux/before/`

## 2. Feedback service and toast

- [x] 2.1 Create `services/guest-feedback.ts`: `GuestFeedbackService` with `message` signal, `show(text, kind)`, auto-dismiss after 3.5 s, and `addErrorMessage(err)` (409 / 429 / other); with tests in `services/guest-feedback.spec.ts` (mapping, auto-dismiss with `jasmine.clock()`, timer reset)
- [x] 2.2 Create `components/guest-toast/` (standalone `GuestToast`): always-present `role="status"` `aria-live="polite"` region, white chip with Ink text, error variant with Signal Red icon, positioned above the bottom tab bar, tokens only; with a component test (renders text, empty when no message)
- [x] 2.3 Add `GuestToast` to the component list in `design-tokens.spec.ts` (no hex, no html/body)

## 3. Reachable last card (P0)

- [x] 3.1 `voting-comp.css` and `guest.css`: `.main-content` bottom padding `calc(4rem + 2vh + 1rem + env(safe-area-inset-bottom, 0px))` in the base rule and the phone media query; `/guest` container `100dvh`
- [x] 3.2 `src/index.html`: add `viewport-fit=cover` to the viewport meta

## 4. Reversible, optimistic likes (P1)

- [x] 4.1 `voting-comp.css`: remove fading/grayscale/`pointer-events` from `.track-card.voted`; add liked button state (Velvet Plum fill, white heart) and `.like-count.bumped` keyframe inside `prefers-reduced-motion: no-preference`
- [x] 4.2 `voting-comp.html`: `[attr.aria-pressed]`, `[attr.aria-label]` („Song liken“ / „Like entfernen“), bumped class on the count; `<app-guest-toast>`
- [x] 4.3 `voting-comp.ts`: optimistic toggle with snapshot, per-URI pending guard, reconcile with server reply, rollback + feedback message on error; `loadPlaylist` keeps pending optimistic state; remove dead `menuOpen`/`toggleMenu`
- [x] 4.4 `voting-comp.spec.ts`: tests for optimistic flip (count ± 1 before the server answers), reconcile, rollback + message on error, double-tap ignored while pending, SSE reload keeps pending state, update constructor for the new service

## 5. Guest add/search feedback (P1)

- [x] 5.1 `guest.ts`: success message „„<Titel>“ ist in der Warteschlange.“, `addErrorMessage` on add failure, search failure message; remove dead `menuOpen`/`toggleMenu`/`goToVoting`/`goToAddSongs`/`trackById` only if unused in the template
- [x] 5.2 `guest.html`: „Suche läuft…“ and „Keine Songs gefunden.“ / „Versuch einen anderen Suchbegriff.“ states; `aria-label` on "+" („Zur Warteschlange hinzufügen“) and on the queued checkmark („In der Warteschlange“); `<app-guest-toast>`
- [x] 5.3 `guest.css`: in-queue button in Plum Mist with plum checkmark instead of the grey disabled look; empty-state text styles for loading/no results
- [x] 5.4 `guest.spec.ts`: tests for success message, 409 / 429 / other messages, search error message, no-results flag, update constructor

## 6. Readable PIN error

- [x] 6.1 `code-input.html`/`.css`: error as white chip with dark text and red "!" icon in a `role="alert"` container, tokens only
- [x] 6.2 `code-input.ts`: on failed PIN lookup clear all five boxes and focus the first box
- [x] 6.3 `code-input.spec.ts`: test that a failed lookup sets „Party nicht gefunden.“, clears the boxes and focuses the first one

## 7. Verify

- [x] 7.1 All frontend tests green; production build succeeds
- [x] 7.2 Run the Impeccable detector on the changed pages (`impeccable detect --json` on `voting-comp/`, `guest/`, `code-input/`, `components/guest-toast/`) and fix real findings
- [x] 7.3 "After" screenshots at 390×844 (same states as 1.2): last card fully visible above the tab bar when scrolled to the end, liked card opaque with plum button, un-like works, no-results state, PIN error readable and boxes cleared; compare with "before"
- [x] 7.4 Update `DESIGN.md` (like button liked state, toast component, PIN error chip) and `.impeccable/design.json` component snippets accordingly
