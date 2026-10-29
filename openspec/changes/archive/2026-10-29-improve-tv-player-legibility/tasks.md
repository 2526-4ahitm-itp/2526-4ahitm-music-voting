## 1. Baseline

- [x] 1.1 Run the frontend tests and note the result (Superbox: no-sandbox Karma config in `ai/scratch/design-tokens/karma.conf.cjs`)
- [x] 1.2 "Before" screenshots of `/startpage` at 1920×1080, 1440×900 and 1280×720 in three states (songs queued + nothing playing, mocked playing track, empty party) into `ai/scratch/improve-tv-player-legibility/before/`

## 2. Logic

- [x] 2.1 `startpage.ts`: getters `upNext` (first 5 of `tracks`) and `moreCount` (remaining count), with comments
- [x] 2.2 `startpage.spec.ts`: tests for `upNext` (≤ 5, order kept, playing entry excluded via `tracks`) and `moreCount` (0 for ≤ 5, N for more)

## 3. Template

- [x] 3.1 Now-playing panel: cover, title, artist, progress directly below; idle states „Gleich geht's los“ / „Noch keine Musik“ with their sub-lines; remove host-facing strings and the placeholder image
- [x] 3.2 „Als Nächstes“ list: position, cover, title, artist, SVG heart + like count per row; „+ N weitere“; empty text
- [x] 3.3 Join panel: „Party-PIN“ block without crown, QR image, solid call to action „Scan den Code und bestimm die Musik mit!“; brand block with „powered by“ and HTL logo on a white plate

## 4. Styles

- [x] 4.1 Rewrite `startpage.css`: grid layout, `100dvh`, `clamp(…vh…)` sizes from the design table, content-sized white panels, row dividers instead of nested cards, rounded covers, tabular numerals, no gradient text, no px font sizes, tokens only
- [x] 4.2 Remove the old media-query block and `!important` overrides that the new layout makes obsolete

## 5. Verify

- [x] 5.1 All frontend tests green; production build succeeds
- [x] 5.2 Impeccable detector on `pages/startpage/` (source scan) and fix real findings
- [x] 5.3 "After" screenshots (same viewports and states as 1.2); measure in the browser: title ≥ 54px, up-next titles ≥ 34px, PIN ≥ 86px, QR ≥ 324px, smallest visible text ≥ 23px at 1920×1080; no element overflow at all three sizes; contrast of label/powered-by ≥ 4.5:1 or large-text 3:1
- [x] 5.4 Update `DESIGN.md` (TV layout, PIN & QR panel, up-next list) and `.impeccable/design.json`
