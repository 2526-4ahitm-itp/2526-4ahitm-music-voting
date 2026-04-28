# Continuation — Backend party lifecycle spec done, ready to implement

Branch: `feature/db`

## What was done

Created `add-party-lifecycle-endpoints` in `openspec/changes/` — fully spec'd and task-listed, not yet implemented.

Artifacts:
- `openspec/changes/add-party-lifecycle-endpoints/proposal.md`
- `openspec/changes/add-party-lifecycle-endpoints/design.md`
- `openspec/changes/add-party-lifecycle-endpoints/tasks.md`
- `openspec/changes/add-party-lifecycle-endpoints/specs/party/spec.md`
- `openspec/changes/add-party-lifecycle-endpoints/specs/queue/spec.md`

## What the change does (summary)

- `POST /api/party` — creates a party (UUID, 5-digit PIN, join URL); returns JSON `{id, pin, joinUrl}`; QR PNG served separately
- `DELETE /api/party/{id}` — ends party: empties queue, clears Spotify tokens, sets `ended_at` in DB, evicts from `PartyRegistry`, broadcasts `party-ended` SSE
- `GET /api/party/join/{pin}` — resolves active PIN → party ID (404 if unknown/ended)
- `GET /api/party/{id}/qr` — returns ZXing-generated PNG of the join URL
- All existing `/track/*` → `/api/party/{id}/track/*`
- Host-facing `/spotify/*` → `/api/party/{id}/spotify/*` (callbacks stay at `/spotify/callback` and `/spotify/ios/callback`; party ID threads through OAuth `state` param as `"web:<partyId>"` / `"ios:<installationId>:<partyId>"`)
- `PartyRegistry.getOrCreateDefault()` deleted; all callers replaced with `partyRegistry.find(PartyId.of(partyId)).orElseThrow(404)`
- Queue `party_id` now uses a real UUID (not `"default"`)

## Key design decisions (do not re-litigate)

- Party resolved at endpoint boundary — `find().orElseThrow(404)` in each JAX-RS resource, not CDI injection
- PIN: `SecureRandom`, `String.format("%05d", random.nextInt(100_000))`, up to 10 collision-retry attempts, HTTP 503 if all fail
- QR: ZXing `QRCodeWriter`, 300×300 px PNG, generated fresh on each `/qr` request (not stored)
- Join URL: `${musicvoting.join.base-url}/${pin}`, config default `http://localhost:4200/join`
- `ended_at` soft-delete on `PartyEntity` (nullable `TIMESTAMPTZ`); in-memory `Party` evicted immediately
- `SpotifyTokenResource` splits into two JAX-RS classes: one for OAuth callbacks (stays at `/spotify`), one for host-facing endpoints (moves to `/api/party/{partyId}/spotify`)
- Auth deferred — endpoints unprotected for now

## DB schema changes needed

Add to `setup.sql` (then recreate container):
```sql
ALTER TABLE party ADD COLUMN pin VARCHAR(5) NOT NULL DEFAULT '';
ALTER TABLE party ADD COLUMN ended_at TIMESTAMPTZ;
CREATE UNIQUE INDEX party_pin_active_idx ON party (pin) WHERE ended_at IS NULL;
```
(Or rewrite the `CREATE TABLE party` block directly since this is a dev DB with no migration tooling.)

## Files to change

| File | Change |
|---|---|
| `musicvoting/backend/setup.sql` | Add `pin`, `ended_at` columns + partial unique index |
| `musicvoting/backend/pom.xml` | Add `com.google.zxing:core` + `com.google.zxing:javase` 3.5.3 |
| `musicvoting/backend/src/main/resources/application.properties` | Add `musicvoting.join.base-url=http://localhost:4200/join` |
| `at/htl/domain/Party.java` | Add `pin` field + getter; update constructor |
| `at/htl/domain/PartyEntity.java` | Add `pin`, `endedAt` fields; add `findByPin(pin)` static method |
| `at/htl/domain/PartyRegistry.java` | Remove `getOrCreateDefault()`; add `findByPin(pin)` |
| `at/htl/endpoints/PartyResource.java` | New class — POST/DELETE/GET join/GET qr |
| `at/htl/endpoints/TrackResource.java` | Re-path to `/api/party/{partyId}/track`; add party resolution |
| `at/htl/endpoints/SpotifyTokenResource.java` | Split into callback class + host class; thread partyId through OAuth state |

## Tasks checklist

Read `openspec/changes/add-party-lifecycle-endpoints/tasks.md` for the full 27-step list. Start at task 1.1.

## How to resume

Read this file and `CLAUDE.md`. Start the DB: `cd musicvoting && docker compose up -d`.

Then read `openspec/changes/add-party-lifecycle-endpoints/tasks.md` and implement task by task, checking each off as it lands. Use `/openspec` if you need to reference the skill.

After all tasks are checked off, verify (tasks 7.1–7.9), then archive the change.
