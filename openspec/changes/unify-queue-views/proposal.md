# Proposal: One Queue View for Guests and Hosts, Design Follow-ups

> **Status: ready for implementation.** Based on the answers in
> [`openspec/analyse/impeccable/design-entscheidungen-2026-11-23.md`](../../analyse/impeccable/design-entscheidungen-2026-11-23.md) (filled in 2026-11-23).

## Why

The Impeccable critique of 2026-11-17 ([`ui-ux-critique-2026-11-17.md`](../../analyse/impeccable/ui-ux-critique-2026-11-17.md), 27/40) finds that the queue is split across too many pages. Guests switch between two tabs ("Voten", "Hinzufügen"), and hosts see the queue in three versions: the dashboard, `/voting-host` and the dashboard on a phone, which hides rank and likes. The critique also names smaller problems: `party-ready`, focus handling in the dashboard confirms, the TV layout and some polish items. The team answered every open design question on 2026-11-23. This change puts those answers into the specs.

## What Changes

- **Guests get one page:**
  - **BREAKING (routes):** `/voting` becomes the only guest page. It always shows the queue, and guests vote there.
  - The search field on that page searches the provider and finds every song, including songs already in the queue. A queued song shows its heart and like count, so the guest votes on it. Any other song shows "+".
  - The bottom tab bar is removed. `/guest` redirects to `/voting`.
- **Hosts get one queue:**
  - `/voting-host` and `/search-host` are removed and redirect to `/dashboard`. The host menu keeps only "Dashboard" and "Blacklist".
  - The dashboard gets a filter field above the queue and a "+ Song" button that opens the song search inside the dashboard.
  - Rank and likes are also shown on phones; the cover gets smaller there instead.
- **party-ready:**
  - The steps for a second device become a numbered list.
  - Each PIN gets its own icon and a hint, "für Gäste" or "nur für dich". This applies to the dashboard as well.
  - Main button, live status and the order of the page stay as they are.
- **Dashboard confirms:**
  - When "Song entfernen?" opens, the focus moves to its first button, "Auch sperren", or "Nur entfernen" for the playing song.
  - When "Party wirklich beenden?" opens, the focus moves to "Abbrechen".
  - Escape closes both, and the focus goes back to the button that opened them.
- **TV (`/startpage`):**
  - At 1920 px the columns grow, so there is no empty gap in the middle.
  - When a song's like count changes, its heart and count pulse briefly. Under reduced motion they only change colour.
  - In dark mode the logo gets a minimal white glow behind it.
- **Polish:**
  - The host bar shows the logo instead of the text "MusicVoting", plus a badge "Party läuft · <Voting-PIN>".
  - The theme switch becomes an icon-only toggle button on every page.
  - On phones the landing page shows the logo on the left of the top bar and the switch on the right.
  - The brand glow `rgba` values become a design token.
- **Guest add confirmation:** the toast "Song hinzugefügt – Platz N" no longer has the action "Zum Voten", because the guest is already on the queue page.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `guest`:
  - one guest page instead of two tabs
  - landing after joining, page title, add confirmation, voting-view content
  - add/search feedback moves to the single page
- `search`:
  - a web guest search result for a queued song is a vote control instead of a disabled checkmark
  - an empty web guest search shows the queue instead of Top Charts
- `host`:
  - the host menu loses its "Voting" and "Suchen" entries and shows the logo and a "Party läuft" badge
  - the dashboard holds the queue filter and the song search
  - rank and likes are shown on phones
  - PIN hints, numbered steps on party-ready, focus handling in the confirms
- `dashboard` (TV):
  - the layout at 1920 px
  - a pulse when the like count changes
- `web-ui`:
  - icon-only theme toggle
  - logo on the landing page top bar on phones, white logo glow on the TV in dark mode
  - guest pages listed as the single `/voting` page
  - glow token

## Impact

- **Frontend (`musicvoting/frontend/src/app`):**
  - `pages/voting-comp` takes over the search from `pages/guest`.
  - The pages `pages/guest`, `pages/voting-host` and `pages/search-host` are deleted, and `app.routes.ts` gets redirects for them.
  - Changed: `pages/host-dashboard` (filter, "+ Song" search panel, phone rows, focus), `pages/party-ready`, `pages/startpage`, `pages/home`.
  - Changed shared components: `shared/mv-host-menu`, `shared/mv-theme-toggle`, `shared/mv-guest-tabs` (deleted), `styles.css` (glow token).
  - The specs of the deleted pages move to the pages that now hold the behaviour.
- **Backend:** no changes. Search, add, vote and queue endpoints stay as they are.
- **iOS app:** not affected. Its search keeps the disabled checkmark (`search/spec.md`).
- **Docs:** `musicvoting/frontend/README.md`, `hugo/content/dev/frontend.md` and `DESIGN.md` describe the guest tabs and host pages and must be updated.
