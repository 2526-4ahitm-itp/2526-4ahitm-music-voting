## 1. Baseline

- [x] 1.1 Run the frontend tests (`cd musicvoting/frontend && dbx "npx ng test --watch=false --browsers=ChromeHeadless"`) and note the result as baseline
- [x] 1.2 Take "before" screenshots of home, code-input, guest, voting-comp, host-options, create-party, select-playlist, host-dashboard, search-host, voting-host and startpage (mobile and desktop width), saved under `ai/scratch/design-tokens/before/`

## 2. Tokens

- [x] 2.1 Add the token set from `design.md` (colors, RGB channel token, gradients, radii) to `:root` in `musicvoting/frontend/src/styles.css`, grouped and commented

## 3. Tests (written first, expected to fail until section 4 is done)

- [x] 3.1 Create `musicvoting/frontend/src/app/design-tokens.spec.ts`: brand tokens resolve on `document.documentElement`; an element with `background: var(--color-primary)` computes to `rgb(132, 3, 166)`
- [x] 3.2 In the same file: for each of the 11 page components, read the compiled styles via `ɵcmp.styles`, assert they are non-empty, contain no hex color literal and no `html`/`body` selector

## 4. Replace values in page stylesheets

- [x] 4.1 `home.css`, `code-input.css`, `create-party.css`, `select-playlist.css`
- [x] 4.2 `host-options.css`, `host-dashboard.css`
- [x] 4.3 `guest.css`, `voting-comp.css` (also remove the dead `html, body` rules)
- [x] 4.4 `search-host.css`, `voting-host.css` (also remove the dead `html, body` rules)
- [x] 4.5 `startpage.css` (also remove the dead `body` rule; same for `host-dashboard.css`)
- [x] 4.7 `home.html`/`home.css`: rename the nested `<body>` wrapper to `<div class="home">` and the `body` selectors to `.home`
- [x] 4.6 Check that every `var(--…)` name used in the page stylesheets is defined in `styles.css` and that no hex literal is left (`grep`)

## 5. Verify

- [x] 5.1 Frontend tests green, including the new `design-tokens.spec.ts`
- [x] 5.2 Production build succeeds (`dbx "npx ng build"`)
- [x] 5.3 Take "after" screenshots and compare with "before"; differences only where colors were merged on purpose

## 6. Docs

- [x] 6.1 Add a short "Design tokens" section to `musicvoting/frontend/README.md` (where tokens live, naming, rule: no hex colors in page CSS, no `html`/`body` in component CSS)
