## Why

The Impeccable critique of 2026-10-29 (`.impeccable/critique/2026-10-29T12-14-01Z__musicvoting-frontend-src-app-pages.md`, score 15/40) found that the core guest interaction on the phone breaks the product's promise that "the crowd decides":

- **P0:** on `/voting` and `/guest` the last card sits under the fixed bottom tab bar and cannot be scrolled free, so the lowest-ranked song (the one that most needs likes) cannot be liked.
- **P1:** a liked song cannot be un-liked and looks disabled (`.track-card.voted { opacity: .5; pointer-events: none; filter: grayscale(1) }`), although the voting spec requires togglable likes and an optimistic UI. The UI waits for the server instead.
- **P1:** errors are swallowed (`console.error` only): a failed add, a duplicate, a failed vote or search never reach the guest, and the PIN error („Party nicht gefunden.“) is red on the coral gradient (≈1.3:1 contrast).

## What Changes

- **Reachable last card:** the scrolling list on both guest views reserves space for the floating tab bar and the iPhone home indicator (`env(safe-area-inset-bottom)`); both views use `100dvh`.
- **Reversible, visible likes:** a liked card stays fully opaque and tappable; the liked state is a filled Velvet Plum like button with a white heart and `aria-pressed="true"`; tapping again removes the like. Liked and not-liked buttons get German `aria-label`s.
- **Optimistic likes:** heart and count change immediately on tap, are reconciled with the server response, and revert on error with a visible message. Repeated taps while a request for the same song is in flight are ignored. The count change gets a short animation (off with `prefers-reduced-motion`).
- **Guest feedback messages:** a small shared message area (toast, `aria-live`) on both guest views shows: song added, „Song ist schon in der Warteschlange.“ (409), „Zu viele Anfragen — bitte kurz warten.“ (429), and a generic message for other add, vote and search failures.
- **Search states:** `/guest` shows a loading state while searching and a no-results state when a search finds nothing. A song already in the queue shows a distinct "in der Warteschlange" state instead of a grey, disabled-looking button.
- **Readable PIN error:** the PIN error on `/code` is shown as a white chip with dark text in an `aria-live` region; on „Party nicht gefunden.“ the five boxes are cleared and focus returns to the first box.
- Surfaces stay white (no dark mode); the TV player, host pages and accessibility audit are separate follow-up changes.

**Not in scope, found during research:**
- The backend has **no per-guest add rate limit** (guest spec "Per-Guest Add Rate Limit"); it only relays Spotify's own 429 with a different text. This change makes the frontend show „Zu viele Anfragen — bitte kurz warten.“ for any 429 from the add endpoint, so the message appears once the backend limit exists. Implementing the limit is a separate backend change.
- The empty search returns 500 in the backend and the frontend shows no top charts (search spec "Empty Search Shows Top Charts"): separate fix.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `voting`: adds the requirement that the liked state is visible and reversible on the guest view (card stays active, filled like button, accessible state), complementing the existing togglable and optimistic-vote requirements.
- `guest`: the bottom tab bar must not cover content; guests receive visible feedback messages for add, duplicate, rate limit and failures; the PIN entry error is readable and resets the input.
- `search`: the add/search view shows loading and no-results states and marks songs already in the queue with a distinct state.

## Impact

- **Frontend code:** `pages/voting-comp/*`, `pages/guest/*`, `pages/code-input/*`; new `services/guest-feedback.ts` and a small shared component `components/guest-toast/` used by both guest views.
- **Tests:** `voting-comp.spec.ts`, `guest.spec.ts`, `code-input.spec.ts` updated (new constructor dependency, new behavior); new specs for the feedback service and the toast component; `design-tokens.spec.ts` covers the new component's styles.
- **No changes** to backend, APIs, iOS app, TV player or host pages.
- **Docs:** status screenshots of `/voting`, `/guest` and `/code` are outdated after this change (refresh at the next sprint review, rule 6).
