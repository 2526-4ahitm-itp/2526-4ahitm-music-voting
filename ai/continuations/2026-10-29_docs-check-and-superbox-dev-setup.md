# Continuation: Doku-Check, Superbox-Setup und nächster Schritt Impeccable (2026-10-29)

Branch: `main`, synchron mit `origin/main`. Keine offenen OpenSpec-Changes.

**Nächster Schritt: Impeccable einführen.** Siehe Abschnitt [Weiter mit Impeccable](#weiter-mit-impeccable).

## Was in dieser Session gemacht wurde

### Commits (alle gepusht, Hugo-Workflow jeweils grün)
| Commit | Inhalt |
|---|---|
| `b0a70b3a docs(hugo): fix stale paths after deployment/ restructure` | `kubectl apply -f k8s/` → `deployment/k8s/` in `dev/ci-cd-deployment.md` und `docs/developerinstructions.md`; „Ordner `compose`“ → `deployment/compose` in `docs/runinstructions.md` |
| `bdbf215a docs(ai): add continuation for docs check and superbox setup` | diese Notiz (erste Fassung) |
| `c36dee20 docs(hugo): add superbox/devbox run instructions without docker` | neue **Variante C** in `hugo/content/docs/runinstructions.md`: PostgreSQL ohne Docker (`pg.sh`), `backend.env`/`spotify.env`, Start per `dbx`, Port-Forward `4200:4200 8080:8080`, `127.0.0.1` statt `localhost`, Hinweise zu Spotify-CSP-Meldungen und `INVALID_CLIENT`, Beenden |

### Doku-Check (ohne Änderungsbedarf)
- **REST-API-Doku** (`dev/api-reference.md`): passt zu allen `@Path`s im Backend.
- **Präsentation und Status-Seite:** stimmen inhaltlich mit dem Code überein (Auto-Refill-Reihenfolge, Auto-Ende nach 2 Tagen, Tabellen). Stand-Datum 2026-09-28; seitdem keine Funktions- oder UI-Änderungen, die Screenshots sind also noch aktuell.

### Außerhalb von Git (`ai/scratch/`, git-ignored)
Die Devbox hat **kein Docker**, deshalb funktionieren `docker compose up -d` und Quarkus Dev Services dort nicht. Stattdessen:

| Datei/Ordner | Zweck |
|---|---|
| `ai/scratch/postgres/` | PostgreSQL 16.15 ohne Docker: zonky-Server-Binaries, Debian-`psql`-17-Client, `nss_wrapper` (UID 1000 fehlt in `/etc/passwd`, sonst bricht `initdb` ab) |
| `ai/scratch/postgres/pg.sh` | `init` / `start` / `stop` / `status` / `psql`; DB, User und Passwort `musicvoting`, `localhost:5432`, Schema aus `setup.sql` |
| `ai/scratch/backend.env` | Backend-Konfiguration als Umgebungsvariablen (ersetzt die fehlende `application.properties`), liest `spotify.env` ein |
| `ai/scratch/spotify.env` | echte Spotify-Client-ID und -Secret, von Miriam selbst angelegt, `chmod 600`. **Nie ausgeben oder committen.** |
| `musicvoting/frontend/node_modules/` | per `dbx "npm ci"` installiert |

Damit laufen in der Devbox die Backend-Tests (141 grün) und die App inklusive Spotify-Login. Die Anleitung zum Nachbauen steht in Hugo unter „How To Run“ → Variante C.

## So startet man die App in der Superbox

```bash
# 1. Datenbank
dbx "ai/scratch/postgres/pg.sh start"
# 2. Backend (eigener dbx-Aufruf, kehrt sofort zurück; bereit nach ca. 15 s)
cd musicvoting/backend
dbx ". ../../ai/scratch/backend.env; nohup ./mvnw -B quarkus:dev -Dquarkus.console.enabled=false > target/app.log 2>&1 < /dev/null & echo \$! > target/app.pid"
# 3. Frontend
cd ../frontend
dbx "mkdir -p .angular; nohup npx ng serve --host 0.0.0.0 --port 4200 > .angular/app.log 2>&1 < /dev/null & echo \$! > .angular/app.pid"
```

Auf dem Laptop: `kubectl port-forward pod/devbox-1-0 4200:4200 8080:8080`, dann **http://127.0.0.1:4200** öffnen.

Beenden: `dbx "kill \$(cat target/app.pid)"` (im Backend-Ordner), `dbx 'pkill -f "ng serve"'`, `dbx "ai/scratch/postgres/pg.sh stop"`, danach `dbx "ps -ef"`.

Dateien selbst bearbeiten: `kubectl exec -it devbox-1-0 -- nano <pfad>`.

## Weiter mit Impeccable

### Was es ist
[Impeccable](https://github.com/pbakaus/impeccable) von Paul Bakaus, Lizenz Apache 2.0: ein Design-Skill für Claude Code mit etwa 23 Befehlen und einem Detektor für generisches „AI-Slop“-Design. Die Befehle sind in Gruppen sortiert:
- **Steer:** `bolder`, `quieter`, `distill`, `colorize`, `typeset`, `layout`, `animate`, `delight`, `overdrive`
- **Review:** `critique` (UX-Bewertung mit Punkten), `audit` (Barrierefreiheit, Performance, Theming, Responsiveness; Prioritäten P0–P3)
- **Finish:** `polish`, `harden`, `clarify`, `adapt`, `optimize`, `onboard`
- **Live:** `live`, `generate`
- **Setup:** `shape`, `init` (→ `PRODUCT.md`), `document` (→ `DESIGN.md`), `extract`

Alle Befehle lesen `PRODUCT.md` und `DESIGN.md`. Die Arbeitsdateien liegen in `.impeccable/`: `config.json`, `design.json`, `surfaces/*.md` und `critique/*.md` werden committet, Caches und Screenshots kommen in `.gitignore`.

### Warum es hier passt (Befund vom 2026-10-29)
- `musicvoting/frontend/src`: 11 Seiten (`home`, `host-options`, `create-party`, `select-playlist`, `host-dashboard`, `search-host`, `voting-host`, `startpage`, `code-input`, `voting-comp`, `guest`)
- etwa 3.770 Zeilen reines CSS (kein Tailwind, kein Material), 25 verschiedene fest einkodierte Hex-Farben, praktisch keine CSS-Variablen, also **kein Design-System**
- Die Git-Historie zeigt `fix: design fix try 1/2/3` (2026-07-03): Das Design wurde mehrfach nachgebessert.

### Was man vorher wissen muss
- **Live-Modus:** Laut README unterstützt er Vite, Next, SvelteKit, Astro, Nuxt und reines HTML. **Angular steht nicht dabei.** `@angular/build` nutzt intern Vite, ob `live` damit funktioniert, ist ungetestet. Alle anderen Befehle hängen nicht vom Framework ab.
- **Nur Web:** Für die SwiftUI-App bringt Impeccable nur indirekt etwas, über eine gemeinsame `DESIGN.md`.
- **Installation:** über das Plugin, nicht über `npx`, denn Node ist in der Superbox nur für Werkzeuge gedacht:
  ```
  /plugin marketplace add pbakaus/impeccable
  /plugin            → Impeccable installieren, danach Claude Code neu laden
  ```
  Achtung: Es gibt einen gleichnamigen Fork `lansbe/impeccable`. Nur das Original `pbakaus/impeccable` verwenden.
- **Team:** Neues Werkzeug im Workflow, deshalb mit Simone und Marlies abstimmen.
- **Arbeitsregeln:** `PRODUCT.md`, `DESIGN.md` und `critique`/`audit` beschreiben und bewerten nur, sie ändern keinen Code. Sobald CSS oder Templates geändert werden, läuft das als **OpenSpec-Change** (z. B. `refine-guest-ui-design` oder `introduce-design-tokens`), mit Tests, Frontend-Tests grün und Kommentaren im Code (Regeln 1, 3, 4).

### Vorgeschlagener Ablauf
```
 1. Plugin installieren, Claude Code neu laden
 2. init      → PRODUCT.md   (Party-Kontext: Gäste am Handy im Dunkeln,
                              TV-Player aus der Ferne lesbar, Host mit wenig Zeit,
                              deutsche UI-Texte verbatim)
 3. document  → DESIGN.md    (Ist-Zustand: die 25 Farben, Schriften, Abstände)
 4. critique / audit auf die Gast-Seiten (voting-comp, guest, code-input)
    und den Player (startpage), App dazu laufen lassen (siehe oben)
 5. Befunde sichten → OpenSpec-Change vorschlagen (/opsx:propose)
 6. Umsetzen mit typeset / layout / colorize / extract / adapt / harden
 7. Frontend-Tests:  cd musicvoting/frontend && dbx "npx ng test --watch=false --browsers=ChromeHeadless"
 8. Screenshots für die Status-Seite neu machen (hugo/scripts/status-screenshots/)
```

Offene Fragen dazu:
- Was hat bei „design fix try 1–3“ eigentlich nicht gepasst? Gute Testfrage, ob `critique` das Problem selbst findet.
- Soll `PRODUCT.md` die iOS-App mit abdecken oder nur das Web?
- Wo sollen `PRODUCT.md` und `DESIGN.md` liegen: im Repo-Root (Standard von Impeccable) oder unter `musicvoting/frontend/`?

## Was sonst noch offen ist

### Doku
1. ~~Superbox-Anleitung in Hugo~~ **erledigt** (`c36dee20`, Variante C).
2. **Globale Superbox-`CLAUDE.md`** (`~/.claude/CLAUDE.md`, privat): Der Port-Forward-Hinweis nennt nur `8080:8080`. Für diese App braucht es auch `4200:4200`, und der Hinweis auf `127.0.0.1` fehlt.
3. **Slides „Projekttermine“ und „Meilensteine“** (`hugo/content/status/index.md`) enthalten nur Platzhalter (`TT.MM.JJJJ`). Die Termine müssen vom Team kommen.
4. **Zur nächsten Sprintabgabe** (Regel 6): `stand` in `hugo/data/status.yaml` aktualisieren und die Screenshots neu erstellen. Nach dem Impeccable-Umbau ist das ohnehin nötig.
5. ~~Hugo-Workflow prüfen~~ **erledigt**, alle Läufe grün.
6. Optional: `pg.sh` und eine `backend.env`-Vorlage ins Repo verschieben (z. B. `script/devbox/`). Dann wird Variante C deutlich kürzer.

### OpenSpec
7. `openspec/changes/archive/integrate-party-id-host-flow-ios-web` hat **kein Datumspräfix**. Der Change wurde vermutlich von Hand verschoben statt mit `openspec archive` archiviert. Prüfen, ob seine Delta-Specs in `openspec/specs/` übernommen wurden.

### Versionen und Warnungen (Regel 8: erst nach Rückfrage aktualisieren)
8. `io.quarkus:quarkus-junit5` → `quarkus-junit` und `quarkus-junit5-mockito` → `quarkus-junit-mockito`. Die Artefakte wurden in Quarkus 3.31 umbenannt, Maven warnt.
9. `quarkus.hibernate-orm.database.generation` ist veraltet (Warnung beim Start). Der Ersatz muss in der Doku-Vorlage (`developerinstructions.md`, Schritt 3), in den k8s-/Compose-Konfigurationen, in `backend.env` und in Variante C nachgezogen werden.
10. Surefire/Failsafe: Das explizite `argLine` enthält kein `@{argLine}`, Quarkus warnt beim Build.

### Weitere Ideen (noch nicht entschieden)
11. **Quint** (Spezifikationssprache, TLA⁺, [informalsystems/quint](https://github.com/informalsystems/quint)): Optionales Experiment, um die Zustandslogik von Playback und Queue mit Invarianten zu modellieren (keine Duplikate, `partyEnded ⇒ Queue leer`, `next` spielt nie den vorherigen Song). Viele frühere Fixes waren Wettlauf-Probleme.
12. **Haft** (früher quint-code): eher nicht, weil es sich mit OpenSpec-`design.md` überschneidet und einen verwalteten Abschnitt in die `CLAUDE.md` schreibt.

## Laufzeit-Zustand bei Session-Ende
PostgreSQL, Backend (`quarkus:dev`, Port 8080) und Frontend (`ng serve`, Port 4200) laufen in `devbox-1-0`. In der lokalen DB liegt eine Test-Party von der Login-Prüfung. Nach einem Neustart der Devbox alles wie oben neu starten.
