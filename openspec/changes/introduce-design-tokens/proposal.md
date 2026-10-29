## Why

The Angular frontend has no design system: ~3,770 lines of page CSS with 31 hard-coded hex colors (six variants of the brand purple alone), 13 copies of the brand gradient and 12 different border radii. Every design change has to touch dozens of places, and the planned Impeccable design work (and later dark mode) needs one central place for colors and shapes. In addition, four page stylesheets contain `html, body { … }` rules that never apply because Angular scopes component styles (emulated encapsulation); the "design fix try 1" commit relied on one of them.

## What Changes

- Define design tokens as CSS custom properties on `:root` in `musicvoting/frontend/src/styles.css`: brand colors (primary, accent and their dark/light/tint variants), brand gradients, neutral text/surface/border colors, danger red, and border radii.
- Replace hard-coded hex colors, brand-colored `rgba(...)` values, brand gradients and repeated radii in all 11 page stylesheets under `src/app/pages/` with `var(--…)` references.
- Consolidate near-duplicate values: the purples `#8b00a5` and `#8303a6` become the primary `#8403a6`; `#000000` becomes `#111`; `#8e8e8e` becomes `#888`; `#e5e5e5` becomes `#e2e8f0`; `#efefef` becomes `#eee`; `#ef4444` becomes the danger red `#ff3b30`; the off-brand blue focus border `#2980b9` and its focus ring `rgba(52, 152, 219, 0.5)` become the primary. These are the only intended visual differences and are barely noticeable.
- Remove the ineffective `html, body { … }` rules from `guest.css`, `voting-comp.css`, `voting-host.css` and `search-host.css`, and the ineffective `body { … }` rules from `host-dashboard.css` and `startpage.css` (no visual effect, since they never matched).
- `home.html` wraps its content in a nested `<body>` element, so the `body` rules in `home.css` *do* apply. Rename the wrapper to `<div class="home">` and the selectors to `.home` (pixel-identical result, valid HTML).
- Add frontend tests that check the tokens resolve and that page stylesheets contain no hex color literals and no `html`/`body` selectors.
- Not in scope: dark mode, font family, font-size or spacing scales, bottom-navigation rework, shadows with neutral `rgba(0,0,0,…)`/`rgba(255,255,255,…)` overlays. These follow in later changes (Impeccable).

## Capabilities

### New Capabilities
- `web-design-system`: Central design tokens for the Angular web frontend and the rules page stylesheets follow when using colors, gradients and radii.

### Modified Capabilities
<!-- None: no user-facing behavior changes. -->

## Impact

- **Code:** `musicvoting/frontend/src/styles.css`, all 11 `musicvoting/frontend/src/app/pages/*/*.css`, `pages/home/home.html` (wrapper element only), new test file `musicvoting/frontend/src/app/design-tokens.spec.ts`.
- **No changes** to other templates, TypeScript logic, backend, iOS app, APIs or dependencies.
- **Visual:** near-identical; slight shifts only where near-duplicate colors are merged (see above).
- **Docs:** `musicvoting/frontend/README.md` gets a short "Design tokens" section; Hugo screenshots don't need to be redone.
