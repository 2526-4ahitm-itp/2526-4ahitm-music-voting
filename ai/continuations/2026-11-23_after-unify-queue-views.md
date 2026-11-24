# Continuation: nach `unify-queue-views` (umgesetzt, noch nicht archiviert)

_Stand 2026-11-23, Branch `refactor/design`, lokal 6 Commits vor `origin/refactor/design` (**nicht gepusht**), Arbeitsbaum sauber bis auf diese Datei. Löst `2026-11-17_after-refactor-design-fixes.md` ab._

## Prompt für die nächste Session

> **Erst prüfen lassen, dann ausführen.** Lies diese Datei, prüfe den Stand nur lesend (`git status`, `git log --oneline -10`, `openspec list`) und frag mich, womit wir weitermachen – Vorschläge siehe „Offene Punkte“ (empfohlen: 1 → 2 → 3 → 4). Nichts ändern, committen oder pushen, bevor ich zustimme. Neue Arbeit läuft spec-driven über `openspec/changes/<name>/` (ARBEITSREGELN §1).

## Was erledigt ist

Design-Entscheidungen wurden in `openspec/analyse/impeccable/design-entscheidungen-2026-11-23.md` beantwortet und im Change `openspec/changes/unify-queue-views/` umgesetzt (36/37 Tasks, nur 8.3 offen). Danach kamen drei Feedback-Runden des Teams, alle im selben Change nachgetragen (Tasks 3b, 3c).

| Commit | Inhalt |
|---|---|
| `45def3b1` | Change `unify-queue-views` vorgeschlagen + Antwortdatei |
| `ca2afb3e` | **Gast: eine Seite** `/voting` (Warteschlange + Suche; gequeute Treffer mit Herz, sonst „+“), „Suche leeren“-x, Bestätigungen „Song hinzugefügt – Platz N“ / „Geliked – jetzt auf Platz N“ als lila Karte mit Icon (1,5 s), Willkommen mit Kurzanleitung (schließt nach 10 s), Hinweise „… vom Gastgeber gesperrt.“; `/guest`, `/voting-host`, `/search-host` leiten weiter; `QueueStateService` entfernt |
| `a5ab38fc` | **Host-Dashboard = einzige Queue-Ansicht:** Suchfeld wie beim Gast (gesperrt = „Nicht erlaubt.“), Host kann liken (ein Like pro Gerät), Rang/Likes auch am Handy, Fokus + Escape in Rückfragen, „Entfernen und sperren“, sichtbar „Blocklist“, Menü nur Dashboard + Blocklist mit Logo und „Party läuft · PIN“, „Player auf diesem Gerät öffnen“ + 5 Schritte für anderes Gerät (`shared/mv-other-device-steps`, Link fest auf LeoCloud in `shared/public-url.ts`), PIN-Tags „für Gäste“ / „nur für dich“ |
| `358aa2fa` | TV: Like-Puls (bei reduzierter Bewegung nur Farbe), weißer Logo-Glow im Dunkelmodus; Glow-Tokens; Theme-Schalter nur Icon; Startseite am Handy mit Logo links |
| `d59ffdd2` | README, Hugo (`dev/frontend`, `authentication`, `realtime-sse`), `DESIGN.md` |
| `9ffa2e7d` | Change-Updates + Proposal `rename-blacklist-to-blocklist` |

Tests: Frontend 414/414, Backend 192/192 (Backend unverändert). `openspec validate` ohne Fehler. `ng build` ok, nur Budget-Warnungen (siehe unten).

## Offene Punkte

1. **Push** `refactor/design` → `origin` (nur auf Nachfrage).
2. **Task 8.3 – manueller Durchlauf in Chrome mit echter Party:** Gast (beitreten → suchen → hinzufügen → liken, „Suche leeren“), Host am Handy (suchen, liken, entfernen/sperren per Tastatur mit Fokus + Escape), TV (Puls, Logo-Glow), „Player auf anderem Gerät öffnen“-Link. Danach Task abhaken.
3. **`unify-queue-views` archivieren** (`/opsx:archive`) → Deltas nach `openspec/specs/`.
4. **Pull Request** `refactor/design` → `main` (`gh` ist nicht installiert → über GitHub-Compare-Seite oder `gh` installieren + `gh auth login`).
5. **Change `rename-blacklist-to-blocklist`:** nur `proposal.md` vorhanden. Specs (RENAMED), Design, Tasks schreiben, dann umbenennen: Frontend (Route `/select-blacklist` → `/select-blocklist` mit Redirect, Klassen, Service), Backend (`Blacklist*`-Klassen, REST `/blacklist…`, SSE `blacklist-updated`), Tabelle `blacklist_entry` in `setup.sql` **und** `deployment/k8s/01-postgres.yaml`. LeoCloud braucht keine Migration (Postgres ohne Volume, wird bei jedem Start neu initialisiert); eigener Server / lokale Volumes: einmal `ALTER TABLE blacklist_entry RENAME TO blocklist_entry;`. iOS nutzt die Blacklist nicht. Erst nach dem Merge.
6. **Change `fix-player-device-feedback`** (aus der alten Continuation, unverändert offen): DRM/Widevine stumm in Firefox privat / Chromium, kein Hinweis im Player (`spotify-player.ts`), Backend weicht still auf beliebiges Spotify-Gerät aus (Teamentscheidung nötig), Play/Pause: Backend reicht Spotify-Text durch → `HttpErrorResponse` trotz 200 in `host-dashboard`.
7. **Budget-Warnungen:** `anyComponentStyle` 4 kB überschritten von `stage.css`, `startpage.css` (schon vorher), `host-dashboard.css`, `voting-comp.css` (neu, je ~0,5–1 kB); Initial-Bundle ~549 kB > 500 kB (schon vorher). Grenze auf 6 kB anheben oder CSS kürzen – Teamentscheidung.
8. **Doku veraltet:** `hugo/content/docs/specification.md` sagt bei der Blacklist „Teilstring“ – laut Spec ganzes Wort.
9. **Offene Frage aus `CLAUDE.md`:** leere Warteschlange – Stop/Pause (Web) oder Zufalls-Top-Charts (iOS)?
10. **Kleinkram aus früher:** Screenshot-Skript (Player-Seite leer ohne Spotify-SDK), 30 Spec-Warnungen „Requirement text is very long“, Spinner bei „Bewegung reduzieren“.

## Entscheidungen (nicht neu aufrollen)

- Gast hat **eine** Seite; kein Tab-Bar, keine Aktion im Toast.
- Host-Suche funktioniert wie beim Gast; „+ Song“-Karte und eigener Filter wurden verworfen.
- Host liked wie ein Gast (deviceId, ein Like pro Gerät); kein Herz für den laufenden Song.
- Gesperrte Songs: beim Gast nur die Hinweiszeile („… vom Gastgeber gesperrt.“), kein Text am Song; Host sieht „Nicht erlaubt.“.
- „Blacklist“ → „Blocklist“ **überall**; sichtbare Texte sind erledigt, Code/API/DB im eigenen Change (Punkt 5).
- TV-Layout bleibt wie vorher (Spalt in der Mitte); Like-Puls und Logo-Glow bleiben.
- Bestätigungen 1,5 s (4 s und 2,5 s waren zu lang), Fehler 4 s. Konstante `CONFIRM_MS` in `voting-comp.ts`.
- Willkommen schließt nach 10 s und gilt dann als gesehen.
- Link „MusicVoting öffnen“ zeigt immer `it220241.cloud.htl-leonding.ac.at` (`shared/public-url.ts`), auch lokal; für den eigenen Server dort ändern.
- party-ready: Hauptknopf/Live-Status wie gehabt, kein Zurück, kein Kopier-Link.

## Hinweise

- Port 4200 = `ng serve` der Nutzerin (nicht beenden). Eigene Browser-Checks: `npx ng serve --port 4300` im Hintergrund und gezielt beenden.
- Mock-Screenshots ohne Backend: `ai/scratch/screenshot-tools/snap-mock.mjs` (Base-URL 4200, git-ignoriert). In dieser Session lief eine Kopie mit Port 4300 und Suchtext-Parameter aus dem Scratchpad; Headless-Chromium mit `--remote-debugging-port=9333`.
- Angular-Stilkapselung: `shared/stage.css` wirkt nicht in Kind-Komponenten – Shared Components brauchen eigene Styles (Grund, warum die erste Host-Suche ungestylt war).
- PostgreSQL läuft per Docker (`cd musicvoting && docker compose up -d`), wurde in dieser Session gestartet.
- Tests: Frontend `CHROME_BIN=/usr/bin/chromium-browser npx ng test --watch=false --browsers=ChromeHeadless`, Backend `cd musicvoting/backend && ./mvnw test`.
- Claude in Chrome: Spotify-Login in Chrome gespeichert (siehe Memory „Player needs DRM browser“: Player nur in echtem Chrome hörbar).
