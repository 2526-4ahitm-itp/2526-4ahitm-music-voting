# Continuation: `unify-queue-views` auf aktuellen `main` rebased (noch nicht gepusht, nicht archiviert)

_Stand 2026-11-24. Löst `2026-11-23_after-unify-queue-views.md` ab (kann gelöscht werden)._

## Prompt für die nächste Session

> **Erst prüfen lassen, dann ausführen.** Lies diese Datei, prüfe den Stand nur lesend (`git status`, `git log --oneline origin/main..refactor/design-rebased`, `openspec list`) und frag mich, womit wir weitermachen – Vorschläge siehe „Offene Punkte“ (empfohlen: 1 → 2 → 3). Nichts ändern, committen oder pushen, bevor ich zustimme. Neue Arbeit läuft spec-driven über `openspec/changes/<name>/` (ARBEITSREGELN §1).

## Stand der Branches

- **`refactor/design-rebased`** (lokal, ausgecheckt, **nicht gepusht**): 9 Commits auf `origin/main` (Stand `66273d43`, Java 25 / Angular 22 / PostgreSQL 19):
  Flyer, Proposal `unify-queue-views`, „one guest page“, „host dashboard holds the whole queue“, „TV like pulse …“, Doku, Change-Updates + Proposal `rename-blacklist-to-blocklist`, `openspec/config.yaml`, Tick 8.3.
- **`refactor/design`** (lokal + `origin`): alter Stand, unverändert. Seine älteren Design-Commits sind auf `main` schon mit anderen Hashes enthalten – deshalb Rebase statt Merge (Merge hätte 66 Konflikte gegeben).
- Der Commit „docs(ai): add hand-off note after refactor-design-fixes“ wurde beim Rebase **verworfen**, weil `main` in `0ecb891b` die erledigten Hand-offs unter `ai/continuations/` gelöscht hat.

## Was beim Rebase aufgelöst wurde

| Datei | Lösung |
|---|---|
| `app.routes.ts` | `/guest` bleibt Redirect auf `/voting`; `/voting` behält `main`s `guestGuard` |
| `app.routes.spec.ts` | `main`s Test erwartete den Guard auch auf `/guest` → prüft jetzt nur `/voting` (Kommentar erklärt warum); per Fixup in „one guest page“ eingefaltet |
| `guest.ts`, `queue-state.ts`, `search-host.ts`, `voting-host.ts` (+ Specs) | bleiben gelöscht. `main`s Fix „reset queued-song marking when switching party“ (`c12feaeb`) betraf nur den Singleton `QueueStateService`; die neue Gastseite lädt die Warteschlange pro Party selbst, der Fehler kann dort nicht auftreten |
| `voting-comp.ts`, `host-dashboard.ts` | `main`s `ChangeDetectionStrategy.Eager` + Branch-Imports (`TrackService`, `ElementRef`/`Injector`/`afterNextRender`) zusammengeführt |
| `voting-comp.spec.ts`, `host-stage-pages.dom.spec.ts`, `startpage.layout.spec.ts` | beide Seiten behalten (u. a. `main`s Premium-Alert-Tests + Like-Puls/Logo-Glow-Tests; `withXhr` + `HttpTestingController`) |

Alle Komponenten haben das von Angular 22 erwartete `changeDetection`.

## Verifiziert

- Frontend `ng build` ok (nur bekannte Budget-Warnungen), **422/422** Tests grün.
- Backend **229/229** grün (Backend-Code identisch mit `main`).
- `openspec validate --all`: alles ok außer `rename-blacklist-to-blocklist` (hat nur `proposal.md`, erwartet).

## Lokale Umgebung (wichtig)

- **Node 26** per nvm installiert (v26.13.1), Default ist noch 24.2.0 → im Frontend vorher `nvm use 26` (Angular 22 verlangt ≥ 24.15 / 26).
- **Java 25:** `java` im Terminal ist 21. Backend-Tests mit `JAVA_HOME=$HOME/.jdks/temurin-25.0.3 ./mvnw test`.
- Frontend-Tests: `CHROME_BIN=/usr/bin/chromium-browser npx ng test --watch=false --browsers=ChromeHeadless`.
- PostgreSQL per Docker läuft (`cd musicvoting && docker compose up -d`).
- Port 4200 = `ng serve` der Nutzerin (nicht beenden); eigene Checks auf 4300.
- `npm ci` wurde mit dem neuen Lockfile ausgeführt (`node_modules` ist Angular-22-Stand).

## Offene Punkte

1. **Task 8.3 kurz wiederholen** in Chrome mit echter Party – vor allem Gastseite und Host-Suche zusammen mit `main`s Guest-Guard, 429 „Zu viele Anfragen — bitte kurz warten.“ (10 Songs/Minute) und Premium-Pflicht beim Host-Login.
2. **`unify-queue-views` archivieren** (`/opsx:archive`). Achtung: `main` hat inzwischen `fix-guest-queue-state-per-party` in `openspec/specs/guest/spec.md` archiviert; diese Anforderung bezieht sich auf den gelöschten `QueueStateService` → im Delta anpassen/ersetzen. Auch `guard-guest-views` prüfen (Guard auf `/guest` entfällt, da Redirect).
3. **Push + PR:** entweder `refactor/design-rebased` als neuen Branch pushen oder `refactor/design` per `--force-with-lease` überschreiben – Entscheidung der Nutzerin. Dann PR → `main` (`gh` nicht installiert → GitHub-Compare-Seite).
4. **Change `rename-blacklist-to-blocklist`** (nach dem Merge): Specs (RENAMED), Design, Tasks; Frontend-Route `/select-blacklist` → `/select-blocklist` mit Redirect, Backend-Klassen/REST/SSE `blacklist-updated`, Tabelle `blacklist_entry` in `setup.sql` **und** `deployment/k8s/01-postgres.yaml`; eigener Server / lokale Volumes: `ALTER TABLE blacklist_entry RENAME TO blocklist_entry;`.
5. **Change `fix-player-device-feedback`** (offen): kein Hinweis bei DRM-Problem (Firefox privat / Chromium), Backend weicht still auf ein anderes Spotify-Gerät aus (Teamentscheidung), Play/Pause liefert Spotify-Text → `HttpErrorResponse` trotz 200.
6. **Budget-Warnungen:** Initial 584 kB > 500 kB; `stage.css` 6,3 kB, `startpage.css` 5,5 kB, `voting-comp.css` 5,0 kB, `host-dashboard.css` 4,5 kB > 4 kB – Grenze anheben oder CSS kürzen (Teamentscheidung).
7. **Doku:** `hugo/content/docs/specification.md` sagt bei der Blacklist „Teilstring“ – laut Spec ganzes Wort.
8. **Kleinkram:** Screenshot-Skript (Player-Seite leer ohne Spotify-SDK), Spec-Warnungen „Requirement text is very long“, Spinner bei „Bewegung reduzieren“.

## Entscheidungen (nicht neu aufrollen)

Unverändert aus der vorigen Continuation: eine Gastseite ohne Tab-Bar; Host-Suche wie beim Gast; Host liked per deviceId; gesperrte Songs beim Gast nur als Hinweiszeile, Host sieht „Nicht erlaubt.“; „Blocklist“ überall (Code/API/DB im eigenen Change); TV-Layout bleibt, Like-Puls + Logo-Glow bleiben; Bestätigungen 1,5 s (`CONFIRM_MS`), Fehler 4 s; Willkommen schließt nach 10 s; Link „MusicVoting öffnen“ fest auf LeoCloud (`shared/public-url.ts`). Neu: Rebase statt Merge; Hand-off-Commit verworfen.
