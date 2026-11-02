# Continuation: Party-Blacklist umgesetzt, manueller Test offen (2026-11-02)

Branch: `feature/blacklist` (lokal, **nicht gepusht**). Aktiver OpenSpec-Change: `openspec/changes/add-party-blacklist/`, **23/24 Tasks erledigt**. Offen ist nur **7.1** (manueller Ende-zu-Ende-Test mit echtem Spotify-Login).

## Commits dieser Session
| Commit | Inhalt |
|---|---|
| `143f4e3e docs(openspec): propose add-party-blacklist change` | Proposal, Delta-Specs (host, queue, playback, search), Design, Tasks |
| `d12db466 feat(backend): …` | Tabelle `blacklist_entry`, `BlacklistEntry`/`BlacklistKind`, `BlacklistService`, `BlacklistResource`, Prüfungen in `SpotifyMusicProvider`, Tests |
| `469bf5fb feat(frontend): …` | Seite `/select-blacklist`, „Song sperren“ im Host-Dashboard, ausgegraute Treffer in `guest` und `search-host`, Specs |
| `ed5d89d0 docs: …` | `hugo/content/dev/api-reference.md`, beide READMEs, CLAUDE.md (Blacklist-Frage → Resolved), `tasks.md` |

Tests zuletzt: **Backend 174/174 grün**, **Frontend 233/233 grün**, `openspec validate add-party-blacklist --strict` gültig.

## Was gebaut wurde (Entscheidungen von Marlies, nicht neu verhandeln)
- **Drei Eintragsarten:** Wort (**ganzes Wort, Groß-/Kleinschreibung egal**: „live“ sperrt „(Live)“, aber nicht „Oliver“), Künstler (Spotify-Artist-ID, gilt auch für Features), Song (Track-URI).
- **Ablauf beim Host:** `create-party` → Spotify-Login → `/select-playlist` → **`/select-blacklist`** (Wort-Eingabe, Tabs „Künstler“/„Songs“, überspringbar mit „Ohne Blacklist fortfahren“) → `/dashboard`. Wörter und Künstler gibt es **nur in diesem Schritt**.
- **Während der Party:** nur der Button 🚫 „Song sperren“ an **wartenden** Songs im Host-Dashboard. Er setzt den Song zuerst auf die Blacklist und entfernt ihn dann aus der Queue.
- **Prüfpunkte:**
  - Hinzufügen → 403 `{"error":"Nicht erlaubt."}`
  - Auto-Refill → gesperrte Songs werden übersprungen (höchstens 10 Metadaten-Abrufe)
  - Suche → Feld `blocked` pro Treffer, ohne Begründung
- **Nur Web und Backend.** iOS hat keine UI dafür, das Backend lehnt iOS-Adds aber trotzdem ab.
- Alle Blacklist-Endpoints sind `@HostOnly`. Beim Party-Ende werden die Einträge gelöscht (`PartyService.endParty`), weil die Party nur soft-deleted wird und `CASCADE` dabei nicht greift.

## Wichtige Stellen im Code
- `BlacklistService.Blacklist#isBlocked`: die **einzige** Prüflogik. Sie nutzt Lookarounds mit `\p{L}\p{N}` statt `\b`, weil `\b` Umlaute als Wortgrenze behandelt.
- `SpotifyMusicProvider`: `isBlockedTrack` und `markBlockedSearchResults` sind statisch, damit sie sich ohne HTTP testen lassen. `orderRefillCandidates` wurde aus `refillQueue` herausgezogen, weil der `HttpClient` nicht mockbar ist.
- `BlacklistService.add` hat `@Transactional(dontRollbackOn = IllegalArgumentException.class)`, sonst bricht ein Validierungsfehler die umgebende Transaktion ab.

## Offen
1. **Task 7.1:** manueller Test laut `tasks.md`.
2. **Archivieren:** `openspec archive add-party-blacklist` wird sich bei der host-Spec weigern, weil `openspec/specs/host/spec.md` drei iOS-Requirements doppelt enthält (Zeilen 280–322 = 412–454). Marlies will diese Duplikate **nicht** anfassen („betreffen uns nicht“). Die host-Deltas dann von Hand übernehmen oder mit dem Team klären.
3. **Push** von `feature/blacklist` und ein PR nach `main`, beides erst nach Rückfrage.
4. `guest.css` liegt jetzt 495 Bytes über dem CSS-Budget (nur eine Warnung, fünf andere Seiten liegen schon länger darüber).
5. Die Punkte aus `2026-10-29_docs-check-and-superbox-dev-setup.md` sind weiter offen: Impeccable, Maven-/Quarkus-Warnungen, Slides-Termine.

## So geht es weiter
```bash
cd musicvoting && docker-compose up -d          # DB (Container musicvoting-db-1)
cd backend && ./mvnw quarkus:dev                # Backend :8080
cd ../frontend && npx ng serve --host 0.0.0.0   # Frontend :4200 → http://127.0.0.1:4200
```
Tests: `cd musicvoting/backend && ./mvnw clean test`, `cd musicvoting/frontend && npx ng test --watch=false --browsers=ChromeHeadless`.
