# Continuation: Party-Blacklist umgesetzt und nachgebessert, manuelle Tests offen (2026-11-02)

Branch: `feature/blacklist` (lokal, **nicht gepusht**). Zwei aktive OpenSpec-Changes:
- `openspec/changes/add-party-blacklist/`: alles erledigt bis auf **7.1** (manueller Ende-zu-Ende-Test mit echtem Spotify-Login)
- `openspec/changes/fix-next-stale-queue-entry/`: alles erledigt bis auf **2.1** (manueller Test von „Next“)

## Commits
| Commit | Inhalt |
|---|---|
| `143f4e3e docs(openspec): propose add-party-blacklist change` | Proposal, Delta-Specs (host, queue, playback, search), Design, Tasks |
| `d12db466 feat(backend): …` | Tabelle `blacklist_entry`, `BlacklistService`, `BlacklistResource`, Prüfungen in `SpotifyMusicProvider`, Tests |
| `469bf5fb feat(frontend): …` | Seite `/select-blacklist`, „Song sperren“ im Host-Dashboard, ausgegraute Treffer in `guest` und `search-host` |
| `ed5d89d0 docs: …` | API-Doku, READMEs, CLAUDE.md (Blacklist-Frage → Resolved) |
| `a24fdf2a docs(ai): …` | erste Fassung dieser Notiz |
| `71a4ff42 fix(frontend): show blocked songs to guests only greyed out, without hint` | Gast-Suche ohne „Nicht erlaubt.“ (Task 6.4) |
| `f575e2e2 fix(frontend): shorten blacklist page texts and disable "Weiter" …` | Untertitel, Placeholder „Wort“, „Weiter“ deaktiviert bei leerer Blacklist (6.5) |
| `7019449d fix(frontend): give queue song text more room …` | Dashboard-Queue: 🚫 und Mülleimer übereinander, neue Sperr-Bestätigung (6.6) |
| `40282a73 feat: grey out blocked songs live via blacklist-updated event` | SSE-Event `blacklist-updated`, Gast-/Host-Suche suchen neu (6.7) |
| `85bdbc85 feat(frontend): search blacklist while typing and restyle "Sperren"` | Live-Suche, kein „Suchen“-Button, kein „Suche läuft…“, „Sperren“ als Pill mit Hover (6.8) + Spec/Design/Tasks |
| `3249b7cd fix(backend): don't fail "next" when the finished queue entry is already gone` | `StaleStateException` bei `/track/next` behoben, eigener Change |

Tests zuletzt: **Backend 178/178 grün**, **Frontend 248/248 grün**, beide Changes `openspec validate --strict` gültig.

## Entscheidungen von Marlies (nicht neu verhandeln)
- **Drei Eintragsarten:** Wort (**ganzes Wort, Groß-/Kleinschreibung egal**), Künstler (Spotify-Artist-ID, gilt auch für Features), Song (Track-URI).
- **Ablauf beim Host:** `create-party` → Spotify-Login → `/select-playlist` → **`/select-blacklist`** → `/dashboard`. Wörter und Künstler gibt es **nur in diesem Schritt**.
- **Blacklist-Seite:**
  - Untertitel nur „Gesperrte Wörter, Künstler und Songs können Gäste nicht hinzufügen.“, Placeholder „Wort“.
  - „Weiter“ ist ausgegraut, solange nichts gesperrt ist; sonst gibt es „Ohne Blacklist fortfahren“.
  - Künstler-/Songsuche läuft **beim Tippen** (400 ms Debounce wie die Gast-Suche), **ohne „Suchen“-Button und ohne „Suche läuft…“**. Enter sucht sofort.
  - „Sperren“ hat Rahmen und weißen Hover wie „Ohne Blacklist fortfahren“.
- **Während der Party:** nur 🚫 „Song sperren“ an **wartenden** Songs im Dashboard (über dem Mülleimer). Die Bestätigung zeigt die Frage in einer eigenen Zeile mit „Ja, sperren“/„Abbrechen“ darunter.
- **Gast-Suche:** Gesperrte Songs sind **nur ausgegraut** mit deaktiviertem „+“, **ohne Text**. Die Host-Suche (`search-host`) zeigt weiterhin „Nicht erlaubt.“.
- **Live-Update:** Sperrt der Host etwas, werden offene Suchergebnisse sofort neu geladen. Ein Event enthält **nur `partyId`**, nie den Eintrag (Gäste dürfen die Blacklist nicht sehen).
- Hinzufügen eines gesperrten Songs → 403 `"Nicht erlaubt."`; Auto-Refill überspringt gesperrte Songs; nur Web + Backend (iOS ohne UI, Backend lehnt aber ab).

## Wichtige Stellen im Code
- `BlacklistService.Blacklist#isBlocked`: die **einzige** Prüflogik. Sie nutzt Lookarounds mit `\p{L}\p{N}` statt `\b`, wegen Umlauten.
- `BlacklistResource#emitBlacklistUpdated`: läuft bei `201` (neu) und erfolgreichem Entfernen, nicht bei Duplikat (`200`) oder Fehler.
- `SpotifyCallbackResource#events`: Der Web-Zweig leitet `blacklist-updated` weiter, iOS nicht.
- **Bugfix nebenbei:** `guest` und `search-host` haben den SSE-Stream früher **ohne `partyId`** geöffnet und deshalb nie Party-Events bekommen (auch kein `queue-updated`). Jetzt geben sie `partyId` mit wie `voting-comp`. `hugo/content/dev/realtime-sse.md` ist entsprechend korrigiert.
- `SelectBlacklist`: `searchSeq` verwirft veraltete Antworten. In den Tests braucht der Debounce `jasmine.clock().mockDate()`, weil rxjs `Date.now()` nutzt.
- `SpotifyMusicProvider#deleteQueueEntryIfPresent`: Bulk-Delete statt `deleteById`. `deleteById` warf bei parallelen „Next“-Requests `StaleStateException` („expected row count 1 but was 0“) beim Commit, und Quarkus meldete das als `ArcUndeclaredThrowableException` in `TrackResource:184`.

## Offen
1. **Task 7.1** (`add-party-blacklist/tasks.md`), zusätzlich prüfen: Gast hat Suche offen → Host sperrt Song → Treffer wird sofort grau.
2. **Task 2.1** (`fix-next-stale-queue-entry`): Kurz vor Songende skippen; kein `StaleStateException` im Quarkus-Log.
3. **Archivieren:** `openspec archive add-party-blacklist` wird sich bei der host-Spec weigern, weil `openspec/specs/host/spec.md` drei iOS-Requirements doppelt enthält (Zeilen 280–322 = 412–454). Marlies will diese Duplikate **nicht** anfassen. Die host-Deltas dann von Hand übernehmen oder mit dem Team klären. `fix-next-stale-queue-entry` (nur playback) sollte normal archivierbar sein.
4. **Push** von `feature/blacklist` und PR nach `main`, beides erst nach Rückfrage.
5. CSS-Budget-Warnungen (`host-dashboard.css` 8,4 kB, `guest.css` 4,4 kB u. a.): nur Warnungen, schon länger vorhanden.
6. Die Punkte aus `2026-10-29_docs-check-and-superbox-dev-setup.md` sind weiter offen: Impeccable, Maven-/Quarkus-Warnungen, Slides-Termine.
7. Nicht dokumentiert: `hugo/content/docs/specification.md:93` listet die geschützten Host-Routen ohne `select-blacklist`.

## So geht es weiter
```bash
cd musicvoting && docker-compose up -d          # DB (Container musicvoting-db-1)
cd backend && ./mvnw quarkus:dev                # Backend :8080
cd ../frontend && npx ng serve --host 0.0.0.0   # Frontend :4200 → http://127.0.0.1:4200
```
Tests: `cd musicvoting/backend && ./mvnw clean test`, `cd musicvoting/frontend && npx ng test --watch=false --browsers=ChromeHeadless`.
