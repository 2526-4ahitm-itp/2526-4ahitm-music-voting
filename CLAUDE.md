# MusicVoting — Claude Instructions

## Project

Party music-voting web app (HTBLA Leonding, 4AHITM ITP). Guests join anonymously via QR code, add and like songs; music plays on a shared monitor/TV. Host authenticates once per party via Spotify or YouTube OAuth.

Team: Miriam Gnadlinger (lead), Simone Sperrer, Marlies Winklbauer.

## Stack

| Layer | Technology |
|---|---|
| Backend | Quarkus (Java 21), REST + SSE |
| Frontend | Angular (web — guest, host, dashboard) |
| Database | PostgreSQL 16 via Docker |
| Mobile (optional) | SwiftUI iOS app |
| Docs | Hugo site under `hugo/` |

Key directories:
- `musicvoting/backend/` — Quarkus backend
- `musicvoting/frontend/` — Angular frontend
- `legacyProject/` — predecessor repo, **ignore unless explicitly asked**
- `hugo/` — documentation site only

## Spec-driven development (OpenSpec)

All feature work goes through the OpenSpec workflow. The skill is at `.claude/skills/openspec/SKILL.md` — invoke it via `/openspec` or when working in `openspec/`.

Directory layout:
- `openspec/specs/<domain>/spec.md` — current agreed behavior (source of truth)
- `openspec/changes/<name>/` — in-progress change (proposal → delta specs → design → tasks → implement → verify → archive)
- `openspec/changes/archive/` — completed changes (history only)

**Never edit `openspec/specs/` directly for a new feature or fix.** Always go through a change proposal under `openspec/changes/<name>/`.

## Permanent pitfalls

- **`ExampleResourceTest` fails** with missing `spotify.client.id/secret/redirect.uri` on a clean checkout — pre-existing, not a regression. Ignore.
- **`PartyEntity` vs `Party`** — `Party.java` is the in-memory representation used by `PartyRegistry`. `PartyEntity.java` is the separate Panache entity for the `party` DB table. They are intentionally separate; do not merge them.
- **`pom.xml`** already includes `quarkus-hibernate-orm-panache`, `quarkus-jdbc-postgresql`, and `com.google.zxing`. Do not add duplicates.
- **MoM files** under `hugo/content/project/mom/` have wrong years in the 2025-12-15 meeting (typos). Do not trust those dates.

## Language

User-facing strings are in **German**. Preserve them verbatim in specs, tests, and code:

- `"Nicht erlaubt."`
- `"Zu viele Anfragen — bitte kurz warten."`
- `"Song ist schon in der Warteschlange."`
- `"Warteschlange ist leer"`

## Docker / local dev

PostgreSQL runs via Docker Compose:

```bash
cd musicvoting && docker compose up -d
```

DB: `musicvoting`, user: `musicvoting`, password: `musicvoting`, port: `5432`.
Schema is initialized from `musicvoting/backend/setup.sql` on first start.

## Open questions (unresolved, do not assume)

- Web-app join via 5-digit code — supported or QR only?
- Empty queue: web spec says stop/pause; Swift spec says play random Top-Charts. Which is canonical?
- Blacklist: case-insensitive substring matching? Partial word matching?
- Guest identity persistence mechanism (localStorage, cookie, or DeviceId)?
