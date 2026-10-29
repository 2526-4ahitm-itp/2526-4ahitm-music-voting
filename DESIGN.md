---
name: MusicVoting
description: The crowd picks the music. Velvet Plum to Neon Coral, thumb-sized, readable in a dark room.
colors:
  primary: "#8403a6"
  primary-hover: "#c826b8"
  primary-pressed: "#6a0089"
  primary-deep: "#5c0070"
  plum-night: "#510273"
  primary-tint: "#f3e8ff"
  primary-tint-soft: "#fdfaff"
  accent: "#f2594b"
  accent-pressed: "#d8455f"
  accent-tint: "#ffd0cc"
  danger: "#ff3b30"
  surface: "#ffffff"
  surface-subtle: "#f9f9f9"
  surface-muted: "#f1f5f9"
  bg: "#f0f2f5"
  divider: "#eeeeee"
  border: "#e2e8f0"
  border-strong: "#cbd5e1"
  text: "#111111"
  text-secondary: "#333333"
  text-muted: "#666666"
  text-subtle: "#888888"
  text-placeholder: "#94a3b8"
typography:
  display:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "10rem"
    fontWeight: 700
    lineHeight: 1
  headline:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "2.4rem"
    fontWeight: 800
    letterSpacing: "-0.03rem"
  title:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "1.8rem"
    fontWeight: 700
  body:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
  body-strong:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "1.06rem"
    fontWeight: 700
  label:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    letterSpacing: "0.05em"
  numeral:
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    fontSize: "38px"
    fontWeight: 800
    letterSpacing: "20%"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1.25rem"
  xl: "2rem"
  pill: "30px"
  round: "50%"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.xl}"
    padding: "0.75rem 2rem"
  button-pill-hover:
    textColor: "{colors.primary}"
  button-vote:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.primary}"
    rounded: "{rounded.round}"
    size: "3.25rem"
  button-vote-liked:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.round}"
    size: "3.25rem"
  toast:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.875rem 1rem"
  track-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  track-card-hover:
    backgroundColor: "{colors.primary-tint-soft}"
  input-search:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem 0.75rem 3rem"
  bottom-nav-tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    height: "4rem"
  bottom-nav-tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
  bottom-nav-tab-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.surface}"
---

# Design System: MusicVoting

## Overview

**Creative North Star: "The Glowing Wristband"**

MusicVoting looks like the festival wristband on a guest's arm: one loud, unmistakable brand band, compact enough to live on a phone, and always within thumb's reach. The Velvet Plum to Neon Coral gradient is that band. It fills the whole background of every screen, on the web and in the iOS app, so the moment someone sees the colors on the TV or a friend's phone, they know which party app it is.

On top of the band, surfaces float as light: translucent white glass panels for setup and choices, and solid white cards only where something has to be read fast, such as the queue, a song, or the PIN. Controls are chunky and thumb-first: big pills, round like buttons and a tall bottom tab bar, made to be hit with one thumb, in the dark, with a drink in the other hand. The TV player is the same wristband scaled up: huge type, the current song, the queue, and the PIN and QR code readable from across the room.

The system is deliberately small: one gradient, one purple family, one coral, white, and a short grey ramp. Personality comes from the band and from scale, not from many colors or ornaments.

**Key Characteristics:**
- Full-bleed Velvet Plum → Neon Coral gradient as the base of every screen.
- Glass on light: translucent white panels by default, solid white where content must be read.
- Chunky, thumb-first controls: pills, 52px round like buttons, a 64px bottom tab bar.
- Heavy, tight headlines in white directly on the gradient.
- Built for a dark room on the phone and for distance on the TV.
- The „powered by HTL Leonding“ mark stays on the TV player and the host view.

## Colors

One saturated band (plum to coral) carries the identity; everything on top of it is white glass, white cards and a quiet grey ramp.

### Primary
- **Velvet Plum** (#8403a6): the brand purple. Start of the brand gradient, the active bottom tab, like counts, now-playing indicators, focus borders and every place that says "this is MusicVoting".
- **Velvet Plum Glow** (#c826b8): hover state of plum buttons on the host view.
- **Velvet Plum Pressed** (#6a0089): pressed state of plum controls (bottom tab, plum buttons).
- **Velvet Plum Deep** (#5c0070): darkest edge accent on plum surfaces.
- **Plum Night** (#510273): the deep brand shade. Start color of the iOS three-stop gradient (Plum Night → Velvet Plum → Neon Coral). Canonical on both platforms and reserved for the darkest brand moments, such as a future dark mode. The web does not define it as a token yet.
- **Plum Mist** (#f3e8ff): pale plum fill behind the round like button and the start of the soft tint gradient.
- **Plum Whisper** (#fdfaff): hover fill of track cards.

### Secondary
- **Neon Coral** (#f2594b): end of the brand gradient and the warm accent. Used sparingly on its own, e.g. for coral outlines and highlights on the host view. iOS uses #f2593f for the same role.
- **Coral Pressed** (#d8455f): pressed state of coral controls.
- **Coral Blush** (#ffd0cc): soft coral text and fills on the gradient.

### Neutral
- **Signal Red** (#ff3b30): errors and destructive actions, e.g. invalid PIN, „Party beenden“.
- **Paper White** (#ffffff): cards, text on the gradient, the inactive bottom tab.
- **Mist Grey** (#f9f9f9): search field fill, subtle surfaces.
- **Cool Mist** (#f1f5f9): muted surfaces on host pages.
- **Cloud Grey** (#f0f2f5): page background where the gradient is not shown.
- **Hairline** (#eeeeee): dividers and image placeholders.
- **Slate Border** (#e2e8f0) / **Slate Border Strong** (#cbd5e1): input and card borders.
- **Ink** (#111111): primary text on white.
- **Graphite** (#333333), **Ash** (#666666), **Smoke** (#888888): secondary, muted and subtle text.
- **Slate Placeholder** (#94a3b8): placeholder text and search icon.

### Named Rules
**The One Band Rule.** The brand gradient (135°, Velvet Plum → Neon Coral) is the background of a screen, never a decoration on a component. One band per screen, full-bleed.

**The Plum Speaks Rule.** Solid Velvet Plum marks the one active or primary thing in view: the active tab, the like count, the now-playing song. If two things are plum, one of them is wrong.

**The Token Rule.** Page stylesheets never write hex values. Every color comes from a `--color-…` or `--gradient-…` token in `src/styles.css`; brand transparency uses `rgba(var(--color-primary-rgb), a)`.

## Typography

**Display Font:** Segoe UI (with Tahoma, Geneva, Verdana, sans-serif)
**Body Font:** Segoe UI (same stack)

**Character:** one humanist sans for everything, set heavy and tight for headlines and plain for body text. The stack only resolves to Segoe UI on Windows; macOS falls back to Geneva and iPhones to Verdana, so the real look differs per device. This is known drift, not intent.

### Hierarchy
- **Display** (700, 10rem → 6rem → 3rem across breakpoints, line-height 1): the „MusicVoting“ wordmark on the home page only.
- **Headline** (800, 2rem–2.4rem, -0.03rem tracking): page titles in white on the gradient, e.g. „Vote für deine Lieblingssongs!“.
- **Title** (700, 1.8rem–2.5rem): section headings („Warteschlange“) and the current song title on host view and TV.
- **Body** (400, 1rem): explanations, subtitles, artist names (0.875rem in lists).
- **Body Strong** (700, 1.06rem, single line with ellipsis): song titles in track cards.
- **Label** (600, 1rem–1.15rem, 0.03–0.05em tracking): pill buttons and bottom tabs.
- **Numeral** (800, 38px, 20% tracking): the 5-digit party and host PIN.

### Named Rules
**The Heavy Header Rule.** Text that sits directly on the gradient is white and at least 600 weight; light weights disappear in the band.

**The PIN Rule.** PINs are always set as spaced numerals, large enough to read from across the room on the TV.

## Layout

Screens are full-viewport columns (`100dvh`) on the gradient: a header with the page title, an optional sticky search area separated by a faint white hairline, a scrolling content area, and on guest screens a floating bottom tab bar. Page side padding is 2.5rem on desktop; lists use 0.5rem gaps; cards use 0.75rem × 1rem inner padding.

Breakpoints are consistent across all pages: phones below 48rem, tablets and laptops from 48rem to 87.5rem, large screens above. Headline sizes step down at each breakpoint (e.g. 2.4rem → 1.8rem → 1.4rem). The host view uses a two-column layout on large screens: song and queue cards on the left, a narrow column with PIN, QR code, actions and the „powered by“ mark on the right.

The **TV player** is sized from the screen height, because it is read from 3–5 m away and never scrolls: a grid of `minmax(0, 1fr)` and a right column of `clamp(18rem, 30vw, 34rem)`, `100dvh`, padding and gaps in `vh`. Every font size is `clamp(min, Xvh, max)`: now-playing title 5.6vh, artist, section heading, up-next titles and like counts 3.4vh, secondary lines 2.6vh, small labels 2.4vh (nothing below 2.2vh), PIN digits 9vh, QR code 34vh. White panels size to their content so the gradient, not white, fills the rest of the screen.

### Named Rules
**The Sofa Rule.** On the TV, nothing is sized in px or rem alone: if it can't be read from the sofa at 1080p (≈ 2.2vh minimum), it doesn't belong on the TV.

**The Thumb Zone Rule.** Primary guest actions live in the bottom third of the phone screen: the bottom tab bar and the like buttons on the right edge of each card.

## Elevation & Depth

Glass on light: the gradient is the floor, translucent white glass is the default surface, and solid white cards appear only where content must be read quickly. Shadows are soft and ambient: wide grey halos rather than hard drop shadows. The floating bottom tab bar is the only element with a strong, directional shadow, because it must read as floating above the scrolling queue.

### Shadow Vocabulary
- **Halo** (`box-shadow: 0 0 0.9rem 0.9rem rgba(0, 0, 0, 0.1)`): resting cards on the host view and the focused search field.
- **Soft lift** (`box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1)`): album covers inside cards.
- **Plum glow** (`box-shadow: 0 0.625rem 1.25rem rgba(var(--color-primary-rgb), 0.05)`): tint-gradient panels.
- **Float** (`box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25)`): the floating bottom tab bar only.

### Named Rules
**The Glass First Rule.** A new surface on the gradient starts as glass (white at 15–25% opacity, 30–50% white border). Upgrade to solid white only when it holds text people must scan.

## Shapes

Everything is rounded; nothing on the gradient has a sharp corner. Corner radius grows with the size of the element: small images (0.5rem), cards, inputs and glass panels (0.75rem), the bottom tab bar (1.25rem), large pill buttons (2rem) and big dashboard cards (30px). Like buttons and avatars are full circles (50%). Borders are thin (1px) and translucent white on the gradient, or Slate Border on white.

## Components

### Buttons
Chunky and thumb-first.
- **Shape:** full pill (2rem radius).
- **Pill (default):** light fill, Ink text, 600 weight, 0.05em tracking, 0.75rem × 2rem padding, at least 15rem wide on the home page.
- **Hover:** lifts and grows (`translateY(-0.2rem) scale(1.05)`), text turns Velvet Plum. Disabled: 60% opacity.
- **Glass option button:** full-width row on the setup flow (icon, bold label, small explanation), glass fill, 0.75rem radius, 1rem × 1.5rem padding; the recommended option is slightly more opaque.

### Like Button (signature)
- **Style:** 3.25rem circle (3.75rem on phones) in Plum Mist with a drawn Velvet Plum outline heart (SVG, no text glyph), on the right edge of every track card, with the like count in plum next to it.
- **Liked:** the button turns solid Velvet Plum with a filled white heart; the card itself stays fully visible and tappable, because a like can be taken back. `aria-pressed` and the label („Song liken“ / „Like entfernen“) follow the state.
- **Feedback:** heart and count change instantly on tap (optimistic); the count gives a short 250ms pop (exponential ease-out, off with reduced motion). Shrinks to 90% while pressed. A failed like reverts and shows a toast.
- **Already in the queue (search results):** the add button shows a Velvet Plum checkmark on Plum Mist, labelled „In der Warteschlange“. It reads as a state, never as a greyed-out disabled control.

### Cards / Containers
- **Track card:** solid white, 0.75rem radius, 0.75rem × 1rem padding; 3.5rem album cover with 0.5rem radius; song title in Body Strong, artist in Ash. Hover tints to Plum Whisper.
- **Now playing:** half-transparent white with a 3px plum left edge and an animated plum soundwave.
- **Host and TV cards:** large solid white panels (30px radius) with the Halo shadow.

### Inputs / Fields
- **Search:** Mist Grey fill, Slate Border, 0.75rem radius, search icon inside on the left; on focus the fill turns white and the Halo appears.
- **PIN digit boxes:** five 50 × 70px glass boxes with white text; the focused box gets a 2px white border.
- **Host PIN field:** one wide glass field, 2rem spaced numerals.
- **Error:** a white chip with Ink text and a Signal Red alert icon below the field, announced via `role="alert"`. Never red text directly on the gradient (≈1.3:1). After „Party nicht gefunden.“ the PIN boxes clear and focus returns to the first box.

### Navigation
- **Guest bottom tab bar:** floats near the bottom of the screen, 90% width (max 450px), 4rem tall, 1.25rem radius, Float shadow. Two tabs („Voten“, „Hinzufügen“): inactive tabs are white with Ink text, the active tab is Velvet Plum with white text, pressed is Velvet Plum Pressed.
- **Host side menu:** a hamburger opens a side menu on the host view.

### Feedback Toast
- **Style:** white chip (0.75rem radius) with Ink text, 600 weight, and a drawn icon: Velvet Plum check for confirmations, Signal Red alert for errors. Soft offset shadow.
- **Placement:** floats directly above the guest bottom tab bar, same width (max 450px), so message and navigation read as one unit in the thumb zone.
- **Behavior:** one message at a time, replaces the previous one, disappears after 3.5s; lives in an always-present `aria-live="polite"` region. Enters with a 280ms slide-up (exponential ease-out, off with reduced motion).

### PIN & QR Panel (signature)
The right column of the host view and TV player: the PIN in Numeral style on a pale panel, the QR code below it, then actions, and at the bottom „MusicVoting – powered by HTL Leonding“ with the school logo. This panel is how guests join, so it is always visible on the TV.
- **On the TV:** the QR code is the largest element in the column (34vh, `image-rendering: pixelated`). The PIN sits on Plum Whisper with the label „Party-PIN“ in Ash and 9vh tabular digits; no emoji. Below the QR a solid Ink call to action („Scan den Code und bestimm die Musik mit!“), never gradient text.
- **Brand block:** the „MusicVoting“ wordmark in white directly on the gradient, and „powered by“ together with the HTL Leonding logo on a small white plate (white text on the coral end only reaches 3.3:1).

### Up-Next List (TV)
- **Structure:** „Als Nächstes“ shows the next five songs as one vertical numbered list in play order, then „+ N weitere“. Rows are separated by hairline dividers inside one white panel, never cards in a card.
- **Row:** plum position number (tabular), rounded cover (0.5rem), title in Ink and artist in Ash with ellipsis, and on the right a filled Velvet Plum heart with the like count, so the room sees that votes decide the order.
- **Idle copy:** always addressed to the room („Gleich geht's los“, „Noch keine Musik“), never to the host.

## Do's and Don'ts

### Do:
- **Do** use the full-bleed brand gradient (`var(--gradient-brand)`) as the background of every guest, host and TV screen.
- **Do** take every color, gradient and radius from the tokens in `src/styles.css`.
- **Do** keep text on the gradient white and at least 600 weight.
- **Do** keep guest touch targets at least 3.25rem (52px), the size of the like button.
- **Do** keep the PIN, the QR code and „powered by HTL Leonding“ visible on the TV player.
- **Do** use Plum Night (#510273) for the darkest brand moments, consistently on web and iOS.

### Don't:
- **Don't** write hex colors or `html`/`body` rules in page stylesheets.
- **Don't** put the brand gradient on small components such as buttons or chips; it belongs to the screen.
- **Don't** use more than one solid Velvet Plum element per view for "active" or "primary".
- **Don't** use sharp corners or hard, dark drop shadows on surfaces resting on the gradient.
- **Don't** shrink guest controls below thumb size to fit more content.
- **Don't** fade, grey out or disable a whole card to show a state; show the state on the control itself.
- **Don't** use text glyphs or emoji (♥, ✓, ⚠) as icons; draw them as SVG in the shared stroke style.
- **Don't** let the floating tab bar cover content: scrolling lists reserve `4rem + 2vh + 1rem + env(safe-area-inset-bottom)` at their end.
