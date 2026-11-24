---
name: MusicVoting
description: The party decides the music together: a dark stage lit in purple and coral, shared between the TV, the host and every guest's phone.
colors:
  stage-purple: "#8403A6"
  stage-purple-deep: "#5A0272"
  coral: "#F2594B"
  coral-deep: "#C8392C"
  coral-light: "#FF9A8F"
  stage-night: "#12061A"
  stage-raised: "#1F0D2A"
  on-stage: "#FBF4FF"
  on-stage-muted: "#C9B6D4"
  stage-card: "rgba(18, 6, 26, 0.72)"
  stage-row: "rgba(18, 6, 26, 0.6)"
  stage-bar: "rgba(18, 6, 26, 0.82)"
  stage-tint: "rgba(251, 244, 255, 0.1)"
  stage-highlight: "rgba(132, 3, 166, 0.5)"
  stage-liked: "rgba(242, 89, 75, 0.22)"
  light-stage: "#FAF6FC"
  light-ink: "#1D0A24"
  light-ink-muted: "#4E3D56"
  light-accent: "#80231A"
  danger: "#B3261E"
  success: "#1E7B4A"
  on-accent: "#FFFFFF"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(3rem, 12vw, 6rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2rem)"
    fontWeight: 750
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2.2vw, 1.75rem)"
    fontWeight: 750
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Bricolage Grotesque Variable, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  sm: "10px"
  row: "14px"
  card: "16px"
  panel: "20px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
components:
  button-primary:
    backgroundColor: "{colors.stage-purple}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.stage-purple-deep}"
  button-secondary:
    backgroundColor: "{colors.stage-tint}"
    textColor: "{colors.on-stage}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  button-large:
    backgroundColor: "{colors.stage-purple}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "56px"
    width: "100%"
  icon-button:
    backgroundColor: "{colors.stage-tint}"
    textColor: "{colors.on-stage}"
    rounded: "{rounded.pill}"
    size: "44px"
  icon-button-play:
    backgroundColor: "{colors.stage-purple}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    size: "60px"
  input-search:
    backgroundColor: "{colors.stage-tint}"
    textColor: "{colors.on-stage}"
    rounded: "{rounded.card}"
    padding: "0 16px 0 44px"
    height: "48px"
  card:
    backgroundColor: "{colors.stage-card}"
    textColor: "{colors.on-stage}"
    rounded: "{rounded.panel}"
    padding: "clamp(16px, 2vw, 24px)"
  queue-row:
    backgroundColor: "{colors.stage-row}"
    textColor: "{colors.on-stage}"
    rounded: "{rounded.card}"
    padding: "8px 12px"
  queue-row-liked:
    backgroundColor: "{colors.stage-liked}"
  top-bar:
    backgroundColor: "{colors.stage-bar}"
    textColor: "{colors.on-stage}"
    padding: "12px clamp(16px, 3vw, 40px)"
---

# Design System: MusicVoting

## Overview

**Creative North Star: "Die Bühne im Wohnzimmer"** (the stage in the living room)

MusicVoting turns a private party's living room into a small stage. Every surface (the TV across the room, the host's laptop, each guest's phone) is the same dark stage, lit from behind by soft purple and coral light, as if a party lamp stood in the corner. The music is what the light falls on: covers, titles, ranks and hearts sit in front, everything else steps back into the dark.

The system is calm, not clubby. It has to suit a loud birthday and a cosy evening with family alike, so the light is a blurred glow, never a hard gradient fill. Density follows the viewing distance: the TV is built for the sofa (type in `vh`, five rows, a QR code you can scan from metres away), the phone for one thumb (44 px targets, actions at the bottom), the host pages for a quick glance between dances. A light mode exists for every surface and swaps only tokens; the stage stays the same stage.

Rejected directions, confirmed by the team on 2026-11-03: a light TV, a full-screen brand gradient and a muted gradient. The dark stage with the brand light as glow won.

**Key Characteristics:**
- One dark stage (`#12061A`) for every page, with a blurred purple/coral glow behind it.
- Translucent dark cards and rows in front of the glow; no hard borders, only a 1 px inner tint line.
- One variable typeface (Bricolage Grotesque) for everything, from TV display to small labels.
- Colour is scarce: purple for the one main action and the current item, coral for likes.
- Pills and soft corners everywhere; nothing sharp, nothing glossy.
- Light mode swaps tokens only; contrast is guaranteed by a token test.

## Colors

A night-dark base lit by the two binding brand colours, Stage Purple and Coral, used as light, not as paint.

### Primary
- **Stage Purple** (#8403A6): the one main action per screen (primary and large buttons, the play button), the highlight of the current or next song, the active navigation entry, focus rings, text selection. Deepens to Stage Purple Deep (#5A0272) on hover.

### Secondary
- **Coral** (#F2594B): the colour of liking. Hearts, like counts, the liked-row wash (`stage-liked`) and the warm half of the glow. Plain coral only reaches about 2.3:1 on the purple glow, so coral *text* on the dark stage uses **Coral Light** (#FF9A8F), and coral behind white text uses **Coral Deep** (#C8392C).

### Neutral
- **Stage Night** (#12061A): the stage itself, behind every page.
- **Stage Raised** (#1F0D2A): panels that float above the stage (slide-in menu, confirmation popovers).
- **On Stage** (#FBF4FF): primary text on the dark stage, a faint violet white.
- **On Stage Muted** (#C9B6D4): secondary text (artists, hints, labels).
- **Stage Card / Row / Bar** (translucent Stage Night at 0.72 / 0.6 / 0.82): cards, list rows and the sticky top bar. Translucent so the glow shines through, dense enough that they read as clear boxes.
- **Stage Tint** (On Stage at 0.06–0.22): inner edges, quiet buttons, hover states, input backgrounds.
- **Light mode** swaps the stage to **Light Stage** (#FAF6FC), text to **Light Ink** (#1D0A24) and **Light Ink Muted** (#4E3D56), accent text to **Light Accent** (#80231A), cards to white.
- **Danger** (#B3261E) for destructive confirmations ("Party beenden", "Entfernen und sperren"); **Success** (#1E7B4A) is reserved for confirmations.

### Named Rules
**The Light, Not Paint Rule.** The brand gradient is only ever light behind the stage (blurred radial glows) or the fill of a large tile without small text. Never a full-page background, never gradient-clipped text.

**The One Purple Rule.** Each screen has at most one filled purple button. If two actions compete, the second becomes a secondary (tinted) button.

**The Coral Means Love Rule.** Coral marks likes and nothing else that looks interactive; a coral element the guest can tap is always a heart.

## Typography

**Display Font:** Bricolage Grotesque Variable (with Segoe UI, system-ui, sans-serif)
**Body Font:** Bricolage Grotesque Variable (same family; optical sizing does the work)

**Character:** One friendly grotesque with a bit of ink-trap personality. Heavy weights (750–800) make the wordmark and TV titles feel like a poster; regular weights stay quiet in lists.

### Hierarchy
- **Display** (800, clamp(3rem, 12vw, 6rem), line-height 1, -0.03em): the "MusicVoting" wordmark on the landing page. On the TV the current song title takes this role at 6.2vh, weight 750.
- **Headline** (750, clamp(1.5rem, 4vw, 2rem), -0.01em): step headings of entry and setup pages.
- **Title** (750, clamp(1.25rem, 2.2vw, 1.75rem), -0.01em): the page title in the sticky top bar; card titles at 1.25rem / 700.
- **Body** (400, 1rem, line-height 1.5): running text; leads at 1.0625rem in On Stage Muted. Song titles in rows at 1.0625rem / 700, artists at 0.9375rem muted.
- **Label** (700, 0.8125rem, 0.04em, uppercase): small group labels such as "KÜNSTLER" / "SONGS" in the blocklist results and kind chips.
- **Numbers** (PINs, likes, ranks): tabular figures (`font-variant-numeric: tabular-nums`), PINs with 0.04–0.06em tracking.

### Named Rules
**The Sofa Rule.** TV text is sized in `vh`, scaled for 1080p: queue titles and likes ≥ 32px, the current title ≥ 48px. Nothing on the TV is smaller than what can be read from the sofa.

**The Plain Title Rule.** Page titles name the place ("Warteschlange", "Dashboard", "Blocklist"), not a slogan.

## Layout

- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 px (`--mv-space-1` … `-7`). Page padding is fluid, clamp(16px, 3vw, 40px).
- **Sticky top bar** on every page except the TV: page title (and, for guests, "Party 12345 · Party verlassen" below it) on the left, the icon-only light-mode toggle on the right. On the landing page below 600 px the logo takes the left side.
- **Host pages:** below 1024 px a burger opens a slide-in panel; from 1024 px the same navigation is a fixed 220 px side rail (`--mv-host-rail-width`) and the page shifts right. The panel and rail show the logo and a "Party läuft · <Voting-PIN>" badge. The dashboard is the only host view of the queue and uses two columns (now playing and the queue card left, whose search field works like the guest page: results replace the queue while it holds text; a 280–360 px side column with join, party actions and Gastgeber-PIN), collapsing to one column below 900 px. Queue rows keep rank, likes, the host's like button and "Song entfernen" on phones; the cover shrinks to 40 px instead.
- **Entry and setup pages** share one narrow column (max 34rem) so they read as steps of one flow.
- **Search fields** (guest page and dashboard) show a round "x" ("Suche leeren") while they hold text; it empties the field and closes the results in one tap.
- **Guests have one page** (`/voting`), a single column: now-playing bar, a search field, then the queue. While the field holds text, search results labelled "Suchergebnisse" replace the queue; a queued result shows its likes and heart, any other a "+". There is no tab bar; the toast sits at the bottom in the thumb zone, respecting the safe area.
- **TV (1920×1080):** now playing (large cover ≥ 40% of the screen height, title, progress) on the left; join block (QR ≥ 25% of the height, Voting-PIN) and "Als Nächstes" (top 5 plus "+ N weitere") on the right; footer with logo, wordmark and "powered by HTL Leonding". When the party is empty, the join block takes the whole right column.

## Elevation & Depth

Depth comes from light and translucency, not from shadows. The stage is the bottom layer; the glow sits fixed behind it (`filter: blur(30px)`); cards and rows are translucent dark layers in front, separated by a 1 px inner tint line (`inset 0 0 0 1px`). Only things that float above the page (slide-in menu, confirmation popovers, the now-playing cover) get a real shadow.

### Shadow Vocabulary
- **Inner edge** (`box-shadow: inset 0 0 0 1px var(--mv-stage-tint-1)`): every row and card; replaces borders.
- **Floating panel** (`box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45)`): confirmation popovers such as "Party wirklich verlassen?".
- **Slide-in menu** (`box-shadow: 4px 0 32px rgba(0, 0, 0, 0.5)`): the host burger panel below 1024 px.
- **Cover lift** (`box-shadow: 0 30px 80px var(--mv-stage-shadow), 0 8px 24px var(--mv-glow-brand)`): the now-playing cover on TV and dashboard, lifted towards the light.
- **Logo glow** (`filter: var(--mv-glow-logo)`, a faint white `drop-shadow`, `none` in light mode): the TV logo, so its dark-violet segment stays visible on the dark stage.

### Named Rules
**The Glow Behind, Never Inside Rule.** The glow lives only behind the stage. The TV gets corner glows but no centre glow (it would fill the whole screen); host and guest pages get the softer centre glow so their dark cards do not sink into black.

## Shapes

Soft and round throughout. Buttons and chips are pills (999px); the theme toggle is a 44px circle. Cards use 20px corners, rows 14–16px, inputs 16px, small elements (menu entries, error banners) 10px. Icon buttons are circles (44px, 60px for play/pause). Covers are rounded squares; artist images are circles. There are no hard borders and no sharp corners anywhere.

## Components

Soft, tactile and calm (weich, griffig, ruhig): every control is easy to hit, and colour is saved for the one action that matters.

### Buttons
- **Shape:** pill (999px), at least 44px high; large step buttons are full width and 56px high.
- **Primary:** Stage Purple fill, white bold text. One per screen.
- **Secondary:** translucent tint (On Stage at 0.1) with On Stage text; hover raises the tint to 0.22.
- **Danger:** Danger red fill, white text, only inside confirmations.
- **Icon buttons:** 44px circles with a tint fill; the play/pause button is a 60px Stage Purple circle; active state scales to 0.94.
- **Disabled:** 45–50% opacity and `not-allowed` cursor, never hidden.
- **Focus:** `--mv-focus-ring` (2px white halo plus 3px Stage Purple), visible on light, dark and glow.

### Chips
- **Kind chips** on blocklist entries ("Wort", "Künstler", "Song"): small pills, label type, purple wash for words, coral wash for artists, neutral tint for songs.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** Stage Card (translucent Stage Night 0.72), white at 0.82 in light mode.
- **Shadow Strategy:** inner edge only (see Elevation).
- **Internal Padding:** clamp(16px, 2vw, 24px).

### Inputs / Fields
- **Style:** 48–52px high, 16px corners, 1px tint border, tint background, search icon inset at 14px.
- **Focus:** border brightens to `tint-strong` and the focus ring appears.
- **Placeholder:** On Stage Muted, phrased as the content expected ("Wort, Künstler oder Song").

### Navigation
- **Host:** burger plus slide-in panel below 1024px, fixed side rail with icon and text from 1024px; the current page has a purple wash and `aria-current="page"`.
- **Guests:** none; queue and search share one page.

### Queue Row (signature component)
The heart of the product, used on phone, dashboard and TV: rank number, rounded cover, title and artist (truncated with ellipsis), then the like count and a 44px heart. A liked row gets the coral wash and a coral edge; the next song gets the purple highlight. On the TV, rows slide to their new position when the order changes (FLIP), and a changed like count pulses once (600 ms, accent colour); under reduced motion rows switch without movement and the count only changes colour.

### Cover
One shared component (`mv-cover`) for every album image: when the image is missing or fails, it shows a dark brand tile with a line-drawn note, never a light placeholder. Covers are decorative (`alt=""`).

### Toast
Confirmations at the bottom of the page for about 1.5 seconds ("Song hinzugefügt – Platz 3", "Geliked – jetzt auf Platz 2"): a filled Stage Purple card with a round icon badge (check or heart) and bold 1.0625rem text, so they are noticed at a glance. No action button; the guest already sees the queue. Errors use the same place in the danger colour (at least 4.5:1 contrast) and stay about 4 seconds.

## Do's and Don'ts

### Do:
- **Do** take every colour from the `--mv-*` tokens in `src/styles.css`; light mode works only because components never hard-code colours.
- **Do** keep one filled Stage Purple button per screen and make every other action secondary.
- **Do** use Coral Light (#FF9A8F) for coral text on the dark stage and Light Accent (#80231A) in light mode.
- **Do** place new text only on surfaces covered by `shared/contrast.tokens.spec.ts` (glow, stage card, row, bar), or extend that test.
- **Do** keep touch targets at 44px or more and guest actions in the lower half of the screen.
- **Do** size TV text in `vh` so it stays readable from the sofa at any screen size.
- **Do** give every motion a reduced-motion fallback; the global rule in `styles.css` already zeroes the duration tokens.
- **Do** serve images close to their display size (e.g. `assets/img/logo-mark.png`, `htl-leonding-logo-480.jpg`).

### Don't:
- **Don't** fill a page or the TV with the brand gradient, and don't clip a gradient into text (rejected 2026-11-03).
- **Don't** put the centre glow on the TV.
- **Don't** use plain coral (#F2594B) for small text on the dark stage; it fails contrast.
- **Don't** add hard borders or sharp corners; separate layers with translucency and the 1px inner edge.
- **Don't** show the Gastgeber-PIN openly on any screen the room can see; it stays masked on the dashboard and never appears on the TV.
- **Don't** credit guests on the shared screen or tell a guest why a song is blocked.
- **Don't** put the "powered by HTL Leonding" credit anywhere except the TV footer and the landing page.
