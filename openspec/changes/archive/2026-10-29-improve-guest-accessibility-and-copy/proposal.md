## Why

The Impeccable critique of 2026-10-29 (`.impeccable/critique/2026-10-29T12-14-01Z__musicvoting-frontend-src-app-pages.md`) scored "Help and Documentation" 0/4 and found accessibility gaps (P2) on the guest side, which break the WCAG 2.1 AA commitment in `PRODUCT.md`:

- The page language is `en` although the whole UI is German, so screen readers read German text with English pronunciation.
- On `/code` the back control is a `<div role="button">` with a „←“ glyph that keyboard users cannot reach; the five PIN boxes have no labels; the text addresses guests formally („Geben Sie den Code ein…“) against the „du“ rule, mixes „Code“ and „PIN“, and never says where the PIN is.
- On `/voting` and `/guest` the search fields have only a placeholder (no accessible name), placeholders have weak contrast, cover images announce „Cover“ for every row, the active tab is not marked as the current page, and the text mixes „Playlist“ and „Warteschlange“ for the same thing. Nothing explains that likes decide the order.

## What Changes

- `index.html`: `lang="de"`.
- `/code`: real `<button>` for „Zurück“ with a drawn arrow icon; PIN boxes grouped as „Party-PIN“ with labels „Ziffer 1 von 5“ … „Ziffer 5 von 5“; copy in „du“ form with a hint where the PIN is; „PIN“ used consistently (also on the paste button).
- `/voting` and `/guest`: search fields get accessible names; placeholders use the readable text-muted color; cover images are decorative (`alt=""`) because the title is right next to them; the active bottom tab gets `aria-current="page"`; the page title is no longer wrapped in a `<nav>`.
- Consistent wording: „Warteschlange“ instead of „Playlist“ on the guest side; the empty voting view uses the fixed string „Warteschlange ist leer“.
- A one-line explanation on `/voting` under the title: „Je mehr Likes, desto früher läuft ein Song.“
- Visible keyboard focus on guest controls (`:focus-visible`) where it is missing.

Visual impact is small (one added line on `/voting`, changed texts, a slightly darker placeholder, focus rings when using a keyboard); no layout changes, no new boxes. Screenshots are reviewed before commit.

Not in scope: TV player (`/startpage`), host pages, home tagline wording.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `guest`: new requirements for accessible guest screens (language, names, keyboard, focus) and for consistent, informal guest copy including a hint where the PIN is and what likes do.

## Impact

- **Frontend code:** `src/index.html`, `pages/code-input/*`, `pages/voting-comp/*`, `pages/guest/*`; tests in the corresponding `.spec.ts` files.
- **No changes** to backend, APIs, TV player, host pages, iOS app.
- **Docs:** `DESIGN.md` (focus and copy notes) if wording rules change; status screenshots of `/code` are outdated afterwards (sprint review, rule 6).
