# Continuation: Doku-Check und lokale Entwicklung in der Superbox (2026-10-29)

Branch: `main`. Es gibt keine offenen OpenSpec-Changes.

## Was in dieser Session geändert wurde

### Im Repo (committet und gepusht)
- `b0a70b3a docs(hugo): fix stale paths after deployment/ restructure`
  - `hugo/content/dev/ci-cd-deployment.md`: `kubectl apply -f k8s/` → `deployment/k8s/`
  - `hugo/content/docs/developerinstructions.md`: dieselbe Korrektur
  - `hugo/content/docs/runinstructions.md`: „Ordner `compose`“ → `deployment/compose`

### Doku-Check (ohne weitere Änderungen)
- **REST-API-Doku** (`dev/api-reference.md`): passt zu allen `@Path`s im Backend.
- **Präsentation und Status-Seite:** stimmen inhaltlich mit dem Code überein (Auto-Refill-Reihenfolge, Auto-Ende nach 2 Tagen, Tabellen). Stand-Datum 2026-09-28; seitdem gab es keine Funktions- oder UI-Änderungen, die Screenshots sind also noch aktuell.

### Außerhalb von Git (`ai/scratch/`, git-ignored)
Die Devbox hat **kein Docker**, deshalb funktionieren `docker compose up -d` und Quarkus Dev Services dort nicht. Stattdessen:

| Datei/Ordner | Zweck |
|---|---|
| `ai/scratch/postgres/` | PostgreSQL 16.15 ohne Docker: zonky-Server-Binaries, Debian-`psql`-17-Client, `nss_wrapper` (UID 1000 fehlt in `/etc/passwd`, sonst bricht `initdb` ab) |
| `ai/scratch/postgres/pg.sh` | `init` / `start` / `stop` / `status` / `psql`; DB, User und Passwort `musicvoting`, `localhost:5432`, Schema aus `setup.sql` |
| `ai/scratch/backend.env` | Backend-Konfiguration als Umgebungsvariablen (ersetzt die fehlende `application.properties`) |
| `ai/scratch/spotify.env` | echte Spotify-Client-ID und -Secret, von Miriam selbst angelegt, `chmod 600`. **Nie ausgeben oder committen.** |

Damit laufen in der Devbox die Backend-Tests (141 grün) und die App inklusive Spotify-Login.

## So startet man die App in der Superbox

```bash
# 1. Datenbank
dbx "ai/scratch/postgres/pg.sh start"
# 2. Backend (eigener dbx-Aufruf, kehrt sofort zurück)
cd musicvoting/backend
dbx ". ../../ai/scratch/backend.env; nohup ./mvnw -B quarkus:dev -Dquarkus.console.enabled=false > target/app.log 2>&1 < /dev/null & echo \$! > target/app.pid"
# 3. Frontend (einmalig vorher: dbx "npm ci")
cd ../frontend
dbx "nohup npx ng serve --host 0.0.0.0 --port 4200 > .angular/app.log 2>&1 < /dev/null & echo \$! > .angular/app.pid"
```

Auf dem Laptop:

```bash
kubectl port-forward pod/devbox-1-0 4200:4200 8080:8080
```

Dann **http://127.0.0.1:4200** öffnen. Nicht `localhost`, weil die Spotify-Redirect-URIs auf `127.0.0.1` lauten.

Dateien selbst bearbeiten: `kubectl exec -it devbox-1-0 -- nano <pfad>`.

Hinweis: Die CSP-Meldungen und „Quirks Mode“ in der Browser-Konsole kommen von Spotifys Login-Seite, nicht von der App. Sie lassen sich ignorieren.

## Was noch geändert werden muss

### Doku
1. **Anleitung für Entwicklung ohne Docker / in der Superbox** in Hugo ergänzen, z. B. als „Variante C“ in `hugo/content/docs/runinstructions.md`:
   - Port-Forward für **beide** Ports: `kubectl port-forward pod/devbox-<n>-0 4200:4200 8080:8080`
   - Aufruf über `127.0.0.1` statt `localhost`
   - Konfiguration per Umgebungsvariablen statt `application.properties`
   - PostgreSQL ohne Docker (`pg.sh`)
   - Vorher klären: Brauchen Simone und Marlies das auch, oder bleibt es Miriams persönliches Setup? Sonst gehört es eher in eine README unter `ai/`.
2. **Globale Superbox-`CLAUDE.md`** (`~/.claude/CLAUDE.md`, privat): Der Port-Forward-Hinweis nennt nur `8080:8080`. Für diese App braucht es auch `4200:4200`, und der Hinweis auf `127.0.0.1` fehlt.
3. **Slides „Projekttermine“ und „Meilensteine“** (`hugo/content/status/index.md`) enthalten nur Platzhalter (`TT.MM.JJJJ`). Die Termine müssen vom Team kommen.
4. **Zur nächsten Sprintabgabe** (Regel 6): in `hugo/data/status.yaml` das Datum `stand` aktualisieren und die Screenshots neu erstellen (`hugo/scripts/status-screenshots/`).
5. Prüfen, ob der Hugo-Workflow für `b0a70b3a` erfolgreich durchgelaufen ist.

### OpenSpec
6. `openspec/changes/archive/integrate-party-id-host-flow-ios-web` hat **kein Datumspräfix**. Der Change wurde vermutlich von Hand verschoben statt mit `openspec archive` archiviert. Prüfen, ob seine Delta-Specs in `openspec/specs/` übernommen wurden.

### Versionen und Warnungen (Regel 8: erst nach Rückfrage aktualisieren)
7. `io.quarkus:quarkus-junit5` → `quarkus-junit` und `quarkus-junit5-mockito` → `quarkus-junit-mockito`. Die Artefakte wurden in Quarkus 3.31 umbenannt, Maven warnt.
8. `quarkus.hibernate-orm.database.generation` ist veraltet (Warnung beim Start). Der Ersatz muss in der Doku-Vorlage (`developerinstructions.md`, Schritt 3), in den k8s-/Compose-Konfigurationen und in `backend.env` nachgezogen werden.
9. Surefire/Failsafe: Das explizite `argLine` enthält kein `@{argLine}`, Quarkus warnt beim Build.

### Ideen (Explore, noch nicht entschieden)
10. **Impeccable** (Design-Skill für Claude Code): Das Frontend hat etwa 3.770 Zeilen reines CSS, 25 fest einkodierte Farben und kein Design-System (siehe die Commits „design fix try 1–3“). Vorschlag: `/plugin marketplace add pbakaus/impeccable`, dann `init` (`PRODUCT.md`), `document` (`DESIGN.md`) und `critique`/`audit` für die Gast-Seiten. Die Umsetzung läuft als OpenSpec-Change. Erst mit dem Team abstimmen.
11. **Quint** (Spezifikationssprache, TLA⁺): Optionales Experiment, um die Zustandslogik von Playback und Queue mit Invarianten zu modellieren. Viele frühere Fixes waren Wettlauf-Probleme.
12. **Haft** (früher quint-code): eher nicht, weil es sich mit OpenSpec-`design.md` überschneidet.

## Aktueller Laufzeit-Zustand (bei Session-Ende)
PostgreSQL, Backend (`quarkus:dev`, Port 8080) und Frontend (`ng serve`, Port 4200) laufen in `devbox-1-0`. In der lokalen DB liegt eine Test-Party von der Login-Prüfung.
