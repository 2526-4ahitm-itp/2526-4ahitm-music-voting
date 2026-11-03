# Continuation: refactor-design-fixes (in progress)

_Stand 2026-11-03, Branch `refactor/design`. Nichts gepusht._

## Prompt für die nächste Session

> Wir arbeiten auf dem Branch `refactor/design` am OpenSpec-Change `openspec/changes/refactor-design-fixes/` (Design-Fixes aus der Impeccable-Critique `openspec/analyse/impeccable/ui-ux-critique.md`). Lies zuerst diese Datei, dann `PRODUCT.md`, `openspec/changes/refactor-design-fixes/{proposal,design,tasks,questions}.md` und die Delta-Specs unter `specs/`.
>
> Schritt 1: Den uncommitteten Stand prüfen (`git status`), Frontend-Tests laufen lassen (`cd musicvoting/frontend && CHROME_BIN=/usr/bin/chromium-browser npx ng test --watch=false --browsers=ChromeHeadless`, zuletzt 326/326 grün) und nach Rückfrage committen als `feat(frontend): apply stage design and personal light mode to guest views`.
>
> Schritt 2: Mit `/opsx:apply refactor-design-fixes` die offenen Tasks weiter abarbeiten (siehe unten). Vor jeder UI-Änderung `.claude/skills/impeccable/reference/craft-floor.md` beachten. Commits nur nach Nachfrage, Conventional Commits.

## Was fertig ist (committet)

| Commit | Inhalt |
|---|---|
| `5ee71cf8` | Critique + Change-Proposal mit beantworteten Fragen |
| `5c52f528` | Impeccable-Skill + Agents im Repo (Engine-Binary git-ignored) |
| `3a1909dd` | Design-Tokens, Bricolage Grotesque, Lucide, Shared Components (`src/app/shared/`), TV-Seite neu |
| `c8e2f9ca` | Voting optimistisch + umschaltbar, Gast-Beitritt/Suche mit Feedback, Willkommen, Party-Ende |
| `ac6e7e1d` | Bühnen-Design für Host-Seiten + Blacklist (Edit-Mode `?mode=edit`), sticky Top-Bar mit Burger, Light Mode (`ThemeService`, `mv-theme-toggle`) |

## Uncommittet (fertig, Tests grün)

- Gast-Ansichten `voting-comp` und `guest` im Bühnen-Design mit eigenem Hell/Dunkel-Schalter (jeder Gast pro Gerät).
- Neue Shared-Komponente `mv-guest-tabs` (untere Leiste Voten/Hinzufügen) + Spec.
- `shared/host-stage.css` → `shared/stage.css` umbenannt (alle `styleUrls` angepasst).
- Neue Tokens `--mv-stage-liked`, `--mv-stage-liked-edge` in `styles.css`.
- `web-ui/spec.md`: Gäste haben den Schalter ebenfalls.

## Entscheidungen des Teams (nicht neu aufrollen)

- TV + Host + Gast: dunkle Bühne (`--mv-stage` #12061A) mit Lila/Koralle-Glow; heller Modus per Schalter, Standard dunkel. Heller/voller/gedämpfter Farbverlauf als TV-Hintergrund wurden ausprobiert und verworfen.
- Host-Navigation: Burger + Slide-in bleibt, die Top-Bar ist sticky (`overflow-x: clip`, nicht `hidden`).
- PINs heißen „Voting-PIN“ und „Gastgeber-PIN“ (mit Hinweis „Geheim – damit kommst du zurück ins Dashboard.“).
- App-Redirect beim Gast-Beitritt bleibt (Q5 C), nur mit „Party wird gesucht …“.
- „Link kopieren“ für Player entfällt; stattdessen Anleitung für ein eigenes TV-Gerät (Entscheidung A, `/startpage` hat `hostGuard`).
- Blacklist-Setup-Schritt bleibt; zusätzlich voll bearbeitbar während der Party.
- Provider: Spotify wählbar, „YouTube (bald verfügbar)“ ausgegraut, Amazon weg.
- TV: Cover ≥ 40 % Höhe und größtes Element, QR 32vh, Top 5 + „+ N weitere“, alles rein vh-basiert.

## Offene Tasks (`tasks.md`)

- **1.6** Cover in `select-playlist` noch auf `mv-cover` umstellen.
- **5.x** Barrierefreiheit auf den übrigen Seiten (`home`, `create-party`, `host-options`, `select-playlist`, `code-input` teilweise), globale Kontrast-Unit-Test über Token-Paare, `/impeccable audit`.
- **6.1** PIN-Namen auf `host-options`; **6.2** `create-party` Provider; **6.3** neue Seite `party-ready` („Deine Party ist bereit“, Route nach `select-blacklist`); **6.5** Rückgängig-Toast beim Entfernen im Dashboard (design D7); **6.7** Specs dazu.
- **7.x** Backend-Regression (`./mvnw test`), neue Critique, `/impeccable document` → `DESIGN.md`, README, Screenshots.
- Noch nicht im Bühnen-Look: `code-input`, `mv-party-ended`, `home`, `create-party`, `host-options`, `select-playlist` (nachfragen, ob gewünscht).
- `design.md` D1 sagt noch „Guest phone views: stay light“ → auf „Bühnen-Look mit persönlichem Schalter“ ändern.
- Vor dem Archivieren: `openspec/specs/host/spec.md` hat drei doppelte iOS-Requirements (Zeilen ~469/483/498), die das Archiv blockieren.

## Hinweise

- Chromium ist installiert: `/usr/bin/chromium-browser`, Tests mit `CHROME_BIN` starten.
- Detector-Ausnahmen (`broken-image` für QR-`[src]`-Bindings) stehen in `.impeccable/config.json`.
- `.claude/settings.local.json` (lokale Impeccable-Hooks) nicht committen.
