# Continuation: nach `refactor-design-fixes` (archiviert)

_Stand 2026-11-17, Branch `refactor/design`, gepusht bis `30c25e2a` (= `origin/refactor/design`), Arbeitsbaum sauber bis auf `.claude/settings.local.json` (nicht committen). Löst alle Continuations vom 2026-11-03 ab._

## Prompt für die nächste Session

> **Erst prüfen lassen, dann ausführen.** Lies diese Datei, prüfe den Stand nur lesend (`git status`, `git log --oneline -15`, `openspec list`) und frag mich, womit wir weitermachen – Vorschläge siehe „Offene Punkte“. Nichts ändern, committen oder pushen, bevor ich zustimme. Neue Arbeit läuft spec-driven über `openspec/changes/<name>/` (ARBEITSREGELN §1).

## Was erledigt ist

Change `refactor-design-fixes` ist fertig und archiviert (`openspec/changes/archive/2026-11-17-refactor-design-fixes/`), die Deltas sind in `openspec/specs/` übernommen (dashboard, guest, host, voting aktualisiert; `web-ui` neu).

Commits dieser Session (alle gepusht):

| Commit | Inhalt |
|---|---|
| `1a6e44e0` | Blacklist: ein Suchfeld für Wort, Künstler, Song |
| `aebfe37c` | Host-Navigation ab 1024 px als feste Leiste |
| `7d187842` | Gastgeber-PIN im Dashboard verborgen bis „Anzeigen“ |
| `5ed0cc8c` | `/voting` ohne Party ohne `EmptyError`; HTL-Logo verkleinert |
| `63584ad9` | Logo auf `/` und TV; Gäste: „Warteschlange“/„Song suchen“, „Party 12345“ + „Party verlassen“ |
| `21cb9251` | Lange Delta-Requirements aufgeteilt; Tests 426/426 (Frontend), 192/192 (Backend) |
| `90fecb6f` | Design-Bewertung 27/40 (Ziel 28 knapp verfehlt, vom Team akzeptiert) |
| `b66f957c` | `DESIGN.md` (Repo-Root) + `.impeccable/design.json` |
| `a5c35dfd` | Frontend-README neu, `hugo/content/dev/frontend.md` aktualisiert |
| `49f6781f` | Neue Screenshots aus echter Party, alte unter `hugo/content/status/screens/archive/2026-10-12/` |
| `30c25e2a` | Change archiviert |

## Offene Punkte (nichts davon ist begonnen)

1. **Pull Request** `refactor/design` → `main` (erst danach funktioniert der `DESIGN.md`-Link in `hugo/content/dev/frontend.md`). Nur auf Nachfrage anlegen.
2. **Abspielen – eigener Change, Vorschlag `fix-player-device-feedback`:**
   - Player (`/startpage`) braucht DRM/Widevine: in Chrome ok, im privaten Firefox-Fenster und Fedora-Chromium stumm, App zeigt trotzdem „spielt“.
   - Kein Hinweis im Player, wenn das SDK nicht abspielen kann (`spotify-player.ts:101-112` nur Konsole; kein `activateElement()` / `autoplay_failed`).
   - Backend weicht still auf ein beliebiges Spotify-Gerät aus (`SpotifyMusicProvider.resolvePlayableDeviceId`, ~Z. 1649) – Verhaltensänderung, Teamentscheidung nötig.
   - Play/Pause: Backend reicht Spotifys Antworttext durch (`sendPut`), Angular erwartet JSON → `HttpErrorResponse` trotz 200, `loadCurrentPlayback()` wird übersprungen (`host-dashboard.ts:282-287`).
3. **Punkte aus der Design-Bewertung** (`openspec/analyse/impeccable/ui-ux-critique-2026-11-17.md`):
   - [P1] Host-Warteschlange in drei Varianten (Dashboard, `/voting-host`, Dashboard am Handy ohne Rang/Likes); `/voting-host` ohne eigenen Zweck.
   - [P1] `party-ready`: „Player auf dem TV öffnen“ als einziger Hauptknopf vor dem Live-Status, Chip als Statustext.
   - [P2] Fokusführung in den Dashboard-Rückfragen („Auch sperren / Nur entfernen“, „Party beenden?“).
   - [P2] TV: leere Mitte bei 1920 px, kein Puls bei neuen Likes.
   - [P3] Logo in der Host-Leiste, Beschriftung Theme-Schalter, „Code einfügen“ kürzen, Glow-rgba als Token.
4. **Screenshot-Skript:** Mit blockiertem Spotify-SDK bleibt `/startpage` leer, weil das Laden der Daten am SDK hängt. `startpage.png` muss deshalb aus echtem Chrome kommen (in `hugo/scripts/status-screenshots/README.md` beschrieben). Eventuell im Player Daten unabhängig vom SDK laden.
5. **Spec-Warnungen:** `openspec validate --specs` ohne Fehler, aber 30 Warnungen „Requirement text is very long“ (27 alt, 3 aus diesem Change). Nur über einen eigenen kleinen Change aufräumen.
6. **Offene Frage aus `CLAUDE.md`:** leere Warteschlange – Stop/Pause (Web) oder Zufalls-Top-Charts (iOS)?
7. **Optional aus dem Audit:** Spinner bei „Bewegung reduzieren“, Initial-Bundle über 500-kB-Budget.

## Entscheidungen (nicht neu aufrollen)

- Design-Bewertung 27/40 akzeptiert.
- Getrennte Hell/Dunkel-Einstellung für Gäste (`mv-guest-theme`) und Host/TV/Einstieg (`mv-theme`).
- Blacklist: „Weiter“ deaktiviert solange leer, plus „Ohne Blacklist fortfahren“; Enter sperrt ein Wort; max. 3 Künstler + 5 Songs.
- `party-ready` ohne Zurück-Button, kein Kopier-Link für den Player.
- Gast-Titel sachlich („Warteschlange“, „Song suchen“), „Party verlassen“ mit Rückfrage, `deviceId` bleibt.
- Alte Screenshots werden archiviert, nicht gelöscht.

## Hinweise

- Port 4200 = `ng serve` der Nutzerin (nicht beenden; neue Assets erst nach Neustart). Für eigene Browser-Checks `npx ng serve --port 4300` im Hintergrund, PID gezielt beenden.
- Backend läuft in der IDE (8080), PostgreSQL per Docker (5432).
- Claude in Chrome ist verbunden (Session mit `claude --chrome`); der Spotify-Login ist in Chrome gespeichert, Party anlegen geht damit selbstständig. Fenstergröße springt teils zurück – nicht endlos nachstellen.
- Tests: Frontend `CHROME_BIN=/usr/bin/chromium-browser npx ng test --watch=false --browsers=ChromeHeadless` (426/426), Backend `cd musicvoting/backend && ./mvnw test` (192/192).
- Mock-Screenshots ohne Backend: `ai/scratch/screenshot-tools/snap-mock.mjs` (git-ignoriert, Base-URL 4200).
