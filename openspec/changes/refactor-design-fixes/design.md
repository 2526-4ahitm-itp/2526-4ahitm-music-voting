# Design: Design Fixes from the Impeccable UI/UX Critique

> All decisions are based on the answers in `questions.md` (2026-11-03).

## Context

See `proposal.md` and [`openspec/analyse/impeccable/ui-ux-critique.md`](../../analyse/impeccable/ui-ux-critique.md). Relevant current state of `musicvoting/frontend/src/`:

- **Visual system**:
  - Every page sets its own `linear-gradient(135deg, #8403A6, #F2594B)` background.
  - `styles.css` only defines the Segoe UI font stack.
  - Colours, radii and spacing are hard-coded per component. Icons are emoji or ad-hoc inline SVGs.
- **Duplication**: the side menu and spinner (markup + CSS) are copied into `host-dashboard`, `search-host` and `voting-host`. The cover `<img>` is written by hand in 8 templates with different (or missing) fallbacks. Two templates use the non-existent path `assets/placeholder.png`; the file is `assets/img/placeholder.png`.
- **Voting**: `voting-comp.css:235-239` sets `.voted { pointer-events: none; opacity: .5; filter: grayscale(1) }`. `toggleVote` (`voting-comp.ts:223`) waits for the HTTP response before updating.
- **TV page** (`startpage`): reuses the dashboard grid. Queue text is about 13px, the QR code about 150px, and the QR caption uses gradient text (`startpage.css:259`).
- **Join**: `code-input.ts:27-35` sets `window.location.href = musicvotingapp://…` and only resolves the PIN after 1.5 s if `!document.hidden`.
- **Frontend is zoneless**: after every `await`, components call `ChangeDetectorRef.detectChanges()`.
- **Backend**: no changes needed.

## Goals / Non-Goals

**Goals:**
- Fix all five priority issues of the critique without changing backend behaviour.
- Replace the duplicated building blocks with shared components, so the fixes (fallbacks, labels, focus) are made once.
- Evolve the look with the same colours: TV as a dark "stage", phones calm and readable.
- Leave the app in a state where `/impeccable critique` scores clearly higher (target ≥ 28/40).

**Non-Goals:**
- The iOS app.
- A party name or a party recap (would need their own backend change).
- Merging the two guest tabs into one list (critique question 2, a separate discussion).
- YouTube support in the web host flow.
- Dark mode as a user setting.

## Decisions

### D1: Design tokens in `styles.css`, look evolved per surface
Introduce CSS custom properties in `styles.css` and use them in every component instead of literal values:
- **Colours**: `--mv-purple: #8403A6`, `--mv-coral: #F2594B`, plus derived tints/shades. Text colours are chosen so that the AA contrast rule in `web-ui/spec.md` holds.
- **Surfaces**: `--mv-surface`, `--mv-surface-raised`, `--mv-on-surface`.
- **Spacing, radii**: `--mv-radius-card`, `--mv-space-*`.
- **Type**: `--mv-font-display`, `--mv-font-text`.
- **Motion**: `--mv-ease-out` and `--mv-duration-*`, set to 0 under `prefers-reduced-motion`.

How each surface uses them:
- **TV (`startpage`)**: dark stage background (`--mv-stage`, #12061A). The purple/coral gradient becomes a soft glow behind the now-playing cover, not a full-page fill. On 2026-11-03 the team also tried a light background, the full brand gradient and a muted gradient, and went back to this dark stage.
- **Host pages (dashboard, voting, search, blacklist)**: the same dark stage as the TV (team decision 2026-11-03), defined once in `src/app/shared/stage.css` and listed first in each host component's `styleUrls`: brand glow, translucent dark cards and rows, dark search field, round icon buttons. In dark mode the glow also fills the middle of the screen (`--mv-stage-center-glow`, translucent purple → coral) and cards/rows are denser (0.72 / 0.6), so the dark boxes stand out instead of sitting on black (team request 2026-11-03). Text placed directly on the glow keeps ≥ 4.5:1 at its brightest point (measured: muted 5.5:1, accent 5.1:1). The TV does not get the centre glow: with its stronger corner glows the screen would look like the rejected full-gradient fill. Light mode was strengthened the same day ("die Farben sollen auch bei Weiß mehr zum Vorschein kommen"): glow 0.35 → 0.5 plus a pastel centre glow; muted (#4E3D56) and accent (#842419) inks were darkened so text keeps ≥ 4.5:1 at the strongest glow point (measured 4.9:1 / 4.6:1; the old accent already reached only 4.1:1 there). The TV keeps its light glow at 0.35 (`--mv-stage-tv-glow`), because its stronger corner glows would otherwise drop text below 4.5:1. The host voting page shows the like ranking instead of the old non-functional heart button.
- **Light mode for the stage pages**: a "Heller Modus" switch (`mv-theme-toggle`, `role="switch"`) sits in the top bar of every host page. `ThemeService` stores the choice in `localStorage` (`mv-theme`), sets `data-theme` on `<html>` and listens to `storage` events, so the TV page in another tab follows without a reload. `styles.css` defines the `--mv-stage-*` tokens for dark (default) and `[data-theme='light']`; all stage CSS uses only these tokens, so no page has its own theme CSS. The TV page has no switch (no host controls on the dashboard).
- **Guest phone views**: the same stage look as the host pages (team decision 2026-11-03), with their own "Heller Modus" switch, so every guest chooses per device. A bottom tab bar (`mv-guest-tabs`) switches between voting and adding.
- **Icons**: Lucide (MIT) as inline SVG components via a small `<mv-icon name="…">` wrapper, so the bundle only contains used icons. Emoji are removed from controls; they may stay in celebratory copy ("🎉").
- **Fonts**: one variable family, Bricolage Grotesque (OFL), self-hosted via `@fontsource-variable/bricolage-grotesque` (registered in `angular.json`). Its optical-size axis covers both display (TV titles) and text, so no second family is needed.

*Alternative considered:* keeping per-component literals and only patching colours. Rejected, because contrast and focus fixes would have to be repeated in 12 components.

### D2: Shared components
New standalone components under `src/app/shared/`:
- `mv-cover`: `[track]` input. Picks `album.images` safely (largest for TV, smallest for lists), falls back to `assets/img/placeholder.png` on a missing URL or `(error)`, and uses `alt=""`. It replaces all 8 hand-written cover `<img>`s.
- `mv-icon`: Lucide SVGs, with `aria-hidden="true"`. The label lives on the button.
- `mv-host-menu`: burger button + slide-in navigation used by `host-dashboard`, `search-host`, `voting-host` and the blacklist page in edit mode, replacing the copied side menu. The burger sits in the sticky top bar (`.host-top`), which stays visible while scrolling (team decision 2026-11-03). It has the new "Blacklist" entry; the off-context "Startseite" entry is removed.
- `mv-spinner`: one spinner with `role="status"` and a visually hidden label.
- `mv-toast`: a single live region (`aria-live="polite"`, or `role="alert"` for errors) provided by a `ToastService`. It is used for "Song hinzugefügt", backend errors (no undo action; see D7).

### D3: Optimistic, toggleable vote
`toggleVote` flips `hasVoted` and adjusts `likeCount` locally, calls `detectChanges()`, then sends the request. The list order is not changed locally; the next `vote-updated` reload brings the server-sorted order. On error it restores the snapshot and shows the error toast. A `pendingVotes` set ignores a second tap on the same entry until the first request settles; this prevents double requests while staying tappable. Incoming `vote-updated` SSE reloads are merged so that a still-pending local toggle is not overwritten.

The `.voted` CSS gets:
- an accent tint/outline
- a filled `--mv-coral` heart
- a 250 ms scale pop (keyframes, disabled under reduced motion)

`pointer-events`, `opacity` and `grayscale` are removed.

### D4: TV layout
A CSS grid on a 16:9 stage:
- **Left (~60 %):** the now-playing cover (`min(40vh, 45vw)`), title (≥ 48px, clamped with `clamp()`), artist, and progress.
- **Right column:** the fixed QR block (≥ 25vh) with the "Voting-PIN" below it, then the top 5 queue rows (≥ 32px) and "+ N weitere".
- **Footer:** a single-line HTL credit. The same footer component is used on the landing page `/`.

Sizes use `vh`/`clamp()` so 720p and 4K scale proportionally. Rank animation uses FLIP: measure positions before and after the data update, then animate `transform`, keyed by queue entry ID. This avoids pulling in Angular animations for one effect. The empty state replaces the queue column content while keeping the QR block.

### D5: Join with loading state (Q5: keep the app redirect)
The `musicvotingapp://` attempt and the 1.5 s `document.hidden` check in `code-input` stay as they are. A `resolving` flag is set as soon as a PIN is present, before the app attempt, and is cleared on admission or error. While it is set, "Party wird gesucht …" is shown in a live region. The error state keeps the boxes editable and adds the hint text.

### D6: One-time welcome
A `localStorage` key `mv-welcome-<partyId>` is set when "Los geht's" is tapped. It is keyed by party, so a new party shows it again. The device identity itself is unchanged (`deviceId` stays as specified in `voting/spec.md`).

### D7: Removal question instead of undo (changed 2026-11-03)
Tapping "Song entfernen" opens an inline `role="alertdialog"` below the row, the same pattern as the former "Song sperren" confirmation: "„<Titel>“ aus der Warteschlange entfernen?" with "Auch sperren" (danger), "Nur entfernen" and "Abbrechen". "Auch sperren" reuses the existing block flow (blacklist entry first, then remove); "Nur entfernen" sends the existing remove request. The currently playing song gets the question without "Auch sperren". The separate ban button per row is removed, so every row has one action.

- *Alternative: undo toast (the original D7).* Dropped by the team: with the question in front, an undo on top would be a second safeguard for the same action, and the question is also where the host decides about blocking.
- No backend change is needed.

### D8: Host flow routing
- Setup: `select-playlist` → `select-blacklist` (unchanged, still with "Weiter" / "Ohne Blacklist fortfahren") → new route `/party-ready?partyId=…` (component `party-ready`, `hostGuard`) → `/dashboard`.
- During the party: the dashboard menu entry "Blacklist" opens `select-blacklist?partyId=…&mode=edit`. In edit mode the page shows the same word/artist/song editing plus a single "Fertig" back to `/dashboard`.
- `party-ready` offers "Player auf dem TV öffnen" (`window.open`, same device) and short instructions for a separate TV device (MusicVoting → Gastgeber → Gastgeber-PIN → Player öffnen). A copy-link button was dropped (2026-11-03, option A): `/startpage` is behind `hostGuard`, so a copied link opened on another device without the stored host PIN would just land on the start page.
- The `party-ready` page listens to the existing playback-device availability (see `playback/spec.md` "Playback Device Availability Exposed to Clients") to switch to "Party ist live 🎉".

### D9: Testing approach
All behaviour is asserted with DOM-based component specs (Karma/Jasmine, the existing setup):
- aria attributes, text content, classes, and computed font sizes for the TV spec
- `HttpTestingController` for optimistic/rollback ordering

Contrast is verified by a small unit test over the token pairs in `styles.css`, plus a manual check with the Impeccable `audit` step.

## Risks / Trade-offs

- **[Optimistic vote vs. SSE reload race]**: a reload could flip the state back while the request is in flight. → Mitigated by the `pendingVotes` merge (D3).
- **[One more tap to remove a song]** → Acceptable: removal and blocking cannot be undone, so the host should confirm.
- **[New font/icon dependencies]**: rule 8 says always use the latest stable versions. → The versions are pinned at implementation time, and the bundle size is checked in `ng build` output.
- **[Large change]**: touches 12+ components. → Implemented section by section in `tasks.md`, with one commit per section.
- **[Spec drift with iOS]**: the code names and the welcome only apply to web. → The iOS specs are unchanged; a later iOS change can adopt the names.

## Open Questions

None. All questions are answered in [`questions.md`](questions.md).
