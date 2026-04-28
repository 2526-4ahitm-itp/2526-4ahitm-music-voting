# Design: Add Party Lifecycle Endpoints

## Technical Approach

A new `PartyResource` JAX-RS class under `/api/party` handles the three new lifecycle endpoints (create, end, join-by-PIN) plus the QR code image endpoint. `TrackResource` and the host-facing methods of `SpotifyTokenResource` gain a `@PathParam("partyId")` and resolve the in-memory `Party` through a shared helper that throws HTTP 404 if the party is unknown or has ended. `PartyRegistry.getOrCreateDefault()` is deleted; every code path that used it is updated to resolve the party from the request path instead.

The database schema gains two columns on the `party` table: `pin VARCHAR(5) NOT NULL UNIQUE` and `ended_at TIMESTAMPTZ` (nullable; non-null means the party has ended). PIN uniqueness among active parties is enforced at the application level with collision retry; the DB `UNIQUE` constraint is a safety net for the rare case of a race condition.

QR codes are generated on-demand by ZXing (`com.google.zxing:core` + `com.google.zxing:javase`, new Maven dependency). The join URL that gets encoded is configurable via `musicvoting.join.base-url` (default `http://localhost:4200/join`) so it can be overridden for production without a code change.

The Spotify OAuth callback URLs (`/spotify/callback`, `/spotify/ios/callback`) cannot carry a party ID in their path because those paths are pre-registered in the Spotify Developer Console. Instead, the party ID is threaded through the OAuth `state` parameter. `POST /api/party/{id}/spotify/login` encodes the party ID into `state` alongside the existing source tag (`web:<partyId>` or `ios:<installationId>:<partyId>`), and the callbacks parse it back out. The callback endpoints themselves stay at their current paths.

## Architecture Decisions

### Decision: Party resolved at endpoint boundary, not injected
Each JAX-RS resource method (or a `@PathParam`-carrying helper method on the resource class) calls `PartyRegistry.find(PartyId.of(partyId)).orElseThrow(404)` and passes the `Party` object down to the provider/service layer. The provider/service layer never touches `PartyRegistry` directly. This keeps the 404 logic in one place and leaves the service layer testable without a registry stub.

Alternatives considered: a CDI producer that injects `@RequestScoped Party` — more elegant but adds indirection and requires a CDI scope that's hard to test in unit tests.

### Decision: PIN generation with retry, not pre-allocation
PINs are generated randomly (`SecureRandom`, formatted as `%05d`) inside a short retry loop (up to 10 attempts). If all 10 attempts collide (astronomically unlikely at school-event scale), the create request fails with HTTP 503. PIN range is `00000`–`99999` (100 000 values); at any realistic number of concurrent parties the collision probability per attempt is negligible.

Alternatives considered: sequential counter — simpler but guessable; UUID fragment — not memorable for typing.

### Decision: QR code served as PNG endpoint, not embedded in POST response
`GET /api/party/{id}/qr` returns `image/png` so the Angular host page can use `<img [src]="'/api/party/' + id + '/qr'">` without base64 bloat in the create response. The create response (`POST /api/party`) returns only the JSON fields: `id`, `pin`, `joinUrl`. The QR image is fetched separately by the frontend.

Alternatives considered: return QR as data URL in POST body — simpler but large response and can't be used as an `<img src>` directly.

### Decision: `ended_at` column instead of hard-delete for ended parties
Setting `ended_at` rather than deleting the `party` row preserves the foreign key from `queue_entry` during the cascade delete and keeps history. The in-memory `Party` is still evicted from `PartyRegistry` on end, so live requests get 404 immediately.

### Decision: Callback paths stay at `/spotify/callback` and `/spotify/ios/callback`
Moving them would require updating the Spotify Developer Console registration and any OAuth redirect URIs stored in environment config. Keeping them in place is zero-risk; the party ID travels in `state` which Spotify passes back unchanged.

## Data Flow — Party Create

```
POST /api/party  {provider: "spotify"}
  → PartyResource.create()
      → generate UUID (PartyId.newRandom())
      → generate PIN (retry loop, SecureRandom)
      → persist PartyEntity (id, providerKind, pin, createdAt)
      → register Party in PartyRegistry
      → build joinUrl = baseUrl + "/" + pin
      → generate QR PNG bytes via ZXing
        (QR is NOT stored; generated fresh on each /qr request)
      → return {id, pin, joinUrl}   HTTP 201
```

## Data Flow — OAuth State Threading

```
GET /api/party/{id}/spotify/login?source=web
  → state = "web:" + partyId
  → redirect to Spotify with state

GET /spotify/callback?code=…&state=web:<partyId>
  → parse partyId from state
  → PartyRegistry.find(partyId).orElseThrow(404)
  → exchange code for token, store on party credentials
  → redirect to webRedirectUri
```

## File Changes

- `musicvoting/backend/setup.sql` (modified) — add `pin VARCHAR(5) NOT NULL DEFAULT ''` and `ended_at TIMESTAMPTZ` columns to `party` table; add `UNIQUE` index on `pin` where `ended_at IS NULL` (partial index)
- `musicvoting/backend/pom.xml` (modified) — add `com.google.zxing:core` and `com.google.zxing:javase`
- `musicvoting/backend/src/main/java/at/htl/domain/PartyEntity.java` (modified) — add `pin` and `endedAt` fields
- `musicvoting/backend/src/main/java/at/htl/domain/Party.java` (modified) — add `pin` field and getter
- `musicvoting/backend/src/main/java/at/htl/domain/PartyRegistry.java` (modified) — remove `getOrCreateDefault()`; add `findActive(pin)` for PIN lookup
- `musicvoting/backend/src/main/java/at/htl/endpoints/PartyResource.java` (new) — `POST /api/party`, `DELETE /api/party/{id}`, `GET /api/party/join/{pin}`, `GET /api/party/{id}/qr`
- `musicvoting/backend/src/main/java/at/htl/endpoints/TrackResource.java` (modified) — move path to `/api/party/{partyId}/track`, add party resolution helper
- `musicvoting/backend/src/main/java/at/htl/endpoints/SpotifyTokenResource.java` (modified) — move host-facing paths to `/api/party/{partyId}/spotify`, thread partyId through OAuth state, update callbacks to parse partyId from state
- `musicvoting/backend/src/main/resources/application.properties` (modified) — add `musicvoting.join.base-url` config property
