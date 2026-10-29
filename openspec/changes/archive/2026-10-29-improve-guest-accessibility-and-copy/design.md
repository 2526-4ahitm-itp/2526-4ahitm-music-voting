## Context

Guest screens after `fix-guest-voting-ux`: `/code` (`pages/code-input/`), `/voting` (`pages/voting-comp/`), `/guest` (`pages/guest/`). Like, add and toast already have German labels and live regions. Remaining gaps are listed in the proposal (critique P2 and heuristic 10). Constraint from the last review round: no new boxes or layout changes; visual changes are shown as screenshots before commit.

## Goals / Non-Goals

**Goals:** WCAG 2.1 AA basics on the guest side (language, names, keyboard, focus, contrast of placeholders); consistent informal copy; tell guests where the PIN is and what likes do.

**Non-Goals:** TV player, host pages, home tagline, layout or color changes.

## Decisions

### 1. Texts

| Where | Before | After |
|---|---|---|
| `/code` subtitle | „Geben Sie den Code ein, um einer Party beizutreten!“ | „Gib die 5-stellige PIN ein. Du findest sie auf dem Fernseher.“ |
| `/code` paste button | „Code aus Zwischenablage einfügen“ | „PIN aus Zwischenablage einfügen“ |
| `/code` paste error | „Nur Zahlen können eingegeben bzw. eingefügt werden!“ | „Die PIN besteht nur aus Zahlen.“ |
| `/voting` under the title | – | „Je mehr Likes, desto früher läuft ein Song.“ |
| `/voting` search placeholder | „In Playlist suchen...“ | „In der Warteschlange suchen…“ |
| `/voting` empty state | „Die Playlist ist leer“ / „Es sind noch keine Songs zum Voten da.“ | „Warteschlange ist leer“ / „Füg unter „Hinzufügen“ den ersten Song hinzu.“ |
| `/guest` search placeholder | „Suchen...“ | „Song oder Künstler suchen…“ |
| `/guest` welcome text | „Gib einen Song oder Künstler oben ein, um die Playlist zu füllen.“ | „Gib oben einen Song oder Künstler ein und füg ihn zur Warteschlange hinzu.“ |

Kept: „Party beitreten!“, „Nur Zahlen erlaubt!“, „Party nicht gefunden.“, „Vote für deine Lieblingssongs!“, „Suche nach deinen Lieblingssongs!“, „Bereit für Musik?“, all toast texts. The likes line uses the existing subtitle style of the header (white, normal weight), so it adds a line, not a box.

### 2. Back control on `/code`
`<button type="button" class="back-to-home" aria-label="Zurück">` with a drawn SVG arrow (craft floor: no text glyphs as icons). CSS resets the button (`background: none; border: 0; color: inherit; padding`) so it looks like today's arrow; it keeps a ≥ 44px hit area.

### 3. PIN group
Wrap the five inputs' container with `role="group" aria-label="Party-PIN"`; each input gets `aria-label="Ziffer N von 5"` and `autocomplete="one-time-code"` on the first box (iOS suggests codes; harmless elsewhere). No visual change.

### 4. Search, images, tabs, headings
- `aria-label` on both search inputs equal to their placeholder text (placeholder disappears while typing; the name must not).
- `::placeholder { color: var(--color-text-muted); }` (#666 on #f9f9f9 ≈ 5.4:1, was #94a3b8 ≈ 2.4:1). The search icon keeps `--color-text-placeholder` (decorative).
- Covers next to titles: `alt=""`.
- Active tab: `aria-current="page"`; tab bar `<nav aria-label="Gast-Navigation">`.
- The page header is currently `<nav class="navbar"><header>…</header></nav>`; the outer element becomes a `<div class="navbar">` (same class, no visual change) because it contains no navigation.

### 5. Focus
A shared rule in `styles.css` would leak into host/TV pages; instead each guest stylesheet gets `:focus-visible` for its controls that lack it: tab buttons (`outline: 3px solid var(--color-accent); outline-offset: -3px` inside the white/plum bar), back button and paste button (white outline on the gradient), search inputs (plum outline, since `outline: none` is set today). Mouse/touch users see no change (`:focus-visible` only).

## Risks / Trade-offs

- [Copy taste] → all strings listed above for review before implementation; screenshots before commit.
- [`autocomplete="one-time-code"` might make browsers offer SMS codes] → only on iOS Safari with an incoming SMS; acceptable, removable.
- [Tests depending on the old paste error string] → updated together with the string.

## Migration Plan

Frontend-only; rollback = revert the commit.
