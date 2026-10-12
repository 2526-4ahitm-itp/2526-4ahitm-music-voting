# Arbeitsregeln — MusicVoting

Verbindliche Regeln für die Arbeit am Projekt und das Erstellen von Code.
Gelten für das gesamte Team und für Claude (wird über `CLAUDE.md` eingebunden).

## 1. Spec-Driven Development

- Jede Änderung (Feature, Fix, Refactoring mit Verhaltensänderung) wird **spec-driven** über OpenSpec umgesetzt:
  Proposal → Delta-Specs → Design → Tasks → Implementierung → Verify → Archiv.
- Änderungen laufen immer über `openspec/changes/<name>/`, nie direkt in `openspec/specs/`.
- Jede Änderung wird in den Specs mitdokumentiert — Code und Specs dürfen nicht auseinanderlaufen.

## 2. Händische Änderungen

- Wenn Code von Hand (ohne Claude) geändert wird, wird Claude darüber informiert.
- Claude trägt diese Änderungen dann in Specs, Tests, README usw. nach.
- Fällt Claude selbst eine undokumentierte Änderung auf (z. B. in `git diff` / `git log`), weist Claude darauf hin und schlägt das Nachtragen vor.

## 3. Tests

- Zu jeder Änderung werden passende Tests geschrieben bzw. bestehende Tests angepasst.
- Alle Tests müssen durchlaufen, bevor eine Änderung als fertig gilt:
  - Backend: `cd musicvoting/backend && ./mvnw test` (PostgreSQL muss laufen: `cd musicvoting && docker compose up -d`)
  - Frontend: `cd musicvoting/frontend && npx ng test --watch=false --browsers=ChromeHeadless`
- Tests ohne Erwartungen (`expect`) sind nicht erlaubt.

## 4. Code-Kommentare

- Der gesamte Code wird mit Code-Kommentaren versehen: Klassen, öffentliche Methoden und nicht offensichtliche Logik.
- Kommentare erklären das *Warum*, nicht nur das *Was*.

## 5. Commits & Push

- Commit und Push erfolgen **nur nach Nachfrage** bei Miriam.
- Alle Commits folgen **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, … optional mit Scope, z. B. `feat(frontend): …`).
  Siehe `hugo/content/project/convetional-commits-cheatsheet.md`.
- Regelmäßig committen: nach jedem abgeschlossenen, sinnvollen Arbeitsschritt einen Commit vorschlagen (und nach Zustimmung durchführen).

## 6. Projektpräsentation (`hugo/content/slides/index.md`)

- **Sprintabgabe (alle zwei Wochen):** Der Projektstatus in der Präsentation wird überarbeitet und enthält immer den aktuellen Stand **mit aktuellen Fotos/Screenshots**.
- **Zwischen den Sprints:** Die Präsentation wird nur angepasst, wenn es **unbedingt notwendig** ist (z. B. Inhalte sind durch Änderungen falsch geworden).

## 7. README

- Die README-Dateien (`README.adoc`, `musicvoting/backend/README.md`, `musicvoting/frontend/README.md`) werden überarbeitet, sobald sie nicht mehr dem aktuellen Stand entsprechen.

## 8. Versionen & Abhängigkeiten

- Es werden immer die neuesten stabilen Versionen verwendet (Quarkus, Angular, Java, Node-Pakete, Docker-Images, …).
- Gibt es neuere Versionen, wird darauf hingewiesen — **aktualisiert wird erst nach Nachfrage** bei Miriam.
- Nach einem Update müssen alle Tests wieder durchlaufen.
