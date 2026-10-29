## Context

The guest views `/voting` (`pages/voting-comp/`) and `/guest` (`pages/guest/`) share the same layout: a full-height column on the brand gradient, a sticky header with search, a scrolling `.main-content` list, and a floating `.bottom-nav` (`position: fixed; bottom: 2vh; height: 4rem`, introduced by the "design fix try 2/3" commits). `.main-content` only has `1rem`–`2rem` bottom padding, so the floating bar covers the end of the list. `/guest` still uses `100vh`, `/voting` uses `100dvh`.

Votes go through `SpotifyWebPlayerService.toggleVote(uri, deviceId)`, which returns `{ likeCount, liked }`. The component waits for it before updating the signal, and `.track-card.voted` fades, greys and disables the whole card. Adds go through `addToPlaylist(uri)`; the backend answers 409 with `{ "error": "Song ist schon in der Warteschlange." }`. There is no per-guest rate limit in the backend yet (see proposal). All errors end in `console.error`.

`/code` (`pages/code-input/`) shows `.error-message` in `--color-danger` directly on the gradient.

Findings and measurements come from the critique snapshot `.impeccable/critique/2026-10-29T12-14-01Z__musicvoting-frontend-src-app-pages.md`. Visual rules come from `DESIGN.md` ("The Glowing Wristband"): white reading surfaces stay, Velvet Plum marks the one active thing, glass on the gradient, thumb-sized controls.

## Goals / Non-Goals

**Goals:**
- Last card on both guest views reachable above the tab bar on every phone, including the iPhone home indicator.
- Likes feel instant and reversible; the liked state reads as "your voice counted", not "disabled".
- Every add/vote/search outcome is visible and announced; the PIN error is readable.
- Stay within the existing visual system and tokens; no new colors.

**Non-Goals:**
- Dark mode or new surfaces (decision: white stays).
- Backend rate limit, empty-search top charts, SSE party ID on `/guest`: separate changes.
- Extracting the duplicated bottom nav into a shared component (would touch routing tests; follow-up refactor).
- TV player, host pages, full accessibility audit (later changes).

## Decisions

### 1. Bottom space via padding on `.main-content`
`.main-content { padding-bottom: calc(4rem + 2vh + 1rem + env(safe-area-inset-bottom, 0px)); }` = tab bar height + its bottom offset + breathing room + safe area. Requires `<meta name="viewport" content="…, viewport-fit=cover">` for `env()` to be non-zero on iOS; `index.html` is checked and extended if missing. Both views use `height: 100dvh`. The value lives once per stylesheet as `--bottom-nav-clearance` on `.music-voting-container`.

*Found during implementation:* with `viewport-fit=cover` the page extends under the iPhone home indicator, so the floating tab bar itself also moves up by the safe area (`bottom: calc(2vh + env(safe-area-inset-bottom, 0px))`); the toast uses the same offset.
**Alternative:** make the nav static again (in the flex column) — rejected, the floating pill was a deliberate team design decision (try 2/3) and is documented in DESIGN.md.

### 2. Liked state on the button, not the card
Remove `.track-card.voted` fading/grayscale/`pointer-events: none`. The like button gets two states:
- not liked: Plum Mist fill (`--color-primary-tint`), plum outline heart (as today),
- liked: Velvet Plum fill (`--color-primary`), white filled heart.
`[attr.aria-pressed]` and `[attr.aria-label]` („Song liken“ / „Like entfernen“) on the button. This follows "The Plum Speaks Rule": the filled plum button is the one strong mark per card.

### 3. Optimistic toggle with a per-song pending guard
`toggleVote(track)`:
1. If `pending.has(track.uri)` return (double-tap guard, spec "Double-tap during a pending request").
2. Snapshot `{ hasVoted, likeCount }`, apply the optimistic flip (`likeCount ± 1`), add to `pending`, mark the count as "bumped" for the animation.
3. On success, reconcile with the server's `{ likeCount, liked }` (server is the source of truth).
4. On error, restore the snapshot and show the feedback message „Das Liken hat nicht geklappt. Versuch es nochmal.“
5. Always remove from `pending`.

SSE `vote-updated` events call `loadPlaylist()`, which replaces the list. While a song is pending, `loadPlaylist` keeps the optimistic `hasVoted`/`likeCount` for that URI so a late SSE event cannot flash the old state; the server reply reconciles it afterwards.

**Count animation:** a CSS keyframe (`scale 1 → 1.25 → 1`, 250 ms, ease-out) on a `.like-count.bumped` class that the component sets for 300 ms after a change; wrapped in `@media (prefers-reduced-motion: no-preference)`.

### 4. One shared feedback service + toast component
- `services/guest-feedback.ts`: `GuestFeedbackService` (`providedIn: 'root'`) with a `message` signal `{ text, kind: 'info' | 'error' } | null`, `show(text, kind)` and auto-dismiss after 3.5 s (timer reset on a new message). Plus a pure helper `addErrorMessage(err: HttpErrorResponse)`: 409 → „Song ist schon in der Warteschlange.“, 429 → „Zu viele Anfragen — bitte kurz warten.“, else „Das hat nicht geklappt. Versuch es nochmal.“
- `components/guest-toast/`: standalone `GuestToast` rendering a `role="status"`, `aria-live="polite"` region that is always in the DOM (so screen readers pick up changes) and shows the current message as a white chip with Ink text (error: Signal Red icon/border, still dark text for contrast), placed above the bottom tab bar. Used in both guest templates.

Strings in German, informal („du“), kept verbatim where the specs fix them.

**Alternative:** a global toast in `app.html` — rejected for now: host and TV pages have different layouts and no tab bar; scoping to guest views keeps the change small.

### 5. Search states on `/guest`
- While `isSearching()` and no results: a short „Suche läuft…“ line in the empty state (`role="status"`).
- Non-empty query, not searching, zero results: „Keine Songs gefunden.“ with the hint „Versuch einen anderen Suchbegriff.“
- Search error: feedback message „Die Suche hat nicht geklappt. Versuch es nochmal.“
- In-queue button: Plum Mist fill with a plum checkmark and `aria-label="In der Warteschlange"`, `disabled` stays; no grey look. The "+" button gets `aria-label="Zur Warteschlange hinzufügen"`.
- Successful add: feedback „„<Titel>“ ist in der Warteschlange.“

### 6. PIN error on `/code`
`.error-message` becomes a white chip (`--color-surface` background, `--color-text` text, Signal Red left icon "!" in a circle, `--radius-md`), inside an element with `role="alert"`. On a failed `resolvePin`, the component clears all five inputs (`ViewChildren` or the existing `document.querySelectorAll` approach used in the component) and focuses the first one. Digit-only validation messages keep their wording.

## Risks / Trade-offs

- [SSE reload overwrites optimistic state] → pending-URI overlay in `loadPlaylist` (Decision 3); covered by a unit test.
- [`env(safe-area-inset-bottom)` is 0 without `viewport-fit=cover`] → check and extend the viewport meta; verify by screenshot at 390×844.
- [Toast covers content] → it sits above the tab bar, is short-lived and narrow; the list's bottom padding (Decision 1) leaves the last card visible.
- [Rate-limit message never appears today] → expected: backend limit is missing; frontend mapping is tested with a mocked 429 and documented in the proposal.
- [Duplicated bottom-nav CSS in two files] → both get the same edit; extraction is a listed follow-up.

## Migration Plan

Frontend-only; ships with the next frontend image. Rollback = revert the commit.

## Open Questions

- Should the success message after adding offer a jump to „Voten“ (e.g. a „Jetzt voten“ link in the toast)? Left out for now; easy follow-up.
