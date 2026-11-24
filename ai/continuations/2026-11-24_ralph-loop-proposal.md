# Continuation: Ralph-Loop-Tooling vorgeschlagen (`add-ralph-loop-tooling`, noch nicht umgesetzt, nicht committet)

_Stand 2026-11-24. Ergänzt `2026-11-24_after-rebase-onto-main.md` (die gilt weiter: `refactor/design-rebased` ist noch nicht gepusht)._

## Prompt für die nächste Session

> **Erst prüfen lassen, dann ausführen.** Lies diese Datei und `openspec/changes/add-ralph-loop-tooling/` (proposal, design, tasks). Prüfe den Stand nur lesend (`git status`, `git log --oneline -5`, `openspec status --change add-ralph-loop-tooling`) und frag mich, womit wir weitermachen. Vorschläge siehe „Offene Punkte“, empfohlen 1 → 2 → 3. Nichts ändern, committen oder pushen, bevor ich zustimme. Umsetzung über `/opsx:apply add-ralph-loop-tooling` (ARBEITSREGELN §1). Die Entscheidungen unten sind getroffen, bitte nicht neu aufrollen.

## Was ein Ralph-Loop ist (Kurzfassung)

Ein Bash-Loop startet pro Task einen frischen `claude -p`-Prozess. Das Gedächtnis liegt auf der Platte (Taskliste, Progress-Log, git), Tests sind die Backpressure. Pro Durchlauf wird genau ein Task erledigt, am Ende steht ein Promise (`COMPLETE` / `BLOCKED:…` / `DECIDE:…`).
Quellen: https://github.com/snarktank/ralph, https://ralphloop.sh/, https://ghuntley.com/ralph/

Kernidee für dieses Repo: **OpenSpec ist schon das PRD.** `tasks.md` ersetzt `prd.json`, und Ralph ersetzt nur den Apply-Schritt. Planung bleibt interaktiv (`/opsx:propose`).

## Getroffene Entscheidungen (Explore-Session)

| # | Entscheidung |
|---|---|
| 1a | Ralph committet nach jedem Task lokal auf `ralph/<change>`, **nie Push**. Dafür eine Ausnahme in ARBEITSREGELN §5, **Team-Zustimmung (Miriam, Marlies) offen** |
| 2a | Ralph macht nur die Implementierung. Proposal, Specs und Design fasst er nie an; bei Spec-Lücken → `DECIDE:` |
| 3a | Git-Worktree auf dem eigenen Rechner, Allowlist in `.claude/settings.json`, **kein** `--dangerously-skip-permissions` |
| 3a/DB | **Eigene Test-DB `musicvoting_test`** (`%test`-Datasource). Backend-Tests nutzen bisher dieselbe DB wie `quarkus:dev` |
| 4b | Progress-Log unter `openspec/changes/<change>/ralph-progress.md`, wird mitarchiviert |
| 5b | Minimal starten: `ralph-iteration`-Skill + `script/ralph.sh`. `/ralph:ready` und `/ralph:status` erst nach dem Pilot |
| 6a | Drei Promises, geprüft wird nur die **letzte nicht-leere Zeile**. Exit-Codes 0 COMPLETE, 1 Cap, 2 BLOCKED, 3 DECIDE |
| 7a | `openspec/config.yaml` aktualisieren. Dort steht noch Java 21 / PG 16, und die Leere-Queue-Frage ist noch als offen markiert (Task 5.1) |
| Browser | **`playwright-cli`** statt Chrome-Extension, eigener Stack: Backend 8180 gegen Test-DB, Frontend 4300 mit `proxy.ralph.json`. OAuth/DRM-Flows → „manual check needed“ im Log |

## Stand

- Change `openspec/changes/add-ralph-loop-tooling/` angelegt: `proposal.md`, `design.md` (D1–D12), `tasks.md` (17 Tasks, 6 Gruppen), `.openspec.yaml` mit `skip_specs: true` (reines Tooling, kein App-Verhalten).
- `openspec validate add-ralph-loop-tooling` → valid.
- **Nicht committet.** Vorgeschlagener Commit: `docs(openspec): propose add-ralph-loop-tooling`.
- Es wurde noch kein Code, kein Skript und keine DB-Änderung umgesetzt.

## Wichtige Fakten für die Umsetzung

- `playwright-cli` ist **nicht global installiert**. Es läuft über `npx -y @playwright/cli@latest` (unter Node 26 getestet, `--help` funktioniert). Es bringt einen eigenen Agent-Skill mit (`playwright-core/lib/tools/skills/playwright-cli/SKILL.md`), der nach `.claude/skills/playwright-cli/` soll (Task 2.2).
- Backend-Datasource: `application.properties` hat nur `jdbc:postgresql://localhost:5432/musicvoting`, kein `%test`. Das Schema kommt nur aus `setup.sql`, es gibt 11 `@QuarkusTest`-Klassen.
- Docker-Init-Skripte laufen nur auf leerem Volume (`db_data_pg19`). Darum zusätzlich das idempotente `script/create-test-db.sh` (Task 1.2).
- Port 4200 = `ng serve` der Nutzerin, nicht anfassen. `quarkus.http.port` kommt aus `app.public.port`.
- Es gibt noch keine `.claude/settings.json`, nur `settings.local.json` mit den impeccable-Hooks. Der Stop-Hook (30 s) läuft auch in jedem Loop-Durchlauf; ob er übersprungen wird, ist eine offene Frage im Design, zu klären nach dem Pilot.
- Lokale Umgebung wie in `2026-11-24_after-rebase-onto-main.md`: `nvm use 26`, `JAVA_HOME=$HOME/.jdks/temurin-25.0.3`, `CHROME_BIN=/usr/bin/chromium-browser`.

## Offene Punkte (Vorschlag zur Reihenfolge)

1. Change-Dateien committen (`docs(openspec): propose add-ralph-loop-tooling`), nach Zustimmung.
2. §5-Ausnahme im Team abklären (Miriam, Marlies). Ohne Zustimmung läuft der Loop mit `RALPH_NO_COMMIT=1`.
3. `/opsx:apply add-ralph-loop-tooling`, mit Gruppe 1 (Test-DB) zuerst, weil sie das lokale Setup aller ändert.
4. Danach den Pilot vorbereiten: `rename-blacklist-to-blocklist` interaktiv fertig spezifizieren (bisher nur `proposal.md`), dann `script/ralph.sh rename-blacklist-to-blocklist 10`.
5. Nach dem Pilot: `/ralph:ready` und `/ralph:status` als eigene Change vorschlagen und die Stop-Hook-Frage entscheiden.
