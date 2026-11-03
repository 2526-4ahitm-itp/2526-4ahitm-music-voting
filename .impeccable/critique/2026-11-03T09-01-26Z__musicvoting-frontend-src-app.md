---
target: musicvoting/frontend
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/simonesperrer/IdeaProjects/itp_projekt/2526-4ahitm-music-voting/musicvoting/frontend/src/app"
timestamp: 2026-11-03T09-01-26Z
slug: musicvoting-frontend-src-app
---
# UI/UX Critique — MusicVoting Web Frontend (Impeccable)

_Created 2026-11-03 with `/impeccable critique` (Impeccable v0.1.18) on branch `refactor/design`._
_Target: `musicvoting/frontend/src/app/` (all pages). The iOS app is not covered._

**Method: dual-agent.** Assessment A was a design review of the source code, the screenshots in `hugo/content/status/screens/` and the specs. Assessment B was the deterministic `impeccable detect` scan. The two ran isolated from each other and were merged afterwards.

**Run notes:**
- The app was not inspected live in the browser, so no detector overlay ran. The host, dashboard and voting pages need the Quarkus backend, PostgreSQL and a Spotify/YouTube OAuth login.
- Neither assessment read the earlier reviews in this folder ([`../ui-ux-review.md`](../ui-ux-review.md), [`../design-review.md`](../design-review.md)), so they stayed unanchored. They reached most of the same core findings anyway, which confirms them independently.
- `PRODUCT.md` and `DESIGN.md` do not exist yet. There were therefore no project-specific personas.

---

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Live SSE updates and the add checkmark work well. Guest search has no loading or "no results" state (`guest.html:63-75`). A vote waits for the server before anything changes (`voting-comp.ts:223-238`). |
| 2 | Match System / Real World | 2 | Jargon: "Host-PIN" vs. "Voting-PIN", "Player öffnen", "Standard-Playlist", "Blacklist". The TV tells guests to use the "Dashboard". |
| 3 | User Control and Freedom | 1 | A vote cannot be taken back (`.voted { pointer-events: none }`, `voting-comp.css:235-239`). Deleting from the queue has no confirmation and no undo (`host-dashboard.html:146`). |
| 4 | Consistency and Standards | 2 | "Sie" in `code-input.html:9`, "du" everywhere else. The same 👑 is used for both PINs. Back buttons follow three different patterns. Blocked songs show "Nicht erlaubt." for the host but not for the guest. |
| 5 | Error Prevention | 3 | Blocked and duplicate songs are marked before they can be added. Blocking and ending the party ask for confirmation. Exception: "Amazon Music" can be selected but silently creates a Spotify party (`create-party.ts:165`). |
| 6 | Recognition Rather Than Recall | 2 | To get back in, the host has to remember a host PIN they only ever saw on the dashboard. The dashboard navigation is hidden behind ☰. |
| 7 | Flexibility and Efficiency | 1 | Only paste and Enter-to-submit. There is no "my songs" view and no keyboard shortcuts for player controls. |
| 8 | Aesthetic and Minimalist Design | 2 | Every page uses the same gradient. On the TV, the HTL logo and a 6-line QR caption compete with the song that is playing. |
| 9 | Error Recovery | 2 | "Party nicht gefunden." gives no next step. Search errors only go to `console.error` (`guest.ts:104-105`). The error red #C0392B sits on the pink gradient. |
| 10 | Help and Documentation | 1 | There is no first-use hint for guests or the host, and nothing explains why the player must be opened first. |
| **Total** | | **18/40** | **Poor** |

18/40 is below the usual 20–32 range. User control, flexibility and help pull the score down. Error prevention is the strongest area.

---

## Design Specificity Verdict

**LLM assessment:** The visual language could belong to almost any app in this category:
- the same `linear-gradient(135deg, #8403A6, #F2594B)` on every page
- white rounded cards
- the Segoe UI system font (`styles.css:7`)
- emoji as icons (🪩 👑 🔊 ❌ 🚫 🎵)

That is the default look of a "party app" template. Very little in it comes from the actual setting: a dark, loud room, phones held in one hand, and a TV seen from three metres away.

A few elements do come from the product:
- the animated soundwave on the song that is playing now
- the floating Voten/Hinzufügen bar
- the list sorted by votes
- QR code plus PIN on the TV

The biggest missed opportunity is the **TV page** (`startpage.html`). It is the dashboard layout with the controls removed, not a stage designed for the room.

**Deterministic scan** (`impeccable detect --json musicvoting/frontend/src/app`, exit 2) found **21 findings**:

| Rule | Count | Example | Verdict |
|---|---|---|---|
| broken-image | 13 | `select-playlist.html:23` | Mostly false positives: Angular `[src]` bindings, and select-playlist/select-blacklist have `@if` with a ♪ placeholder. **There are real hits, though.** The fallback `'assets/placeholder.png'` in `guest.html:42` and `search-host.html:54` does not exist; the file is `assets/img/placeholder.png`. `startpage.html:8`, `host-dashboard.html:25`, `voting-comp.html:32` and `voting-host.html:52` have no fallback at all. `startpage.html:62` and `host-dashboard.html:130` index `images[images.length-1]` without a guard, which throws on an empty array. |
| side-tab | 4 | `voting-comp.css:184` | True positive on the now-playing card: a 3px purple stripe on the most prominent guest card is the generic accent-stripe pattern. The 3 side-menu hits are a weak true positive: an ordinary active indicator, but the same CSS is copied into 3 files. |
| border-accent-on-rounded | 2 | `search-host.css:387` | False positive: the standard CSS spinner. It is duplicated in `voting-host.css:343`. |
| gradient-text | 1 | `startpage.css:259` | True positive: gradient text on the QR caption is decorative and hard to read on a TV. |
| bounce-easing | 1 | `voting-comp.css:201` | False positive: the rule matched the keyframe name `soundwave-bounce`. The actual easing is `ease-in-out` with no overshoot. |

**Where the review and the scan agree:**
- the TV page (gradient text, layout)
- the now-playing card
- the missing shared host components (the copied side-menu and spinner CSS)

**What the scan caught that the review only touched on:** the broken image paths. The review mentioned the placeholder path only in passing; the scan also showed that four views have no fallback at all and two crash on an empty `images` array.

**Visual overlays:** none. The browser was not inspected, so no overlay is visible.

---

## Overall Impression

The guest experience has the right bones: two jobs (voting and adding), a bottom bar in the thumb zone, and live updates. Three things make it feel unfinished:
- **Voting looks like a punishment.** A liked song turns grey and can no longer be tapped.
- **The TV is a desktop page**, not a stage.
- **The host has to learn too many concepts.**

**Biggest opportunity:** make the TV the party's real home: a large cover, the top songs readable from the couch, the QR code always visible, and rank changes animated live.

## What's Working

1. **The guest bottom bar fits the room.** It is a floating two-part control about 4rem high, sits in the thumb zone and respects the safe area (`guest.css:238-250`). A distracted guest using one hand cannot get lost.
2. **The add flow is honest and live.**
   - The button turns into a checkmark for songs already in the queue.
   - Blocked songs are greyed out.
   - Both states update over SSE (`queue-updated`, `blacklist-updated`).

   This prevents the most common party conflict (duplicates, banned songs) before it happens.
3. **The voting list shows what is playing now.** A soundwave replaces the heart on the current song and the list is sorted by votes. This is the most product-specific visual in the app. The select-playlist subtitle also explains *why* a fallback playlist exists.

---

## Priority Issues

### [P0] Votes are a one-way door, which contradicts the spec

- **What:** `.track-card.voted { opacity: .5; pointer-events: none; filter: grayscale(1) }` (`voting-comp.css:235-239`). After a vote the card can no longer be tapped, so `toggleVote` can never take the vote back. The UI also waits for the server response.
- **Why it matters:** This breaks two requirements in `openspec/specs/voting/spec.md`: "Likes Are Togglable" and "Optimistic Vote UI". A guest who mistaps cannot undo it, and the reward state looks like an error state.
- **Fix:**
  - Remove `pointer-events` and `grayscale`.
  - Show the voted state as a filled accent heart, a tinted card and a short pop animation.
  - Update count and heart optimistically, with a rollback on error.
  - Always show the count, including 0.
- **Suggested command:** `/impeccable harden`, then `/impeccable delight`

### [P1] The guest join is fragile and gives no confirmation

- **What:**
  - Every web join first tries `musicvotingapp://`, then waits 1.5 s and checks `document.hidden` (`code-input.ts:27-35`). On iOS Safari this can show an "address invalid" dialog.
  - There is no loading state while `resolvePin` runs.
  - "Falscher Code" / "Party nicht gefunden." gives no next step.
  - After joining there is no party name and no "Du bist dabei".
- **Why it matters:** Joining is the first impression for the most users, and it happens under the worst conditions (loud room, bad network).
- **Fix:**
  - Make the web join the default and offer the app as an optional banner.
  - Show "Party wird gesucht …".
  - On success show a one-time welcome sheet per deviceId ("Du bist bei <Party>! Like Songs oder füge eigene hinzu.").
  - On error, point to the code on the TV.
- **Suggested command:** `/impeccable onboard`

### [P1] The TV/player page is not designed for the room

- **What:**
  - `startpage.html` reuses the dashboard grid, and the queue text is about 13px.
  - The QR code is about 150px, while the 6-line gradient caption (`startpage.css:259`) carries more weight than the QR itself.
  - The HTL branding takes a permanent spot.
  - The empty state talks to the host ("im Dashboard starten").
  - Covers without an image break, and an empty `images` array throws (`startpage.html:62`).
- **Why it matters:** The TV is the shared stage and the main way new guests arrive (via the QR code). From the couch, nothing in the queue is readable.
- **Fix:**
  - Lay the page out for viewing distance: a large now-playing cover and title.
  - Make QR code plus PIN a fixed, large corner block.
  - Show the top 3–5 songs with vote counts at 32px or more.
  - Animate rank changes.
  - Write the empty state for guests ("Scan den Code und wünsch dir den ersten Song").
  - Move the HTL credit into a footer line and remove the gradient text.
- **Suggested command:** `/impeccable layout`, then `/impeccable bolder`

### [P1] The accessibility baseline is missing

- **What:**
  - `<html lang="en">` while all content is German (`index.html:2`).
  - The vote button is only "♡"/"♥", with no `aria-label` or `aria-pressed` (`voting-comp.html:50-52`).
  - The add button is an SVG with no label (`guest.html:50`).
  - The burger menu ☰ is a `<p>` (`host-dashboard.html:3`).
  - The player controls have no labels (`host-dashboard.html:34-63`).
  - The back arrows are `<div (click)>` and cannot be reached by keyboard (`create-party.html:3`, `host-options.html:3`).
  - There are nested buttons (`host-dashboard.html:196-207`).
  - The code inputs have no labels and weak focus styling (`code-input.css:69-75`).
  - There are no live regions.
  - Contrast is below 4.5:1 at the coral end of the gradient and for the error red.
- **Why it matters:** Screen-reader users cannot vote or add songs, and keyboard users cannot go back.
- **Fix:**
  - Set `lang="de"`.
  - Give icon buttons an `aria-label`, plus `aria-pressed` on the vote button.
  - Use real `<button>` elements without nesting.
  - Add `aria-live="polite"` for errors and confirmations.
  - Show visible focus rings.
  - Check text colours against the gradient.
- **Suggested command:** `/impeccable audit`, then `/impeccable harden`

### [P2] The host setup flow is confusing and has dead ends

- **What:**
  - "Amazon Music" silently creates a Spotify party (`create-party.html:35`, `create-party.ts:165`).
  - There are two PINs with the same 👑 and no explanation.
  - The heading says "Startseite öffnen" but the button says "Player öffnen" (`host-options.html:40`).
  - "Player öffnen" opens a new tab with no hint that it belongs on the TV.
  - The blacklist is a required setup step before the party even exists.
  - "Weiter" is disabled even though "Ohne Blacklist fortfahren" leads to the same place.
  - After setup there is no "Deine Party läuft" moment. The first message on the dashboard is a warning ("Player muss zuerst geöffnet werden").
- **Fix:**
  - Remove unsupported providers.
  - Rename the PINs to "Gäste-Code" and "Gastgeber-Code (geheim)" and give them different icons.
  - Add a final setup step: "Öffne den Player auf dem TV", followed by a "Party ist live" confirmation.
  - Move the blacklist into the dashboard settings.
- **Suggested command:** `/impeccable clarify`, then `/impeccable distill`

---

## Cognitive Load

**5 of 8 checks fail, so the load is high.**

| Check | Result |
|---|---|
| Single focus | ❌ The host dashboard mixes player controls, queue items with block and delete, PIN, QR code, "Player öffnen", "Party beenden" and ☰. |
| Grouping | ❌ The right-hand column mixes things for guests (QR), a host dependency (player) and a destructive action (end party) (`host-dashboard.html:167-217`). |
| One thing at a time | ❌ select-blacklist puts a word form, artist/song tabs, search, results, the blocked list, "Weiter" and skip on one screen. |
| Working memory | ❌ The host PIN vs. voting PIN distinction is never explained. To come back, the host has to remember the host PIN. |
| Progressive disclosure | ❌ The blacklist is mandatory before the party starts instead of an optional setting. |
| Chunking / visual hierarchy / ≤4 options | ✅ On the guest screens. |

**Decision points with more than 4 visible options:**
- Host dashboard: 6 fixed controls plus 2 per queue item.
- select-blacklist: 7 or more.

## Emotional Journey

- **The host's peak never happens.** After OAuth, playlist and blacklist, the host lands directly on the dashboard, and the first message is a warning.
- **No reassurance at the riskiest step.** Before the Spotify redirect, nothing explains what happens next or whether Premium is needed.
- **The guest join has a low point.** There is the app-redirect wait, and after joining no "Du bist dabei".
- **Voting feels like a punishment.** The card fades to grey instead of celebrating the vote.
- **The ending is abrupt.** On `party-ended` guests are silently sent to `/`, with no goodbye and no recap. By the peak-end rule, the last moment weighs heavily.

---

## Persona Red Flags

**Casey (distracted, one hand, mobile guest):**
- The search field is at the top, outside the thumb zone (`guest.html:10-31`).
- A mistapped vote cannot be undone.
- Adding gives only an easy-to-miss checkmark, with no toast.
- With no network there is no message; `loadPlaylist` and `search` only log to the console.
- Search results show a broken image because of the wrong placeholder path.
- In the list, the song title is cut off while the artist wraps to two lines.
- ✅ Tap targets are fine (3.25–3.75rem buttons, 4rem nav).

**Jordan (first-time user):**
- Nothing says that the 5 boxes are the 5-digit code from the TV, and the text uses "Sie".
- A blocked song is just a grey card with no explanation, while the host view says "Nicht erlaubt.". Jordan will think the app is broken.
- After joining it is unclear which party Jordan is in and what to do first.
- As host: "Player muss zuerst geöffnet werden" (typo "befor", `host-dashboard.html:191`) without any hint that a TV tab is meant.
- "Standard-Playlist" and "Blacklist" are jargon.
- "Startseite" in the ☰ menu leaves the host context.

**Sam (screen reader / keyboard):**
- `lang="en"` makes the screen reader mispronounce all the German text.
- ♡ is announced as "white heart suit".
- The add button, burger menu and player controls have no labels.
- The back arrows cannot be reached by keyboard.
- There are nested buttons in "Party beenden".
- The code inputs have no label and no clear focus.
- There are no live regions for vote counts, add errors, "Party nicht gefunden." or the party ending.
- The repeated `alt="Cover"` is noise.

---

## Minor Observations

- Typo "befor" (`host-dashboard.html:191`). English `alt="delete"` on the trash icon (`host-dashboard.html:147`).
- About 17 lines of inline `!important` styles on the select (`create-party.html:16-33`).
- A dead commented-out block (`host-dashboard.html:219-229`).
- `height="300px"` is invalid HTML (`startpage.html:10`, `host-dashboard.html:27`).
- `letter-spacing: 20%` is not reliably supported (`startpage.css:214`, `host-dashboard.css:450`).
- The like count is hidden at 0 (`voting-comp.html:47`).
- Unused code: `menuOpen`, `toggleMenu`, and `goToVoting` (which points to a non-existent `/vote` route) (`guest.ts:24, 133-147`).
- `voting-host.html:57` has a ♡ button with no handler. The host voting page is a dead mock.
- Roboto/Arial overrides the font token (`host-dashboard.css:429`, `startpage.css:193`).
- The PIN placeholder "12345" looks like a real code (`host-options.html:48`).
- The side menu, spinner and their CSS are copied into 3 host pages; there is no shared component.
- `home.html:1` contains a nested `<body>`.

## Questions to Consider

1. Should the TV be the party's real home, with a scoreboard, live votes and the QR code always visible? Today it is a read-only copy of the dashboard.
2. Do guests need two tabs at all? A single list could put a "+" on search results and a heart on queue entries.
3. Why does the host have to set up a blacklist before any guest has arrived? Blocking from the queue, at the moment a bad song shows up, would be more natural.
4. What should a guest *feel* when their song plays? Right now there is no "Dein Song läuft!", even though that is the payoff the whole app exists for.
