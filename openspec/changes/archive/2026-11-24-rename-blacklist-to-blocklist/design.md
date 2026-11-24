# Design: Rename "Blacklist" to "Blocklist" Everywhere

## Context

The visible texts already say "Blocklist" (`unify-queue-views`). Code, API, database, specs and docs still say "blacklist". The behaviour does not change: this is a rename only.

## Decisions

### D1 — One fixed word mapping, applied mechanically

| Old | New |
|---|---|
| `Blacklist` | `Blocklist` |
| `blacklist` | `blocklist` |
| `BLACKLIST` | `BLOCKLIST` |

Every derived word follows from this: `blacklisted` → `blocklisted`, `BlacklistService` → `BlocklistService`, `select-blacklist` → `select-blocklist`, `blacklist-updated` → `blocklist-updated`, `blacklist_entry` → `blocklist_entry`. Files and folders with the word in their name are moved with `git mv`, so their history is kept.

**Why mechanical:** about 850 occurrences in 30 forms. A fixed mapping ensures nothing is missed and nothing is reworded by accident. The tests show if a reference breaks.

### D2 — History stays as it is

Not renamed:
- archived changes (`openspec/changes/archive/`) and their names (`add-party-blacklist`, `ios-search-respects-blacklist`), also where other files refer to them
- the name of this change (`rename-blacklist-to-blocklist`)
- analyses and reviews (`openspec/analyse/`, `.impeccable/`), meeting minutes (`hugo/content/project/mom/`), feasibility studies (`hugo/content/project/future-features/`) and hand-off notes (`ai/continuations/`)

**Why:** these documents describe what was true when they were written.

### D3 — Old setup route redirects, API has no alias

- `/select-blacklist` redirects to `/select-blocklist`. A host might have the old page open or bookmarked; the redirect costs one route entry.
- REST (`/api/party/{id}/blacklist…`) and SSE (`blacklist-updated`) get **no** old alias. The web frontend comes from the same deployment as the backend, and the iOS app is built from the same repo. An alias would keep the old word in the code indefinitely.

### D4 — iOS follows the SSE event name

`SongAddView.swift` refreshes the iOS search on `blacklist-updated`. It changes to `blocklist-updated`, otherwise iOS guests would keep stale greyed-out results after a blocklist change. Swift can't be built on the Linux development machine, so this needs a check in Xcode (task 5.2).

### D5 — Database: rename the table, one-line migration for existing volumes

- `setup.sql` and the init script in `deployment/k8s/01-postgres.yaml` create `blocklist_entry`. Constraint and index names follow the same mapping.
- LeoCloud needs no migration: its Postgres pod has no volume and is created fresh from the init script on every start.
- Databases with a volume (local Docker, `deployment/compose`, `deployment/server`) need once:
  ```sql
  ALTER TABLE blacklist_entry RENAME TO blocklist_entry;
  ```
  It goes into the backend README and `deployment/server/PLACEHOLDERS.md`.
- **Pitfall:** `quarkus:dev` runs with `hibernate-orm.database.generation=update`. Without the migration it does not fail. It silently creates an **empty** `blocklist_entry` table without the UNIQUE constraint, and every party's blocklist seems to be gone. Run the migration before starting the new backend.

### D6 — Spec deltas: REMOVED + ADDED instead of RENAMED

OpenSpec can rename a requirement (RENAMED), but a MODIFIED block can't rename its **scenarios**. Requirements whose title or scenario names contain the word are therefore removed under the old name and added under the new one, with the same text apart from the word. Requirements that only mention the word in their text are MODIFIED.

The one exception is "Auto-Refill Prefers Songs Not Yet Played": its title stays the same, so it can't be removed and re-added in the same change. Its scenario "Blacklist still applies to repeats" keeps its name; only the scenario text uses the new word.

## Risks

- **Missed reference:** a `grep -ri blacklist` over the renamed areas after the change must only find what D2 excludes (task 6.1).
- **Deploying frontend and backend separately:** the old frontend calls `/blacklist…` and gets 404. Both images are deployed by the same workflow (`build-push-deploy.yml`).
