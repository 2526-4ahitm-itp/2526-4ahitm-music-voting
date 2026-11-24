# Proposal: Rename "Blacklist" to "Blocklist" Everywhere

> **Status:** specs, design and tasks written on 2026-11-24. Built on `refactor/rename-blocklist`, stacked on `refactor/design-rebased` (`unify-queue-views`).

## Why

The team decided on 2026-11-23 to call the feature "Blocklist" instead of "Blacklist", and to rename it everywhere, not only in the visible text. `unify-queue-views` already changes every text users see. This change renames the rest, so code, API, specs and docs use one word again.

It is a separate change because it reaches beyond the frontend: backend classes, REST paths, an SSE event name and a database table. The frontend and backend must be deployed together, and databases with a persistent volume need a one-time migration.

## What Changes

- **Frontend:**
  - route `/select-blacklist` → `/select-blocklist`, with a redirect from the old path
  - `SelectBlacklist` → `SelectBlocklist`
  - `BlacklistKind` / `BlacklistEntry` → `BlocklistKind` / `BlocklistEntry`
  - the party service methods
  - the SSE event name
- **Backend:**
  - `BlacklistResource`, `BlacklistService`, `BlacklistEntry`, `BlacklistKind` → `Blocklist…`
  - plus the references in `PartyService`, `MusicProvider`, `SpotifyMusicProvider` and `SpotifyCallbackResource`
- **BREAKING (API):**
  - REST paths `/api/party/{id}/blacklist…` → `/api/party/{id}/blocklist…`
  - SSE event `blacklist-updated` → `blocklist-updated`
  - The iOS app does not use the REST paths, but it listens for the SSE event (`SongAddView.swift`, search spec "iOS Search Applies the Party Blocklist Like the Web"), so the event name is renamed there too.
- **BREAKING (database):**
  - table `blacklist_entry` → `blocklist_entry` in `musicvoting/backend/setup.sql` and in the k8s init config `deployment/k8s/01-postgres.yaml`
  - Databases with a persistent volume (`deployment/server`, `deployment/compose`, local Docker) need `ALTER TABLE blacklist_entry RENAME TO blocklist_entry;` once.
  - LeoCloud needs no migration: its Postgres pod has no volume and is rebuilt from the init script on every start.
- **Specs and docs:**
  - requirement names containing "Blacklist" are renamed (`RENAMED`), and the text says "blocklist"
  - also Hugo (`api-reference`, `realtime-sse`, …), the READMEs and `DESIGN.md`
  - The archived changes stay as they are (history).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `host`: renamed requirements ("Host Manages Party Blacklist", "Blacklist Is Visible Only to the Host", "Blacklist Is Removed When the Party Ends"), wording, new requirement "Old Blocklist Setup Link Still Works".
- `search`: "Blacklisted Search Results Cannot Be Added" and "iOS Search Applies the Party Blacklist Like the Web" renamed, wording.
- `queue`: "Blacklist Enforced on Add" renamed.
- `playback`: "Auto-Refill Skips Blacklisted Songs" renamed, wording.
- `dashboard`, `guest`: wording only.

## Impact

- **Frontend:** about 20 files.
- **Backend:** about 12 files.
- **iOS:** the SSE event name in `SongAddView.swift` (plus comments).
- **Other:** `setup.sql`, `deployment/k8s/01-postgres.yaml`, 6 spec files, about 12 Hugo pages.
- **Deployment:** frontend and backend images must be deployed together; own server and local volumes need the one-line migration (documented in `deployment/server/PLACEHOLDERS.md` / README).
- **Tests:** backend (`./mvnw test`) and frontend suites must pass again; renamed test classes.
