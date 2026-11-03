# UI/UX Review — MusicVoting (Web)

_Reviewed 2026-11-03. Companion to [`design-review.md`](design-review.md), which covers architecture and security._
_Basis: specs in `openspec/specs/` (guest, host, dashboard, voting, queue), Angular templates and CSS in `musicvoting/frontend/src/app/pages/`, screenshots in `hugo/content/status/screens/`. The iOS app is not covered._

## TL;DR

**The visual identity is strong and fits a party app.** The purple-to-coral gradient, white rounded cards and big album art feel modern and energetic. The guest flow (QR → vote → add) is short, and the bottom tab bar is the right navigation for two guest views.

**The UX is not optimal yet.** The biggest issues:

1. **Liking a song looks like an error.** The card fades to grey, can't be tapped again, and looks the same as a blocked song.
2. **The TV screen is designed like a desktop page**, not for viewing from across a room.
3. **The host has to understand too many concepts:** Dashboard vs. Player, Host-PIN vs. Voting-PIN vs. Code, five setup screens.
4. **Feedback is missing** for most actions: no confirmation after adding, silent vote errors, no "no results" state.
5. **Inconsistent language and a lack of accessibility basics:** "du" vs. "Sie", "Playlist" vs. "Warteschlange", `lang="en"`, icon buttons without labels, low contrast at the coral end of the gradient.

| Area | Verdict |
|---|---|
| Visual identity (colours, cards, gradient) | ✅ Strong |
| Guest navigation (bottom tabs) | ✅ Good, small layout bug |
| Guest join (QR / code input) | ✅ Good, small copy issues |
| Guest voting | 🔴 Liked state is wrong |
| Guest search & add | 🟡 Works, little feedback |
| Host setup flow | 🟡 Too many steps and concepts |
| Host dashboard | 🟡 Desktop-first, leftover controls |
| TV / player screen | 🔴 Not readable from a distance |
| Feedback & states (loading, empty, error) | 🟡 Inconsistent |
| Copy & terminology | 🟡 Inconsistent |
| Accessibility | 🔴 Basics missing |

---

## 1. Context: who uses which screen, and where

| User | Device | Situation | What they need |
|---|---|---|---|
| **Guest** | Own phone, often for the first time | Dark, loud room, one hand, maybe a drink in the other, short attention span | Join in seconds, see the queue, like with one tap, add a song in under 30 s, instant feedback |
| **Host** | Own phone (spec: "typically a phone") | Setting up before the party, then occasional control during it | Fast setup, clear first step ("start the player"), skip/remove/block quickly |
| **Everyone** | TV / monitor | 2–5 m away, glancing over | QR code, PIN, what's playing, what's next, live votes |

Every point below is judged against this context.

---

## 2. What works well ✅

- **Brand look.** The gradient plus white cards is consistent across all screens and looks good on a TV and on phones. Album art carries most of the visual weight, which is right for a music app.
- **The guest flow is short.** QR → `/join/:pin` → voting view, with no account and no name (`guest/spec.md`). Landing on the voting view first is the right call: the queue is what guests want to see.
- **Bottom tab bar "Voten / Hinzufügen".** Thumb-friendly, always visible, the active tab is clearly filled. Replacing the burger menu was a good decision.
- **Code input with 5 digit boxes** plus "Code aus Zwischenablage einfügen". This is a familiar pattern (like a 2FA code) and handles the "someone sent me the code" case.
- **Search results mark songs that are already queued** (check icon instead of +), which prevents useless duplicate attempts.
- **Big touch targets.** The vote and add buttons are about 60 px circles, well above the 44 px minimum.
- **Default-playlist screen** explains *why* it exists ("Wenn die Warteschlange leer wird …") and offers a clear skip button.
- **Blacklist setup** (from the spec): search while typing, "Weiter" disabled until something is added, skippable. These are good, forgiving interaction choices.
- **The TV shows the QR code permanently** with a call to action ("QR-Code scannen & mitmachen"). This is the most important onboarding element for guests.

---

## 3. Problems and recommendations

### 🔴 3.1 Liking a song looks like an error (guest voting)

`voting-comp.css:235`:

```css
.track-card.voted { opacity: 0.5; pointer-events: none; filter: grayscale(1); }
```

- After a like, the **whole card fades to grey**. Grey is the universal signal for "disabled" or "not available". The same look is used for blacklisted songs (`guest.css:355`).
- `pointer-events: none` makes the card and **its heart button untappable**, so a guest can't take back a like. `voting/spec.md` requires likes to be togglable.
- The like count only updates after the server answers (`voting-comp.ts:74`), so the tap feels laggy at a busy party with poor Wi-Fi. The spec requires an optimistic update.
- A failed vote is only logged with `console.error`, so the guest sees nothing.

**Recommendation:**
- A liked card stays at full colour. The heart becomes filled in the accent colour (`#8403A6`) and the button background gets a little stronger. Optionally add a light tint or a coloured left border.
- Give the heart a short "pop" animation (scale 1 → 1.3 → 1) on tap. That is the main reward moment of the app.
- Update the count immediately, and revert with a short toast ("Hat nicht geklappt, bitte nochmal") on error.
- Use grey **only** for "not possible" (blocked songs, disabled buttons).

### 🔴 3.2 The TV screen isn't built for distance (startpage)

Screenshot `startpage.png`, CSS `startpage.css`:

| Problem | Detail |
|---|---|
| Text too small | Queue titles 15 px, artists 12 px (`startpage.css:145/149`). These are unreadable from 3 m on a 1080p TV. |
| QR code too small | About 150 px. Phones scan more reliably from a distance with a larger code. |
| **No like counts** | `dashboard/spec.md` requires a like count per entry. The likes are the "game" of the app, and the TV is the only place everyone sees them. |
| Rank on top of album art | The number "1, 2, 3" is drawn over the cover. Contrast depends on the cover and is poor on light covers (Queen, Dua Lipa). |
| 3-column grid | Reads left-to-right, then down. Ranking is hard to follow, and movement after a vote isn't noticeable. |
| Empty "now playing" card | "Playlist nicht gestartet" next to a large grey music note looks broken. It also says "Der Host kann den ersten Song im Dashboard starten", but guests can't act on that. |
| Crown emoji overflows the PIN card | Visible in both `startpage.png` and `dashboard.png`. |
| Mixed labels | "Voting-PIN" here, "Code" on the join screen. |

**Recommendation: a "chart" layout.**

```
┌───────────────────────────────────────────┬─────────────────────┐
│  [ big cover ]  NOW PLAYING               │   ┌─────────────┐   │
│                 Get Lucky                 │   │  QR (≥300px)│   │
│                 Daft Punk                 │   └─────────────┘   │
│                 ████████░░░░  2:14 / 6:09 │   Code: 2 3 7 2 5   │
├───────────────────────────────────────────┤   Scannen & voten!  │
│  1  [cov] Bohemian Rhapsody · Queen   ♥ 4 │                     │
│  2  [cov] Someone Like You · Adele    ♥ 2 │                     │
│  3  [cov] Fix You · Coldplay          ♥ 1 │                     │
│  4  [cov] Training Season · Dua Lipa  ♥ 0 │                     │
└───────────────────────────────────────────┴─────────────────────┘
```

- One vertical list, with the rank in its own column (not on the cover), and the ♥ count right-aligned and large.
- Use fluid type sizes such as `font-size: clamp(1.5rem, 2.2vw, 3rem)` for titles, so the layout scales from laptop to TV.
- Animate reordering, for example with the View Transitions API or Angular animations, so a guest who likes a song *sees* it climb. That makes the voting visible and fun.
- Before the first song: show a friendly "Gleich geht's los 🎶" state with the QR code even larger, instead of an empty player.
- Consider a **dark variant for the TV**. At night a bright white card on a TV lights up the room.

### 🟡 3.3 The host has too many concepts and steps

**Host options screen** (`host-options.png`) offers "Party erstellen", "Dashboard öffnen (Pin erforderlich)" and "Player öffnen (per PIN)". A first-time host doesn't know:
- the difference between Dashboard (controls, on the phone) and Player (audio, on the TV)
- which PIN they need. There are **four names for two codes**: "Code", "Voting-PIN", "Host-PIN", "Pin".

**Setup flow:** Home → Host options → Create party (choose provider) → Spotify login → Default playlist → Blacklist → Dashboard → "Player öffnen". That is **seven steps before music plays**, and the most important step (opening the player on the TV) comes last and is easy to miss. The host dashboard has to show "Player muss zuerst geöffnet werden" as a fix.

**Recommendations:**
- **Name the two codes once and use those names everywhere**, e.g. **"Party-Code"** (for guests) and **"Host-Code"** (secret).
- **Provider:** while YouTube isn't implemented, the dropdown has one real option, so it is an extra decision with no value. Use two large provider tiles (Spotify / YouTube "bald verfügbar"), or skip the step.
- **Show the TV step as part of setup**, not as a hint afterwards: "Öffne jetzt auf dem Fernseher **musicvoting…/tv** und gib den Host-Code ein" with a live check that turns green when the player connects (`deviceActive`).
- Show a **progress indicator** in setup (e.g. "Schritt 2 von 4") so default playlist and blacklist feel optional and short.
- On the host options screen, explain the three choices by *situation*, not by technical name: "Neue Party starten", "Meine Party steuern", "Diesen Bildschirm als Musik-Player nutzen".

### 🟡 3.4 Host dashboard is desktop-first, with leftovers

Screenshot `dashboard.png`:
- The host's main device is a phone, but the screenshot is a wide desktop layout with a 3-column queue. **Design mobile-first**: now playing + controls on top, then the queue as a list with swipe-to-remove, or a "⋯" menu with "Entfernen" and "Song sperren".
- A **⏮ "previous" button** exists although no spec defines it, and played songs are deleted from the queue. Remove it so the controls only promise what works.
- **Burger menu (☰)** in the top left, while the guest side removed burger navigation. Use the same pattern on both sides (e.g. bottom tabs "Steuern / Voten / Suchen").
- **Trash icons are always visible** next to every song. A tap removes the song for everyone, so there should be a short undo snackbar ("Song entfernt · Rückgängig").
- "Player öffnen" card: cramped text and a typo ("befor" → "**bevor**").
- "Party beenden" sits next to everyday actions. Keep the confirmation dialog, and visually separate it (e.g. at the bottom of a settings section).

### 🟡 3.5 Missing feedback and states

| Situation | Current | Recommendation |
|---|---|---|
| Guest adds a song | + changes to ✓, nothing else | Toast: "Hinzugefügt · Platz 5 in der Warteschlange" with a link to the voting tab |
| Song is blocked | Card at 50 % opacity, **no hint on purpose** (`guest.css:353`) | A greyed card with no explanation looks like a bug. A small "Nicht verfügbar" label is neutral and doesn't reveal the blacklist rule. |
| Search returns nothing | `@empty` shows nothing when a query is typed (`guest.html`) | "Keine Songs gefunden für „…“" |
| Search is loading | No visible indicator | Skeleton rows or a small spinner in the search field |
| Vote fails | `console.error` only | Revert + toast (see 3.1) |
| Rate limit hit | Spec message "Zu viele Anfragen — bitte kurz warten." | Show it as a toast, not as a paragraph that pushes the list down |
| Lost connection | Nothing | Small banner "Verbindung wird wiederhergestellt …", then reload |
| Party ended | "Die Party ist beendet." (spec) | Good. Add a "Zur Startseite" button and a friendly thank-you. |

A shared **toast/snackbar component** solves most of these at once.

### 🟡 3.6 Guest voting & search details

- **The bottom tab bar covers the last list items** (`guest-search.png`: "Get Lucky (Radio Edit)" and "Veridis Quo" are behind the bar). Add `padding-bottom` equal to the bar height plus `env(safe-area-inset-bottom)` to the list.
- **Only the first artist is shown** (`track.artists[0]?.name`). For songs with features, show all artists joined with ", " and let the line truncate. In the screenshot, "Daft Punk — Pentatonix" is confusing without context.
- **"In Playlist suchen…"** on the voting tab: the app calls it "Warteschlange" everywhere else. Use "In Warteschlange suchen…". It is also worth asking whether search is needed on the voting tab at all. With usually fewer than 30 songs, scrolling may be enough, and the screen would have more room for the list.
- **Now playing is mixed into the voting list** (with a soundwave instead of a heart). Make it a separate, compact "Läuft gerade" header above the list. Guests can then see at a glance what's playing and what they can vote on.
- **Show the guest their own impact**: e.g. a small "Von dir" badge, visible only to the person who added the song, or a counter "Du hast 3 Songs geliked". This is allowed by the spec, because only the *dashboard* must not attribute songs.
- **Headlines** "Vote für deine Lieblingssongs!" and "Suche nach deinen Lieblingssongs!" take about 15 % of the screen on every visit. After the first visit, a smaller title (or the party name) leaves more space for the list.

### 🟡 3.7 Copy and terminology

| Issue | Where | Fix |
|---|---|---|
| "Sie" vs. "du" | Code input: "Geben **Sie** den Code ein"; everywhere else "du" | Use "du" everywhere. It fits a party. |
| Playlist / Warteschlange / Queue | Voting search placeholder, startpage "Playlist nicht gestartet" | "Warteschlange" for the queue, "Playlist" only for Spotify playlists |
| Code / PIN / Voting-PIN / Host-PIN / Pin | Code input, startpage, dashboard, host options | "Party-Code" / "Host-Code" (see 3.3) |
| Typo "befor" | Host dashboard player card | "bevor" |
| Mixed button capitalisation and letter-spacing | Home buttons have wide letter-spacing, others don't | One button style (see 3.9) |

Write a short **glossary** (5–10 terms) into `openspec/` so specs, web and iOS use the same words.

### 🔴 3.8 Accessibility basics

| Issue | Where | Fix |
|---|---|---|
| `<html lang="en">` for a German app | `src/index.html:2` | `lang="de"`. Screen readers otherwise read German with English pronunciation. |
| Icon-only buttons have no label | ♡ vote button, + add button, trash, play/pause/skip | `aria-label="Gefällt mir"`, `"Zur Warteschlange hinzufügen"`, `"Entfernen"` … and `aria-pressed` on the heart |
| Back arrows are `<div (click)>` | `create-party.html:3`, `host-options.html:3` (code-input already has `role="button"`) | Use `<button>`. A div isn't keyboard-focusable. |
| Only 2 `aria-*` attributes in the whole app | all templates | Add labels along with the fixes above |
| Cover `alt="Cover"` | every list | Decorative, so use `alt=""`. Otherwise every row is read as "Cover". |
| Low contrast at the coral end of the gradient | White text on about `#E8505B` ≈ 3.7 : 1; semi-transparent subtitles even lower | Fails WCAG AA for body text (4.5 : 1). Darken the lower gradient stop slightly, or use bold/large text there only. |
| Colour-only state | Liked vs. not liked, blocked | Heart shape changes (♡/♥), which is good. Blocked needs a text label (see 3.5). |
| Motion | Soundwave, planned reorder animation | Respect `prefers-reduced-motion`. |

These fixes are cheap, and accessibility is often a grading criterion for school projects.

### 🟡 3.9 Missing design system

- Each page has its own CSS (about 4,200 lines). The same purple appears as `#8403A6`, `#8b00a5`, `#6a0089` and `#C826B8`, and there are three different reds for errors.
- The song row is implemented about six times (voting, guest search, host voting, host search, TV queue, blacklist), with slightly different sizes and spacing. That explains why the TV queue cards and the host queue cards look different.
- Three button styles are visible on the screenshots: grey pill (home, create party), outline pill (code input, skip), and card-buttons (host options).

**Recommendation:** define tokens in `styles.css` and build a few shared components.

```css
:root {
  --c-primary: #8403A6;   --c-accent: #F2594B;   --c-danger: #C0392B;
  --c-surface: #ffffff;   --c-text: #111;         --c-text-muted: #666;
  --gradient-bg: linear-gradient(135deg, var(--c-primary), var(--c-accent));
  --radius-card: 24px;    --radius-pill: 999px;
  --shadow-card: 0 4px 16px rgb(0 0 0 / .08);
  --space-1: 4px; --space-2: 8px; --space-3: 16px; --space-4: 24px;
}
```

Shared components: `<app-track-row>` (inputs: `rank`, `likes`, `action: 'vote' | 'add' | 'remove'`, `state: 'normal' | 'liked' | 'queued' | 'blocked'`), `<app-button variant="primary|secondary|danger">`, `<app-toast>`, `<app-page-header>`. Every visual fix above then only has to be made once.

### 🟢 3.10 Smaller notes

- **Home screen:** both buttons are grey on the gradient and have equal weight. Most visitors who come *here* are hosts, because guests arrive via QR straight to `/join/:pin`. Make "Party starten" the primary (white, filled) button and "Party beitreten" secondary. The lower half of the screen is empty; a short "So funktioniert's" in 3 steps (icons) would fill it with useful content.
- **Code input:** auto-advance between boxes and auto-submit on the 5th digit, like the iOS version (`host/spec.md`), plus `inputmode="numeric"` for the number keypad. The large empty space above the title could be reduced so the keyboard doesn't push the boxes off-screen.
- **Select playlist:** this screen has no back arrow (all other setup screens do), and its title is left-aligned while the others are centred. Show a short selected state or a spinner after tapping a playlist, because the save request takes a moment.
- **Dark mode for guests:** at a party the room is dark, and a mostly white card list at full brightness is glaring. A dark theme (cards `#1c1c24`, gradient only in the header) would fit the setting. With the tokens from 3.9 this is mostly a second set of variables plus `prefers-color-scheme`.
- **Haptics** (`navigator.vibrate(10)` on like/add, on supported Android browsers) give a tactile "it worked" in a loud room.

---

## 4. Recommended order of work

| # | What | Effort | Impact |
|---|---|---|---|
| 1 | Fix liked state (full colour, togglable, optimistic, heart animation) | S | Core guest interaction; spec compliance |
| 2 | Accessibility basics (`lang="de"`, aria-labels, `<button>` back arrows, `alt=""`) | S | Cheap, visible quality gain |
| 3 | List padding under the tab bar, "no results" state, copy fixes ("du", "bevor", terminology) | S | Removes visible bugs |
| 4 | Toast component + feedback for add / vote error / rate limit / reconnect | M | Guests always know what happened |
| 5 | Design tokens + `<app-track-row>` + one button component | M | Consistency; makes 6–7 cheaper |
| 6 | TV chart layout: vertical list, like counts, big QR, fluid type, reorder animation | M | Most visible screen at the party |
| 7 | Host flow: unified code names, TV step inside setup with live check, step indicator | M | Hosts get to music faster with fewer support questions |
| 8 | Mobile-first host dashboard, remove ⏮, undo for remove | M | The host's main device is a phone |
| 9 | Dark theme (guest + TV) | M | Fits the party setting |

Items 1 (togglable, optimistic likes) and 6 (like counts on the TV) fix spec deviations. Each item should go through its own OpenSpec change in `openspec/changes/<name>/` (`ai/ARBEITSREGELN.md` §1). Item 6 also changes the screenshots in the presentation (§6).
