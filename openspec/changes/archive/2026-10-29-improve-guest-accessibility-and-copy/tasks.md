## 1. Baseline

- [x] 1.1 Frontend tests green before changes (Superbox: no-sandbox Karma config in `ai/scratch/design-tokens/karma.conf.cjs`)
- [x] 1.2 "Before" screenshots of `/code`, `/voting`, `/guest` at 390×844 (reuse `ai/scratch/fix-guest-voting-ux/states.mjs`) into `ai/scratch/improve-guest-accessibility-and-copy/before/`

## 2. Global

- [x] 2.1 `src/index.html`: `lang="de"`

## 3. PIN entry (`/code`)

- [x] 3.1 `code-input.html`: back control as `<button>` with SVG arrow and `aria-label="Zurück"`; PIN container `role="group" aria-label="Party-PIN"`; `aria-label="Ziffer N von 5"` on each box; new subtitle and paste button text
- [x] 3.2 `code-input.css`: button reset for the back control (same look, ≥ 44px hit area); `:focus-visible` for back and paste buttons
- [x] 3.3 `code-input.ts`: paste error „Die PIN besteht nur aus Zahlen.“; `code-input.spec.ts` updated, plus a test that `goBack` is reachable as a button (template check)

## 4. Voting (`/voting`)

- [x] 4.1 `voting-comp.html`: header wrapper `div`, likes explanation line, search `aria-label` and new placeholder, cover `alt=""`, empty state „Warteschlange ist leer“ + hint, `aria-current="page"` on the active tab, tab bar `aria-label`
- [x] 4.2 `voting-comp.css`: style for the explanation line (existing header subtitle look), `::placeholder` color, `:focus-visible` for search and tabs

## 5. Add songs (`/guest`)

- [x] 5.1 `guest.html`: header wrapper `div`, search `aria-label` and new placeholder, cover `alt=""`, new welcome text, `aria-current="page"` on the active tab, tab bar `aria-label`
- [x] 5.2 `guest.css`: `::placeholder` color, `:focus-visible` for search and tabs

## 6. Verify

- [x] 6.1 Template tests (TestBed render) for: `lang` not testable in Karma → covered by screenshot check; PIN group/labels, back button element, `aria-current` on the active tab, search `aria-label`, empty-state text
- [x] 6.2 All frontend tests green; production build succeeds; Impeccable detector on the three pages
- [x] 6.3 "After" screenshots (same states as 1.2) plus a keyboard-focus screenshot; DOM check for `lang`, labels and `aria-current`
- [x] 6.4 Show the before/after screenshots to Miriam and get her OK before committing
