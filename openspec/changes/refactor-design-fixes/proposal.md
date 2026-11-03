# Proposal: Design Fixes from the Impeccable UI/UX Critique

> **Status: ready for implementation.** All questions in [`questions.md`](questions.md) were answered on 2026-11-03 and are incorporated here.

## Why

The Impeccable critique ([`openspec/analyse/impeccable/ui-ux-critique.md`](../../analyse/impeccable/ui-ux-critique.md), 2026-11-03) scores the web frontend at **18/40 (Poor)**. It finds one P0, three P1 and one P2 problem:

1. **[P0] Voting:** a liked song turns grey and can no longer be tapped. This breaks `voting/spec.md` "Likes Are Togglable" and "Optimistic Vote UI".
2. **[P1] TV page:** the TV page (`/startpage`) is a desktop page. The queue and QR code cannot be read from the couch.
3. **[P1] Guest join:** joining is fragile (a 1.5 s app-redirect wait, no loading state, no confirmation). Search and add give almost no feedback.
4. **[P1] Accessibility:** basics are missing (`lang="en"`, unlabelled icon buttons, `<div>` back arrows, nested buttons, no live regions, weak contrast).
5. **[P2] Host setup:** the setup is confusing: two PINs that are not explained, a mandatory blacklist step before the party exists, "Amazon Music" creates a Spotify party, and there is no "Party läuft" moment.

The team decided (2026-11-03): address **all 5 problems** on the branch `refactor/design`, starting with the **TV page**, and **evolve the look**. The purple-to-coral colours stay, but the app gets more character of its own (club/stage feel, real icons, better typography) instead of the generic party-template look.

## What Changes

- **TV page for viewing distance:**
  - large now-playing cover and title
  - a fixed, large block with QR code and Voting-PIN
  - top songs with vote counts in large type
  - animated rank changes
  - empty-state text addressed to guests
  - HTL credit as a footer (TV and landing page)
  - no gradient text
- **Celebrated voted state:**
  - a voted card stays tappable and can be un-liked
  - it shows a filled accent heart, a tinted card and a short pop animation
  - the count updates optimistically and is always shown, including 0
- **Cover fallbacks:** every cover image in the web app has a working placeholder. A missing `images` array no longer crashes the page.
- **Guest join:**
  - the app redirect stays, but "Party wird gesucht …" is shown during the wait
  - loading state "Party wird gesucht …"
  - an error with a hint pointing to the code on the TV
  - a one-time welcome after joining
- **Guest feedback:**
  - search shows a loading state, "Keine Treffer" and a network error
  - adding a song shows a short confirmation
  - leaving a party shows a clear goodbye instead of a silent jump
- **Accessibility baseline (new capability `web-ui`):**
  - `lang="de"`
  - labelled icon buttons
  - real, non-nested buttons
  - visible focus
  - `aria-live` for status messages
  - WCAG AA contrast
  - `prefers-reduced-motion`
  - consistent "du"
- **Host setup:**
  - consistent code names "Voting-PIN" and "Gastgeber-PIN" with different icons
  - Spotify selectable, YouTube shown as "bald verfügbar", Amazon removed
  - the blacklist setup step stays, and the full blacklist can also be edited during the party from the dashboard
  - a final "Party ist live" step with "Player auf dem TV öffnen" and instructions for opening the player on a separate device
  - deleting from the queue can be undone
- **Visual evolution (design only, no new requirements):** see `design.md` D1, with icon set, font and the "stage" for the TV.

## Capabilities

### New Capabilities

- `web-ui`: cross-cutting requirements for the Angular web app (language, accessibility, focus, live regions, contrast, motion, image fallbacks, form of address). Until now these were scattered or missing.

### Modified Capabilities

- `dashboard`: "Persistent Dashboard Elements" gets a room-scale layout. New requirements cover rank animation and the empty state.
- `voting`: new requirement "Voted State Is Highlighted, Not Disabled" (web).
- `guest`: "Join via QR Code" gets a loading state and error hint. New requirements: welcome after joining, search/add feedback.
- `host`: "Host Sees PIN and QR Code After Creation" (code names), "Host Manages Party Blacklist" (also editable during the party), "Host Removes Songs from Queue" (undo). New requirements: go-live step, only supported providers selectable.

## Impact

- **Frontend (main work):**
  - pages `startpage`, `voting-comp`, `guest`, `code-input`, `create-party`, `host-options`, `select-playlist`, `select-blacklist`, `host-dashboard`, `search-host`, `voting-host`
  - `index.html`, `styles.css`
  - new shared components: side menu, spinner, cover image, icon, toast/live region
  - new font and icon dependencies
- **Backend:** none.
- **iOS:** no changes. The new `web-ui` capability applies only to the web app. The app redirect on web join stays.
- **Tests:** adjust or add specs for every affected page (DOM assertions, including aria attributes).
- **Docs:**
  - `musicvoting/frontend/README.md`
  - new screenshots in `hugo/content/status/screens/` at the next sprint review
  - `openspec/analyse/impeccable/` gets a new critique after implementation
