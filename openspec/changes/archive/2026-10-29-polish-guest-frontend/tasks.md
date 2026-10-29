## 1. Baseline

- [x] 1.1 Frontend tests green; "before" screenshots of `/`, `/voting` (empty and with a playing song mocked), `/guest` (empty) at 390×844 and `/` at 1440×900 into `ai/scratch/polish-guest-frontend/before/`

## 2. Guest views

- [x] 2.1 `voting-comp.css`: remove the now-playing left stripe; rename keyframe to `soundwave-pulse`; `voting-comp.html`: cover placeholder fallback
- [x] 2.2 `voting-comp.html` and `guest.html`: SVG music note instead of 🎵 in the empty/welcome state (with matching `.icon-circle` styles)
- [x] 2.3 `guest.html`: hidden submit button via `hidden` attribute
- [x] 2.4 Tests: empty state renders an SVG and no emoji (voting + guest template tests); `/voting` cover falls back to the placeholder

## 3. Home and TV (invisible cleanup on the TV)

- [x] 3.1 `home.css`: `sans-serif` fallback
- [x] 3.2 `startpage.html`/`.css`: crown inline style into `.crown-icon`; `startpage.ts`: remove `menuOpen`, `toggleMenu`, `trackById`; remove their tests

## 4. Verify

- [x] 4.1 Detector ignores for `broken-image` on `voting-comp.html`, `guest.html`, `startpage.html` (narrow, with reason); detector run on the changed pages
- [x] 4.2 All frontend tests green; production build succeeds
- [x] 4.3 "After" screenshots (same states); TV screenshot at 1920×1080 pixel-compared with before (must be identical)
- [x] 4.4 Show before/after to Miriam and get her OK before committing
