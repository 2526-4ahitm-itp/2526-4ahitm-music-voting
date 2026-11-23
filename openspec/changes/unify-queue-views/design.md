# Design: One Queue View for Guests and Hosts, Design Follow-ups

> Decisions come from [`design-entscheidungen-2026-11-23.md`](../../analyse/impeccable/design-entscheidungen-2026-11-23.md). Motivation: see `proposal.md`.

## Context

Current state of `musicvoting/frontend/src/app` (zoneless Angular, standalone components, signals):

- **Guest:**
  - `pages/voting-comp` (`/voting`) holds the queue: the now-playing bar, ranks, the like toggle with an optimistic update, the highlight after a like, the welcome sheet and the party-ended screen. Its search field only filters the queue locally.
  - `pages/guest` (`/guest`) holds the provider search. It searches while the guest types (`searchAutoTrigger`), shows the blacklist hint, adds through `addToPlaylist`, and shows the toast "Song hinzugefügt – Platz N" with the action "Zum Voten".
  - `QueueStateService.inQueueUris$` is the live set of queued URIs.
  - The two pages are linked by `shared/mv-guest-tabs`.
- **Votes** go by track URI (`SpotifyWebPlayerService.toggleVote(uri, deviceId)`), so a search result can be liked without a queue-entry ID.
- **Host:**
  - `pages/host-dashboard` has the queue with rank, likes and remove; CSS hides rank and likes below 560 px.
  - `pages/voting-host` is a read-only copy of that queue with a filter.
  - `pages/search-host` is the host search, with "Nicht erlaubt." and checkmarks.
  - `shared/mv-host-menu` lists Dashboard, Voting, Suchen and Blacklist.
- **TV:** `startpage.css:29` uses the grid `1.25fr 1fr` with `gap: 4vw`; at 1920 px the content leaves about 450 px empty in the middle. FLIP reorder animation exists already.
- **Backend:** no changes needed.

## Goals / Non-Goals

**Goals:**
- Delete pages instead of hiding them: one guest page, one host queue.
- Reuse the existing search, add and vote logic; move it, don't rewrite it.
- Keep every German text that exists, unless the specs change it.

**Non-Goals:**
- iOS app (its search keeps the checkmark).
- Player connection status at "Player öffnen" (goes into `fix-player-device-feedback`, decision G1).
- Shortening "Code aus Zwischenablage einfügen" (decision F3: keep).
- Changing the main button or live chip on `party-ready` (decisions C1, C2: keep).
- Undo after removal, keyboard shortcuts.

## Decisions

### D1: The guest search lives in `voting-comp`; `pages/guest` is deleted
`voting-comp` gets the search logic of `guest.ts`:
- typing-triggered search with the same debounce
- the blacklist hint
- the add path with its error handling

The local queue filter is dropped. While `searchQuery()` is non-empty the list area renders search results; otherwise it renders the queue. The now-playing bar stays above both.

*Alternative:* keep `pages/guest` as a child component embedded in `voting-comp`. Rejected: two components would then both own the SSE connection and the toast. One page with one EventSource is simpler. If `voting-comp.ts` grows past about 400 lines, the search part is extracted into a presentational `shared/mv-guest-search-results` that gets results, queue state and callbacks as inputs.

### D2: A search result's state is derived from the queue, by URI
A computed signal maps the URIs in `tracks()` (the queue list with `likeCount` and `hasVoted`) to their queue entries. Each result row has one of three states:
- **blocked:** greyed out, as before
- **queued:** like count plus heart; the button calls the existing `toggleVote(queueEntry)`
- **addable:** "+"

Because the state comes from the same `tracks()` signal, the optimistic update and the "Liked Song Is Highlighted" behaviour work in both lists without extra code, and SSE `queue-updated`/`vote-updated` keep results live. `QueueStateService` is no longer needed on the guest page; the queue list already reloads on these events.

### D3: Add confirmation without action
The guest page calls `toast.show` as before (4000 ms) but without `actionLabel`/`onAction`, so the toast is a plain message. `mv-toast` and `ToastService` stay unchanged.

### D4: Routes
In `app.routes.ts`:
- `guest` → `redirectTo: 'voting'`
- `voting-host`, `search-host` → `redirectTo: 'dashboard'`

The dashboard's `hostGuard` then covers the old host links. The `VotingHost`, `SearchHost`, `Guest` and `MvGuestTabs` files are deleted. `app.routes.spec.ts` asserts the redirects.

### D5: Host dashboard — filter and "+ Song" panel
- The filter field sits in the queue card header. It is a local `computed` over `tracks`, and ranks come from the unfiltered index (`rankOf` map), the same approach `voting-comp` used.
- "+ Song" sits next to the queue title and toggles an inline search card **above** the queue card (not a modal: the host should see the song land in the queue). It contains the template and logic of `search-host`, moved into `shared/mv-host-song-search`, a standalone component. That keeps `host-dashboard.ts` from growing further and keeps the search spec reusable.
- The search card has "Fertig" and closes on Escape. Focus moves into its input on open and back to "+ Song" on close.

*Alternative:* a dialog or sheet. Rejected: it hides the queue the song is added to.

### D6: Phone rows on the dashboard
Below 560 px the queue row stays `rank · cover · text · likes · remove`. The cover shrinks to 40 px, rank and likes use the compact type size, and the text column keeps `minmax(0,1fr)` with ellipsis. This replaces the `display: none` rule in `host-dashboard.css:277-280`.

### D7: Focus management in the dashboard confirms
- `host-dashboard.ts` keeps a reference to the trigger button. A `#confirmFirst` template ref sits on the first button of each confirm: "Auch sperren" (or "Nur entfernen" for the playing song), and "Abbrechen" for ending the party.
- On open, `afterNextRender` focuses that ref.
- `cancelRemove()`, "Abbrechen" and Escape (`(keydown.escape)` on the confirm container) close the confirm and refocus the trigger.
- After a real removal the trigger is gone with its row, so focus goes to the queue card heading (`tabindex="-1"`) instead of being lost on `<body>`.

### D8: TV layout and like pulse
- **Grid:** `grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr)` and `gap: clamp(32px, 4vw, 115px)`. The `max-width: 46vw` cap on the now-playing text (`startpage.css:119`) is removed, so both columns use their full width. A layout spec measures the gap at 1920×1080 (≤ 115 px).
- **Pulse:** `startpage.ts` remembers the last like count per URI. When a new queue snapshot differs for a visible entry, that URI goes into a `pulsing` set for 600 ms. The CSS class `.pulse` runs a scale keyframe (1 → 1.25 → 1) on heart and count. Under `prefers-reduced-motion` the same class runs a colour-only keyframe (accent colour flash). This sits next to the FLIP code and does not interfere with it: the pulse is on the child elements, FLIP on the row.

### D9: Logo glow, host bar logo and badge, landing top bar
- **Token:** `styles.css` gets `--mv-glow-brand` (today's hard-coded purple `rgba` in `startpage.css:66-71` and `host-dashboard.css:31-35`) and `--mv-glow-logo: 0 0 24px rgb(255 255 255 / .18)`. In light mode `--mv-glow-logo` is `none`. The TV logo uses `filter: drop-shadow(var(--mv-glow-logo))`; `drop-shadow` follows the logo's shape instead of a box.
- **Host bar:** `mv-host-menu` renders the existing logo asset (decorative, the "MusicVoting" text becomes visually hidden for screen readers) and a badge "Party läuft · {{ pin }}" from `PartyService`. The badge is static text, not a live region.
- **Landing page:** below 600 px the logo moves out of the hero into the top bar on the left. The hero keeps the wordmark.

### D10: Theme toggle as icon-only button
`mv-theme-toggle` drops the `.label` span. The button becomes a round 44×44 px icon button (moon/sun), keeping `role="switch"`, `aria-checked`, `aria-label="Heller Modus"` and the existing `title`.

### D11: party-ready and PIN tags
- The separate-device sentence becomes `<p>Anderes Gerät am TV?</p><ol>` with the four steps.
- The PIN tags are a small muted `<span class="pin-tag">` inside the label: "für Gäste" and "nur für dich". They are used on the dashboard and on party-ready.

## Risks / Trade-offs

- **The guest page gets heavier** (queue + search in one component) → if it grows too large, extract the presentational results list (D1). The spec files `guest.spec.ts` and `voting-comp*.spec.ts` are merged, and tests are kept per behaviour, not per old page.
- **Search results with a like button look like queue rows** → results keep the "+"/heart column, have no rank number and sit under a visible label "Suchergebnisse", so the guest knows they are not looking at the queue.
- **Bookmarked `/guest`, `/voting-host`, `/search-host` links** → covered by the redirects (D4).
- **Pulse spam on the TV during a vote storm** → each URI pulses at most once per 600 ms. A change during a running pulse restarts it, it does not stack.
- **Docs drift:** README, the Hugo frontend page and `DESIGN.md` describe the tabs and host pages → task group 9 updates them.

## Migration Plan

Frontend-only, no data migration. Deploy as usual through `build-push-deploy.yml`. Rollback = revert the merge. Old URLs stay valid through the redirects.

## Open Questions

- Exact glow strength of the TV logo (`--mv-glow-logo`): tune by eye on the real TV, within "minimal" (decision E4).
