# Continuation: refactor-design-fixes – Critique-Nacharbeit (Stand Nacht)

_Stand 2026-11-03 spät, Branch `refactor/design`, gepusht bis `00932690`, Upstream `origin/refactor/design`. Arbeitsbaum sauber bis auf `.claude/settings.local.json` (nicht committen)._
_Löst `2026-11-03_refactor-design-fixes-stage-everywhere.md` ab._

## Prompt für die nächste Session

> **Wichtig: Erst prüfen lassen, dann ausführen.** Führe in dieser Session zunächst **nichts** aus, was Dateien ändert, committet oder pusht. Lies die unten genannten Dateien, prüfe den Stand (nur lesend) und lege mir einen **Ausführungsplan zur Prüfung** vor. Erst wenn ich den Plan ausdrücklich freigegeben habe (ggf. mit Änderungen), setzt du ihn um.
>
> **Schritt 1 – Lesen (nur lesend):**
> - Diese Datei.
> - `openspec/changes/refactor-design-fixes/{proposal,design,tasks}.md` und die Delta-Specs unter `specs/` (dashboard, guest, host, voting, web-ui).
> - Die Design-Bewertung `openspec/analyse/impeccable/ui-ux-critique-2026-11-03-after-redesign.md` (27/40) und den Audit `openspec/analyse/impeccable/audit-2026-11-03.md` (16/20).
> - Vor UI-Arbeit: `.claude/skills/impeccable/reference/craft-floor.md`.
>
> **Schritt 2 – Stand prüfen (nur lesend):** `git status`, `git log --oneline -10`, `openspec validate refactor-design-fixes`. Tests nur laufen lassen, wenn ich es im Plan freigebe (Frontend zuletzt **405/405**, Backend **192/192**).
>
> **Schritt 3 – Plan zur Prüfung vorlegen.** Für jede offene Aufgabe unten:
> - was genau geändert wird (Dateien, Komponenten);
> - welche Spec-Texte neu oder geändert werden (Zitat des geplanten Wortlauts bei Spec-Änderungen, besonders 8.4 Gastgeber-PIN);
> - welche Tests dazukommen;
> - Reihenfolge und vorgeschlagene Commits (Conventional Commits).
>
> Offene Fragen stellst du im Plan, statt sie selbst zu entscheiden. Danach **warten**.
>
> **Schritt 4 – Erst nach Freigabe:** umsetzen über `/opsx:apply refactor-design-fixes`, nach jedem Schritt Tests und Commit-Vorschlag; Commit und Push nur nach Nachfrage.

## Was in dieser Session passiert ist

| Commit | Inhalt |
|---|---|
| `c1d9870e` | Neue Seite `/party-ready` („Deine Party ist bereit“, Player öffnen, Anleitung für anderes Gerät, Voting-PIN, „Party ist live 🎉“ per Polling von `GET /track/current` alle 3 s). Blacklist-„Weiter“/„Ohne Blacklist fortfahren“ führen dorthin (6.3) |
| `990b2cd3` | Hell/Dunkel für Gäste getrennt vom Host (`mv-guest-theme` vs. `mv-theme`, Scope-Wechsel bei Router-`ResolveEnd`, Gast startet mit der Wahl der Einstiegsseiten); „powered by“ auf `/` 1.25rem (5b.3, 5b.4) |
| `42e70df5` | Barrierefreiheit 5.1–5.7: globaler Fokusring `!important`, Fokus-Rückgabe im Host-Menü, Kontrast-Test über alle Tokens mit echten Glow-Verläufen (`shared/contrast.tokens.spec.ts`), Hell-Akzent `#80231A`, DOM-Baseline `pages/a11y-baseline.dom.spec.ts`, Audit 16/20 |
| `73ff537f` | Doppelte iOS-Requirements aus `openspec/specs/host/spec.md` entfernt (über Change `fix-host-spec-duplicates`, archiviert mit `--skip-specs`) |
| `6461c43d` | `hide-blocked-artists-in-search` archiviert |
| `571c646b` | Tests: TV zeigt nie Gastgeber-PIN; Blacklist-Edit-Modus speichert sofort (1.6, 6.7, 7.1 abgehakt) |
| `efddd2f4` | Design-Bewertung nach dem Umbau: **27/40** (vorher 18/40) |
| `00932690` | 8.1 Gast-Handy: „Läuft gerade“-Leiste, Rangnummern, Like-Hervorhebung, Toast „Song hinzugefügt – Platz N“ + „Zum Voten“. 8.2 Platzhalter als dunkle SVG-Kachel (`assets/img/cover-placeholder.svg`), leerer TV ohne „Als Nächstes“ mit großem QR |

## Entscheidungen des Teams (nicht neu aufrollen)

Zusätzlich zu denen in den beiden älteren Continuations vom 2026-11-03:

- **Gäste und Host haben getrennte Hell/Dunkel-Einstellungen.** Gast-Seiten: `/code`, `/join/:pin`, `/voting`, `/guest`.
- **Design-Bewertung:** Alle Punkte inkl. P3 werden in diesem Sprint umgesetzt (Abschnitt 8 in `tasks.md`).
- **Gastgeber-PIN im Dashboard verbergen:** ja, als „•••••“ mit „Anzeigen“. Das ist eine **Spec-Änderung** (Host-Spec verlangt heute die sichtbare PIN mit Hinweis) und muss im Delta stehen.
- **Blacklist „Weiter“ bleibt** deaktiviert, solange nichts gesperrt ist, plus „Ohne Blacklist fortfahren“ (Spec). Der Vorschlag „immer aktiv“ wurde abgelehnt.
- **Party-ready:** kein Zurück-Button, Setup geht nur vorwärts.

## Offene Aufgaben

`openspec/changes/refactor-design-fixes/tasks.md`:

- **8.3 (P2) Blacklist mit einem Suchfeld:** Wort, Künstler und Song in ein Feld zusammenführen; Ergebnisse: zuerst „Wort „x“ sperren“, dann Künstler, dann Songs. Gilt für Setup und Edit-Modus. Tabs (heute 40 px, Audit-P3) fallen damit weg. Spec: `host/spec.md` „Host Manages Party Blacklist“ im Delta anpassen.
- **8.4 (P2) Host-Navigation und PIN:**
  - `mv-host-menu` ab 1024 px als feste Leiste statt Burger (Burger bleibt am Handy).
  - Gastgeber-PIN im Dashboard maskiert „•••••“ mit „Anzeigen“ und unter die Aktionen. Spec-Änderung (siehe oben).
- **8.5 (P3) Kleineres:**
  - Logo (`assets/logo.png`, heute nur Favicon) auf `/` und im TV-Footer.
  - Gäste sehen „Party 12345“ in der Kopfzeile, mit „Party verlassen“ (PartyService `clearParty`, zurück zu `/`).
  - Gast-Überschriften sind Slogans („Vote für deine Lieblingssongs!“) – mit der Party-Kennung zusammen überdenken (Vorschlag im Plan machen).
  - `assets/img/htl-leonding-logo.jpg` ist 2763×727 px für eine Fußzeile (Angular-Warnung NG0913) → verkleinerte Kopie.
  - `/voting` ohne Backend: `EmptyErrorImpl` beim Laden der Playlist nicht abgefangen (`lastValueFrom` auf `EMPTY`, `{ defaultValue }` nutzen).
- **8.6** Design-Bewertung neu (`/impeccable critique musicvoting/frontend/src/app`, zwei getrennte Sub-Agenten A/B), Ziel **≥ 28/40**. Danach 7.2 abhaken.
- **7.3** `/impeccable document` → `DESIGN.md`.
- **7.4** `musicvoting/frontend/README.md` (Shared Components, Tokens, Schriften/Icons, Theme-Scopes, Kontrast-Test) und Host-Flow in `hugo/content/dev/` falls beschrieben.
- **7.5** Neue Screenshots in `hugo/content/status/screens/` für die Sprintabgabe; danach `hugo/content/slides/index.md` (Projektstatus) laut ARBEITSREGELN §6.
- Danach `refactor-design-fixes` archivieren (`/opsx:archive`).

Optional aus dem Audit (nur auf Nachfrage): Spinner bei „Bewegung reduzieren“ (globaler `0.01ms`-Kill friert ihn ein), Initial-Bundle 538 kB > 500-kB-Budget (Lazy-Routen, `stage.css` global statt pro Komponente), einzelne rgba-Farben als Tokens.

## Hinweise

- **Screenshots mit Testdaten ohne Backend:** `ai/scratch/screenshot-tools/snap-mock.mjs` (git-ignoriert) beantwortet `/api/*` im Browser mit einer Beispiel-Party (6 Songs, PIN 47291, Gastgeber-PIN 83615, Blacklist-Einträge), stubbt das Spotify-SDK und liefert einen QR. `snap.mjs` macht dasselbe ohne Mock-Daten.
  - Vorher: `cd musicvoting/frontend && npx ng serve --port 4200` (im Hintergrund) und `chromium-browser --headless=new --remote-debugging-port=9333 --user-data-dir=<tmp>`.
  - Aufruf: `node ai/scratch/screenshot-tools/snap-mock.mjs /voting out.png 390 844 dark` (TV: `/startpage … 1920 1080`).
  - Neue Dateien in `src/assets` liefert `ng serve` erst nach Neustart aus.
  - `/select-playlist`, `/select-blacklist`, `/party-ready` brauchen `?partyId=demo` in der URL.
- **Prozesse aufräumen:** `pkill -f <muster>` trifft auch die eigene Shell, wenn das Muster in der Befehlszeile steht – PIDs gezielt beenden und danach `ss -ltn | grep -E ":4200|:9333"` prüfen.
- **Kontrast:** Neue Texte nur auf Flächen, die `shared/contrast.tokens.spec.ts` abdeckt (Glow, `--mv-stage-card`, `-row`, `-bar`; auf `--mv-stage-tint-2` direkt auf dem Glow nur `--mv-on-stage`). Sonst den Test erweitern.
- **URL-Scans** von `/voting` und `/guest` laufen wegen SSE in ein Timeout; das Overlay über CDP funktioniert.
- **Vor der Abgabe in der echten App prüfen** (braucht Spotify-Login der Host-Person): „Party ist live 🎉“, Toast „Song hinzugefügt – Platz N“, Hellmodus mit Akzent `#80231A`, `select-playlist` und `mv-party-ended`.
- Chromium: `/usr/bin/chromium-browser`, Frontend-Tests mit `CHROME_BIN=/usr/bin/chromium-browser`.
