## Why

The Impeccable critique of 2026-10-29 listed minor observations on the guest side and the home page that the previous changes left open, and `DESIGN.md` now forbids some of them (text glyphs/emoji as icons, colored side stripes, page-level inline styles). This is the polish pass: no redesign, only consistency and cleanup within the current look.

## What Changes

- `/voting`: the "now playing" card loses its 3px Velvet Plum left stripe (detector `side-tab`); the soundwave and the translucent card already mark it. Songs without cover art get a placeholder image; the existing fallback on `/guest` pointed to a non-existent path (404) and is fixed to `assets/img/placeholder.png` as well.
- `/voting` and `/guest`: the 🎵 emoji in the empty/welcome state becomes a drawn SVG music note in the existing circle.
- Home (`/`): the wordmark/tagline font fallback is `serif` today, so on Android/Linux (no Segoe UI/Tahoma/Geneva/Verdana) the home page renders in a serif font; it becomes `sans-serif` like every other page.
- Code cleanup without visual change:
  - `/guest`: hidden submit button uses the `hidden` attribute instead of an inline style.
  - TV player: the crown's inline style moves into the stylesheet (same look); dead members `menuOpen`, `toggleMenu`, `trackById` and their tests are removed.
  - The soundwave keyframe is renamed `soundwave-pulse` (it never used bounce easing; the old name only confused the detector).
- Detector false positives for Angular `[src]` bindings (`broken-image`) on `voting-comp.html` and `guest.html` get narrow, documented ignores.

Not in scope: host pages (inline styles in `create-party`, `host-dashboard`, `search-host`), TV layout, home tagline wording.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `web-design-system`: adds the rules that icons are drawn (SVG, no text glyphs or emoji) and that page templates use no inline styles, which the current pages now follow on the guest side.

## Impact

- **Frontend:** `pages/voting-comp/*`, `pages/guest/*`, `pages/home/home.css`, `pages/startpage/startpage.{html,css,ts,spec.ts}`; `.impeccable/config.json` (detector ignores).
- **Visible:** no stripe on the playing song in `/voting`, SVG note instead of emoji in empty states, sans-serif home page on devices without the Windows/Apple fonts. Screenshots are reviewed before commit.
