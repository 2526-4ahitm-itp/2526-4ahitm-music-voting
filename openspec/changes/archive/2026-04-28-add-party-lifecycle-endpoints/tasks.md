# Tasks

## 1. Schema and config

- [x] 1.1 Add `pin VARCHAR(5) NOT NULL DEFAULT ''` and `ended_at TIMESTAMPTZ` columns to the `party` table in `setup.sql`
- [x] 1.2 Add a partial unique index on `pin WHERE ended_at IS NULL` to `setup.sql` (allows ended parties to free their PIN)
- [x] 1.3 Recreate the DB container to apply the schema: `cd musicvoting && docker compose down -v && docker compose up -d`
- [x] 1.4 Add `musicvoting.join.base-url=http://localhost:4200/join` to `application.properties`

## 2. Maven dependency

- [x] 2.1 Add `com.google.zxing:core` and `com.google.zxing:javase` (version 3.5.3) to `pom.xml`

## 3. Domain model

- [x] 3.1 Add `pin` field + getter to `Party.java`; update constructor to accept `pin` as a parameter
- [x] 3.2 Add `pin` (String) and `endedAt` (OffsetDateTime, nullable) fields to `PartyEntity.java`
- [x] 3.3 Add `PartyEntity.findByPin(String pin)` static method: query `WHERE pin = ?pin AND ended_at IS NULL`, return `Optional<PartyEntity>`
- [x] 3.4 Remove `getOrCreateDefault()` from `PartyRegistry`
- [x] 3.5 Add `PartyRegistry.findByPin(String pin)` that delegates to `PartyEntity.findByPin` and maps to an in-memory `Party` lookup

## 4. New PartyResource

- [x] 4.1 Create `PartyResource.java` at `@Path("/party")` with `@Transactional POST /party`:
  - Accept `{"provider": "spotify"|"youtube"}`
  - Generate UUID (`PartyId.newRandom()`)
  - Generate 5-digit PIN via `SecureRandom` with up to 10 collision-retry attempts; throw HTTP 503 if all fail
  - Persist `PartyEntity` (id, providerKind, pin, createdAt)
  - Register `new Party(id, providerKind, pin)` in `PartyRegistry`
  - Return HTTP 201 `{"id": "…", "pin": "…", "joinUrl": "…"}`
- [x] 4.2 Add `@Transactional DELETE /party/{id}` to `PartyResource`:
  - Look up party in `PartyRegistry`; 404 if not found
  - Delete all `queue_entry` rows for this party
  - Clear Spotify credentials from the in-memory `Party` (if Spotify party)
  - Set `PartyEntity.endedAt = OffsetDateTime.now()` and persist
  - Evict the `Party` from `PartyRegistry`
  - Emit a `{"event": "party-ended"}` SSE event (reuse `LoginEventBus`)
  - Return HTTP 204
- [x] 4.3 Add `GET /party/join/{pin}` to `PartyResource`:
  - Call `PartyRegistry.findByPin(pin)`; 404 if not found
  - Return HTTP 200 `{"id": "…"}`
- [x] 4.4 Add `GET /party/{id}/qr` to `PartyResource`:
  - Resolve party (404 if not found/ended)
  - Build `joinUrl = baseUrl + "/" + party.pin()`
  - Generate PNG bytes with ZXing `QRCodeWriter` (300×300 px)
  - Return `Response.ok(bytes).type("image/png")`

## 5. Migrate TrackResource

- [x] 5.1 Change the class-level `@Path` from `/track` to `/party/{partyId}/track`
- [x] 5.2 Add `@PathParam("partyId") String partyId` field to the class (JAX-RS injects per-request)
- [x] 5.3 Replace the `party()` helper with `resolveParty()`: `partyRegistry.find(PartyId.of(partyId)).orElseThrow(() -> new WebApplicationException(404))`
- [x] 5.4 Update every method body to call `resolveParty()` instead of `party()`

## 6. Migrate SpotifyTokenResource

- [x] 6.1 Split `SpotifyTokenResource` into two classes:
  - `SpotifyCallbackResource` (keep `@Path("/spotify")`) — holds only `callback()`, `iosCallback()`, and `events()` (events can stay party-unaware for now)
  - `SpotifyTokenResource` re-pathed to `@Path("/party/{partyId}/spotify")` for: `token`, `status`, `deviceId`, `login`
- [x] 6.2 Add `@PathParam("partyId") String partyId` field to `SpotifyTokenResource`; replace `credentials()` helper with one that resolves the party from the registry (404 if not found)
- [x] 6.3 Update `login()` to embed partyId in `state`:
  - web: `state = "web:" + partyId`
  - iOS: `state = "ios:" + installationId + ":" + partyId`
- [x] 6.4 Update `callback()` to parse partyId from state (`state.split(":", 3)[2]` for ios, `state.split(":", 2)[1]` for web) and resolve the party before storing the token
- [x] 6.5 Update `iosCallback()` the same way as `callback()`

## 7. Verify

- [x] 7.1 Start the stack: `cd musicvoting && docker compose up -d && mvn quarkus:dev`
- [x] 7.2 `POST /api/party {"provider":"spotify"}` → check response has `id`, `pin` (5 digits), `joinUrl`
- [x] 7.3 `GET /api/party/join/{pin}` → resolves to correct party ID
- [x] 7.4 `GET /api/party/{id}/qr` → returns `image/png` (save to file, open in image viewer)
- [x] 7.5 `GET /api/party/{id}/spotify/login` → redirects to Spotify authorize URL with correct `state` containing partyId
- [x] 7.6 Complete Spotify OAuth flow (manual): confirm token is stored and `/api/party/{id}/spotify/status` returns `{"loggedIn": true}`
- [x] 7.7 Add a track via `POST /api/party/{id}/track/…`; confirm `queue_entry` row in DB has `party_id = <uuid>` (not `"default"`)
- [x] 7.8 `DELETE /api/party/{id}` → confirm queue emptied, `ended_at` set in DB, subsequent `GET /api/party/{id}/track/queue` returns 404
- [x] 7.9 Confirm no remaining callers of `getOrCreateDefault()` in the codebase (`grep -r "getOrCreateDefault" musicvoting/backend/src`)
