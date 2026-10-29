## Context

The Angular frontend (`musicvoting/frontend/`) styles its 11 pages with plain, component-scoped CSS (`src/app/pages/<page>/<page>.css`, ~3,770 lines). The global `src/styles.css` only defines `--font`. An inventory on 2026-10-29 found 31 distinct hex colors, 13 copies of `linear-gradient(135deg, #8403A6, #F2594B)`, brand-colored `rgba(131, 3, 166, …)` / `rgba(139, 0, 165, …)` values, and 12 different `border-radius` values. Breakpoints (`48rem`, `87.5rem`) are already consistent.

Four stylesheets (`guest`, `voting-comp`, `voting-host`, `search-host`) contain `html, body { height: …; overflow: hidden; background-color: #f0f2f5; }`. Because no component overrides `ViewEncapsulation`, Angular rewrites these selectors to `html[_ngcontent-…]`, so they never match.

This change prepares the planned Impeccable design work (typography, color, dark mode), which then only has to edit tokens.

## Goals / Non-Goals

**Goals:**
- One source of truth for colors, brand gradients and border radii in `src/styles.css`.
- No hex color literals in page stylesheets.
- Nearly no visual change: tokens keep the existing values; only near-duplicates are merged.
- Remove dead `html, body` rules.
- Automated tests that keep these rules from regressing.

**Non-Goals:**
- Dark mode, new color palette, font family, font-size scale, spacing scale.
- Reworking the bottom navigation or safe-area handling.
- Neutral shadow/overlay values (`rgba(0,0,0,…)`, `rgba(255,255,255,…)`); they are mostly one-off box-shadows and would get their own shadow tokens later.
- Single-use radii (`4px`, `10px`, asymmetric radii) stay literal.

## Decisions

### Token set and value mapping

Tokens are named by role, not by hue, so a later dark mode or rebrand only changes values.

| Token | Value | Replaces |
|---|---|---|
| `--color-primary` | `#8403a6` | `#8403a6`, `#8b00a5`, `#8303a6`, `#2980b9` (focus border) |
| `--color-primary-rgb` | `132, 3, 166` | `rgba(131, 3, 166, a)`, `rgba(139, 0, 165, a)`, `rgb(139 0 165 / a)`, `rgba(52, 152, 219, a)` (focus ring) → `rgba(var(--color-primary-rgb), a)` |
| `--color-primary-hover` | `#c826b8` | `#c826b8` |
| `--color-primary-pressed` | `#6a0089` | `#6a0089` |
| `--color-primary-deep` | `#5c0070` | `#5c0070` |
| `--color-primary-tint` | `#f3e8ff` | `#f3e8ff` |
| `--color-primary-tint-soft` | `#fdfaff` | `#fdfaff` |
| `--color-accent` | `#f2594b` | `#f2594b` |
| `--color-accent-rgb` | `242, 89, 75` | `rgb(242 89 75)`, `rgb(242 89 75 / a)` → `rgb(var(--color-accent-rgb))` / `rgba(var(--color-accent-rgb), a)` |
| `--color-accent-pressed` | `#d8455f` | `#d8455f` |
| `--color-accent-tint` | `#ffd0cc` | `#ffd0cc` |
| `--gradient-brand` | `linear-gradient(135deg, var(--color-primary), var(--color-accent))` | 13 copies |
| `--gradient-brand-reverse` | `linear-gradient(135deg, var(--color-accent), var(--color-primary))` | 1 copy |
| `--gradient-tint` | `linear-gradient(135deg, var(--color-primary-tint) 0%, var(--color-surface) 100%)` | 4 copies |
| `--color-danger` | `#ff3b30` | `#ff3b30`, `#ef4444` |
| `--color-surface` | `#fff` | `#fff`, `#ffffff` |
| `--color-bg` | `#f0f2f5` | `#f0f2f5` |
| `--color-surface-subtle` | `#f9f9f9` | `#f9f9f9` |
| `--color-surface-muted` | `#f1f5f9` | `#f1f5f9` |
| `--color-divider` | `#eee` | `#eee`, `#efefef` |
| `--color-border` | `#e2e8f0` | `#e2e8f0`, `#e5e5e5` |
| `--color-border-strong` | `#cbd5e1` | `#cbd5e1` |
| `--color-text` | `#111` | `#111`, `#000000` |
| `--color-text-secondary` | `#333` | `#333` |
| `--color-text-muted` | `#666` | `#666` |
| `--color-text-subtle` | `#888` | `#888`, `#8e8e8e` |
| `--color-text-placeholder` | `#94a3b8` | `#94a3b8` |
| `--radius-sm` | `0.5rem` | `0.5rem` |
| `--radius-md` | `0.75rem` | `0.75rem`, `12px` |
| `--radius-lg` | `1.25rem` | `1.25rem`, `20px` |
| `--radius-xl` | `2rem` | `2rem` |
| `--radius-pill` | `30px` | `30px` |
| `--radius-round` | `50%` | `50%` |

Where a value is used in a role other than its token name suggests (e.g. `#fff` as text color on a purple button), the implementer picks the token by value; role-perfect naming is the job of the later design change. `white`/`black` keywords stay as they are.

**Alternative considered:** Sass variables (`$primary`). Rejected: they compile away, so they can't be switched at runtime for dark mode, and the project has no Sass today.

**Alternative considered:** a full Tailwind-style scale (`--purple-50…900`). Rejected for now: the app uses only a handful of shades; a role-based set is smaller and matches how Impeccable's `DESIGN.md` describes colors.

### `rgba` with brand colors
Use an RGB-channel token (`--color-primary-rgb: 132, 3, 166`) with `rgba(var(--color-primary-rgb), a)`. Alternative `color-mix(in srgb, var(--color-primary) 30%, transparent)` is cleaner but harder to read for the team; the RGB token works in all target browsers and keeps the existing alpha values verbatim.

### Remove instead of move the `html, body` rules
Moving them into `styles.css` would make them active for the first time and apply `overflow: hidden` to every page, which breaks scrolling on long pages (host dashboard, playlist selection). Since they never applied, deleting them is the zero-change option. Any real viewport fix belongs to the later bottom-nav/safe-area change.

### `home` uses a nested `<body>` element (found during implementation)
`home.html` wraps its content in `<body>`. Angular creates that as a real element inside the component, so `body[_ngcontent-…]` in `home.css` matches it, unlike the other pages, where the `body` rules match nothing (verified in the running app by querying every html/body rule). Deleting the home rules would break the page; making them global would restyle every page. Decision: rename the wrapper to `<div class="home">` and the selectors to `.home`. Global `html, body { margin: 0; padding: 0 }` already applied to the nested body, and `.home` keeps the explicit padding, so the result is pixel-identical (checked by screenshot diff).

Likewise, `host-dashboard.css` and `startpage.css` have `body { … }` rules that match nothing; they are removed together with the four `html, body` rules.

### Tests via compiled component styles
The tests in `src/app/design-tokens.spec.ts`:
1. Read `--color-primary`, `--color-accent` and `--gradient-brand` from `getComputedStyle(document.documentElement)` (the Karma build includes `src/styles.css`).
2. Render an element styled with `var(--color-primary)` and assert its computed color.
3. For each page component class, read its compiled styles from the Angular component definition (`ɵcmp.styles`) and assert there are no hex color literals and no `html`/`body` selectors.

`ɵcmp` is a private Angular API. It is only used in a test, and the test first asserts that styles were found, so an Angular upgrade that changes it fails loudly instead of passing silently. **Alternative:** a Node script grepping the CSS files. Rejected because the team's rule is "all checks run in `ng test`", and the script would need its own runner.

## Risks / Trade-offs

- [Merged near-duplicate colors look slightly different] → Merges are listed in the proposal; compare before/after screenshots of guest, voting, host-dashboard and startpage pages.
- [A replacement typo (`var(--color-primay)`) silently falls back to no color] → Grep for every `var(--` name used and check it is defined in `styles.css` (task); visual check of all pages.
- [`ɵcmp` changes in a future Angular version] → Test fails loudly (asserts non-empty styles); fix the accessor then.
- [Merge conflicts with parallel CSS work by Simone/Marlies] → Keep the change short-lived; announce it in the team before starting.

## Migration Plan

Pure frontend refactor, deployed with the normal frontend image. Rollback = revert the commit.
