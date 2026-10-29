## Context

`/startpage` (`pages/startpage/`) is the TV player: it runs the Spotify Web Playback SDK (audio sink) and shows now-playing, the queue and the join panel. Layout today (`startpage.css`): an 80/20 flex split; left a white "current song" card (300px cover, 2.5rem title, progress bar pushed down with `margin-top: 10rem`) and a white queue card with a 3-column tile grid (15px titles, 12px artists, no like counts, rank number painted over the cover); right a white panel with PIN box (14px label, 38px digits, 👑 emoji), the QR image (`width: 100%` of a 20vw column ≈ 288px at 1920) and a gradient-text caption, then the „MusicVoting / powered by HTL Leonding“ block with a `calc((20vw - 2rem)/6.5)` logo size. All sizes are px/rem, so a TV gets laptop-sized text.

Data is already there: `tracks` (queue without the playing entry, each with `likeCount`), `currentTrack`, `currentPosition`, `progressPercent`, `pin`, `qrUrl`. Tests (`startpage.spec.ts`, `startpage.progress.spec.ts`) test logic only, not the DOM.

Design constraints: `DESIGN.md` ("The Glowing Wristband", white reading surfaces stay — decision from the critique round), `PRODUCT.md` (TV legible at distance, „powered by HTL Leonding“ binding, German UI, „du“), critique snapshot of 2026-10-29.

## Goals / Non-Goals

**Goals:**
- Readable at 3–5 m on a 1920×1080 TV; the room sees what's next and that likes matter.
- The join panel (PIN + QR) is the dominant element on the right and scannable from further away.
- No clipping at 1920×1080, 1440×900, 1280×720; WCAG AA contrast for all TV text.
- Room-facing copy in every state.

**Non-Goals:**
- Dark "stage" (decided against for now), new colors or fonts.
- Changes to playback, SDK, progress logic, SSE, or the host dashboard.

## Decisions

### 1. Size everything from the viewport height
A TV is defined by its height; width varies (16:9 TV vs. 16:10 laptop). All TV type and key elements use `clamp(min, Xvh, max)` so they scale with the screen but stay sane on small windows:

| Element | Size | ≈ at 1080p |
|---|---|---|
| Now-playing title | `clamp(2rem, 5.6vh, 6rem)`, 800 | 60px |
| Now-playing artist | `clamp(1.25rem, 3.4vh, 3.5rem)`, 600 | 37px |
| Section heading „Als Nächstes“ | `clamp(1.25rem, 3.4vh, 3.5rem)`, 800 | 37px |
| Up-next title | `clamp(1.1rem, 3.4vh, 3.5rem)`, 700 | 37px |
| Up-next artist / like count | `clamp(1rem, 2.6vh, 2.75rem)` / `3.4vh` 800 | 28 / 37px |
| PIN digits | `clamp(2.5rem, 9vh, 9rem)`, 800, tabular numerals | 97px |
| Small labels („Party-PIN“, „+ N weitere“, „powered by“) | `clamp(0.9rem, 2.4vh, 2.5rem)` | 26px |
| QR code | `height: clamp(12rem, 34vh, 40rem)` | 367px |

Cap height ≈ 0.7 × font size; 1vh ≈ 6.8 mm on a 55" 1080p panel, so the title reaches ≈ 28 mm caps and up-next ≈ 17 mm caps.
**Alternative:** fixed rem sizes with a TV media query — rejected: TVs report anything from 1280×720 to 3840×2160 CSS px depending on browser zoom, `vh` follows what is actually visible.

### 2. Layout: two columns, content-sized panels
- Grid `minmax(0, 1fr) clamp(18rem, 30vw, 34rem)` with `gap` and padding in `vh`; the whole page is `100dvh`, `overflow: hidden` (a TV has no scrolling).
- **Left column:** a now-playing panel (cover `clamp(8rem, 26vh, 22rem)`, title, artist, progress bar directly under the text, no 10rem gap) and below it the „Als Nächstes“ panel. Both are white panels with `--radius-pill`; the up-next panel lists rows with dividers (no nested cards, no shadows per row). *Changed during implementation:* the up-next panel is content-sized (`flex: 0 1 auto`) instead of filling the remaining height, because a stretched panel left a large empty white area in the idle and empty states.
- **Right column:** one join panel (PIN block, QR, call to action) and below it the brand block. The QR is the largest element in the column.
- Panels size to content; when nothing plays, the now-playing panel shrinks to the idle message instead of showing a 300px placeholder image.

### 3. Up-next list
`upNext = tracks.slice(0, 5)` and `moreCount = max(0, tracks.length - 5)` as getters in `startpage.ts`. Each row: position number (plum, tabular numerals, outside the cover), cover `clamp(3rem, 7.5vh, 7rem)` with `--radius-sm`, title + artist (single line, ellipsis), and on the right a drawn SVG heart in Velvet Plum plus the like count. Five rows at ~9vh each plus heading fit in the space left under the now-playing panel at 16:9 and 16:10.
**Alternative:** auto-fit as many rows as fit — rejected: harder to test, and five is enough for "what's next" from the sofa.

### 4. Join panel
- PIN block: label „Party-PIN“ (Ash `--color-text-muted`, ≥ 4.5:1 on white — the old `#888` on `#eee` was 3.1:1), digits in Ink, `font-variant-numeric: tabular-nums`, letter-spacing `0.12em`; on Plum Whisper background (`--color-primary-tint-soft`) instead of grey. No crown.
- QR: `height: clamp(12rem, 34vh, 40rem); aspect-ratio: 1` with a small white quiet zone; `image-rendering: pixelated` so the PNG stays crisp when scaled.
- Call to action in solid Ink, bold: „Scan den Code und bestimm die Musik mit!“ (no gradient text, One Band Rule).

### 5. Copy (German, „du“, room-facing)
| State | Text |
|---|---|
| Songs queued, nothing playing | **„Gleich geht's los“** / „Scan den QR-Code und vote schon mal für deine Favoriten.“ |
| Nothing queued, nothing playing | **„Noch keine Musik“** / „Scan den QR-Code und wünsch dir den ersten Song!“ |
| Up-next empty | „Noch nichts in der Warteschlange – füg über den QR-Code den ersten Song hinzu.“ |
| More than 5 waiting | „+ N weitere“ |
The old host-facing strings („Playlist nicht gestartet“, „Der Host kann den ersten Song im Dashboard starten.“, „Lieder in der Warteschlange: N“) are removed.

### 6. Brand block
„MusicVoting“ wordmark `clamp(1.5rem, 4.5vh, 4.5rem)` 800 in white on the gradient (bottom of the right column, no panel), „powered by“ in white at ≥ 2.4vh with the HTL Leonding logo on a small white rounded plate so the JPG's white background doesn't need `mix-blend-mode`. White on the gradient end (coral) at this size and weight is large text (≥ 3:1).

## Risks / Trade-offs

- [Very wide or very short windows] → `clamp()` floors and `minmax(0, …)` + ellipsis prevent overflow; verified at 1920×1080, 1440×900, 1280×720 by screenshot and a DOM overflow check.
- [White still dominates a dark room] → accepted (decision); panels now size to content, which roughly halves the white area in the idle state.
- [QR PNG blurs when upscaled] → `image-rendering: pixelated`; the backend PNG is a pure black/white matrix.
- [Spotify SDK not available in the devbox] → the "playing" state is checked with a mocked `currentTrack` in the browser check, not real playback.

## Migration Plan

Frontend-only; rollback = revert the commit.
