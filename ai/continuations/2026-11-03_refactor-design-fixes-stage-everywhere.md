# Continuation: refactor-design-fixes – Bühnen-Look überall (Stand Abend)

_Stand 2026-11-03, Branch `refactor/design` (lokal, noch nie gepusht, kein Upstream). Arbeitsbaum sauber bis auf `.claude/settings.local.json` (nicht committen)._
_Löst `2026-11-03_refactor-design-fixes-in-progress.md` ab._

## Prompt für die nächste Session

> Wir arbeiten auf dem Branch `refactor/design` an zwei OpenSpec-Changes: `openspec/changes/refactor-design-fixes/` (Design-Fixes, Hauptarbeit) und `openspec/changes/hide-blocked-artists-in-search/` (fertig implementiert, nur noch archivieren). Lies zuerst diese Datei, dann `openspec/changes/refactor-design-fixes/{proposal,design,tasks}.md` und die Delta-Specs unter `specs/`.
>
> Schritt 1: `git status` prüfen; Tests laufen lassen – Frontend `cd musicvoting/frontend && CHROME_BIN=/usr/bin/chromium-browser npx ng test --watch=false --browsers=ChromeHeadless` (zuletzt **353/353**), Backend `cd musicvoting && docker compose up -d && cd backend && ./mvnw test` (zuletzt **192/192**).
>
> Schritt 2: Fragen, ob der Branch gepusht werden soll (noch nie gepusht).
>
> Schritt 3: Mit `/opsx:apply refactor-design-fixes` die offenen Tasks abarbeiten (Liste unten), sinnvollerweise zuerst 6.3 (`party-ready`), dann 5.x Barrierefreiheit, dann 7.x. Vor UI-Änderungen `.claude/skills/impeccable/reference/craft-floor.md` beachten. Commits nur nach Nachfrage, Conventional Commits.

## Commits dieser Session (alle auf `refactor/design`)

| Commit | Inhalt |
|---|---|
| `05096180b` | Gast-Ansichten im Bühnen-Look, `mv-guest-tabs`, `stage.css`-Umbenennung |
| `992178b3` | **hide-blocked-artists-in-search**: Gast-Suche (`audience=guest`) blendet Songs gebannter Artists aus; Backend liefert `hiddenHint` (`ARTIST`/`SOME`/`null`); Hinweis unter dem Suchfeld „Dieser Artist ist nicht zulässig." / „Einige Ergebnisse sind auf dieser Party nicht zulässig." (auch bei ausgegrauten Songs); Host-Suche + iOS unverändert |
| `05e4f693` | Entfernen-Rückfrage im Dashboard: „Auch sperren" / „Nur entfernen" / „Abbrechen" (spielender Song ohne „Auch sperren"); separater „Song sperren"-Button weg; ersetzt den geplanten Undo-Toast (D7, Task 6.5) |
| `42f63241` | Mittel-Glow (`--mv-stage-center-glow`) + dichtere Karten im Dunkelmodus; Hellmodus Glow 0.5 + pastelliger Mittel-Glow, dunklere Light-Inks (muted `#4E3D56`, accent `#842419`); TV behält Light-Glow 0.35 (`--mv-stage-tv-glow`) |
| `2908ed6c` | TV: „MusicVoting" 3.4vh, „powered by" 2.6vh (bleibt kleiner als Queue-Titel 3.1vh) |
| `02a695d5` | Bühnen-Look für `home`, `code-input`, `host-options`, `create-party`, `select-playlist`, `mv-party-ended`; Theme-Schalter überall; neue Spec-Anforderung „Every Web Page Uses the Stage Look"; Tasks 5c, 6.1, 6.2 erledigt |

## Entscheidungen des Teams (nicht neu aufrollen)

Zusätzlich zu denen in `2026-11-03_refactor-design-fixes-in-progress.md`:

- **Gebannte Artists** werden in der Gast-Suche ganz ausgeblendet, Wort-/Song-Sperren bleiben ausgegraut. Hinweis „Dieser Artist …" nur bei exaktem Namen (case-insensitive), sonst der allgemeine Hinweis. Host-Suche zeigt weiter alles ausgegraut mit „Nicht erlaubt.".
- **Entfernen aus der Warteschlange** fragt immer nach (drei Optionen); kein Undo-Toast.
- **Farben:** Dunkel mit Glow auch in der Mitte; Hell mit sichtbarem Pastell-Glow statt fast weiß. Kein vollflächiger Markenverlauf als Seitenhintergrund – nirgends. TV bekommt keinen Mittel-Glow.
- **Die ganze Web-App** nutzt jetzt `shared/stage.css`; jede Seite hat den Hell/Dunkel-Schalter (Ausnahme: TV).

## Offene Tasks

`refactor-design-fixes/tasks.md`:
- **1.6** nur noch `impeccable detect` laufen lassen (alle Cover nutzen `mv-cover`).
- **5.1–5.7** Barrierefreiheit: vieles durch den Umbau schon erledigt (Zurück-Pfeile sind Buttons, Icon-Buttons haben Labels) – prüfen, abhaken, Rest erledigen; globaler Kontrast-Unit-Test über Token-Paare (5.5), `/impeccable audit` (5.7).
- **6.3** neue Seite `party-ready` („Deine Party ist bereit", Route nach `select-blacklist`, `hostGuard`) – im Bühnen-Look mit den Bausteinen aus `stage.css` (`stage-column`, `stage-heading`, `host-btn large`).
- **6.7** restliche Specs (party-ready, blacklist edit mode …).
- **7.1–7.5** Regression, neue Critique, `/impeccable document` → `DESIGN.md`, README (`musicvoting/frontend/README.md`: Shared Components/Tokens), neue Screenshots für die Sprintabgabe.

`hide-blocked-artists-in-search`: alle Tasks erledigt → archivieren (`/opsx:archive`).

## Blocker fürs Archivieren

`openspec/specs/host/spec.md` hat drei doppelte iOS-Requirements (Zeilen ~469/483/498: „iOS Host Controls Include Authorization Header", „iOS Admin View Previews First Queued Song Before Playback", „iOS Host PIN Entry Uses Digit-Box Input"). Beide Changes haben Host-Deltas → Archiv schlägt fehl, bis die Duplikate entfernt sind (kleiner eigener Change oder im Rahmen eines der beiden).

## Hinweise

- Chromium: `/usr/bin/chromium-browser`, Tests mit `CHROME_BIN`.
- Screenshots im Hellmodus: Theme liegt in `localStorage['mv-theme']`. Neue Dateien in `src/assets` liefert `ng serve` erst nach Neustart aus – einfacher per Chrome-DevTools-Protokoll (Node-Skript: Seite laden, `localStorage.setItem('mv-theme','light')`, neu navigieren, `Page.captureScreenshot`).
- `select-playlist` und `mv-party-ended` wurden nur per DOM-Test geprüft (brauchen laufende Party) – beim nächsten echten Durchlauf ansehen.
- Neue Light-Accent-Farbe `#842419` (dunkler) an ~15 Stellen – im Hellmodus einmal in der echten App prüfen.
- Detector-Ausnahmen (`broken-image` für QR-`[src]`) in `.impeccable/config.json`.
