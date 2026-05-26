# Design: Enforce Host Authorization

## Technical Approach

A UUID host token is generated at party creation (`Party` constructor via `UUID.randomUUID().toString()`) and returned in the `POST /api/party` response. Protected backend endpoints are annotated with a custom JAX-RS `@HostOnly` name-binding annotation; a matching `ContainerRequestFilter` validates the `Authorization: Bearer <token>` header on those requests and returns 401 (absent header) or 403 (wrong token). The frontend stores the token in `localStorage` and an Angular HTTP interceptor appends the header to all requests that target the current party. A route guard blocks navigation to host pages if no token is stored.

## Architecture Decisions

### Decision: `@NameBinding` annotation over path-pattern matching in a global filter
Annotating each protected method with `@HostOnly` keeps the protected surface explicit and co-located with the endpoint declaration. Path-pattern matching in a global `@Provider` filter would need manual maintenance whenever a new host endpoint is added and is invisible at the declaration site.

### Decision: 401 for absent token, 403 for wrong token
Follows HTTP semantics: 401 = no credentials presented; 403 = credentials present but insufficient. This also allows the Angular frontend to distinguish "not logged in" from "logged in as wrong host".

### Decision: Party ID extracted from both `{id}` and `{partyId}` path params
`DELETE /api/party/{id}` uses `{id}`; `TrackResource` uses `{partyId}`. The filter checks `UriInfo.getPathParameters()` for both names in order so that no path-naming convention change is required.

### Decision: Host token stored in memory only (not in DB)
Tokens live for the lifetime of the in-memory `Party` object. When `DELETE /api/party/{id}` evicts the party from `PartyRegistry`, the token disappears with it. This avoids a DB column and a migration; the threat model (school event, single host, no external clients) does not require durable token storage.

### Decision: Frontend interceptor adds `Authorization` to all `/api/party/` requests when a token exists
The backend only enforces the header on `@HostOnly`-annotated methods; public endpoints ignore it. Guest clients never receive a host token, so they never send one. This is simpler than maintaining a separate list of protected paths on the frontend.

## Data Flow — Party Create (with token)

```
POST /api/party  {"provider": "spotify"}
  → PartyResource.create()
      → generate UUID partyId
      → Party constructor generates UUID hostToken
      → persist PartyEntity (id, providerKind, pin, createdAt)  ← no hostToken in DB
      → register Party in PartyRegistry
      → return HTTP 201 {"id", "pin", "joinUrl", "hostToken"}
  → Angular PartyService.createParty()
      → stores hostToken in localStorage key "mv_host_token"
```

## Data Flow — Host-only request

```
DELETE /api/party/{id}          Authorization: Bearer <token>
  → HostAuthFilter (name-bound to @HostOnly methods)
      → extract party ID: check path param {id}, then {partyId}
      → partyRegistry.find(partyId)  → 404 if not found
      → read Authorization header
          absent           → abort 401 Unauthorized
          token matches    → proceed to resource method
          token wrong      → abort 403 Forbidden
  → PartyResource.end() executes normally
```

## File Changes

**Backend**
- `Party.java` (modified) — add `hostToken` field (set in constructor via `UUID.randomUUID().toString()`); add `hostToken()` getter
- `at/htl/endpoints/HostOnly.java` (new) — `@NameBinding` qualifier annotation
- `at/htl/endpoints/HostAuthFilter.java` (new) — `@Provider @HostOnly ContainerRequestFilter`; reads `Authorization: Bearer` header, validates against `Party.hostToken()`; returns 401/403/404 as appropriate
- `PartyResource.java` (modified) — include `hostToken` in the `POST /api/party` response map; add `@HostOnly` to `DELETE /{id}`
- `TrackResource.java` (modified) — add `@HostOnly` to: `play`, `pause`, `resume`, `playNext` (`/next`), `startFromQueue` (`/start`), `saveToPlaylist`, `removeFromPlaylist` (`/remove`)

**Frontend**
- `party.service.ts` (modified) — add `hostToken: string` to `CreatePartyResponse`; add `TOKEN_KEY = 'mv_host_token'`; store on create, clear on `clearParty()`; expose `currentHostToken` getter
- `host-auth.interceptor.ts` (new) — functional `HttpInterceptorFn`; if `mv_host_token` is present in localStorage, clones the request with `Authorization: Bearer <token>` added; applies to all outgoing requests
- `host.guard.ts` (new) — `CanActivateFn`; returns `true` if `mv_host_token` exists in localStorage, otherwise redirects to `/`
- `main.ts` (modified) — change `provideHttpClient()` to `provideHttpClient(withInterceptors([hostAuthInterceptor]))`
- `app.routes.ts` (modified) — add `canActivate: [hostGuard]` to `startpage`, `dashboard`, `voting-host`, `search-host` routes
