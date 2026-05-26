# Tasks

## 1. Backend — Domain model

- [x] 1.1 Add `hostToken` field to `Party.java`: `private final String hostToken = UUID.randomUUID().toString();`; add `hostToken()` getter

## 2. Backend — Name-binding annotation

- [x] 2.1 Create `at/htl/endpoints/HostOnly.java`: a `@NameBinding` annotation (`@Retention(RUNTIME) @Target({TYPE, METHOD})`)

## 3. Backend — Authorization filter

- [x] 3.1 Create `at/htl/endpoints/HostAuthFilter.java`: `@Provider @HostOnly ContainerRequestFilter`
  - Inject `PartyRegistry`
  - Extract party ID from `UriInfo.getPathParameters()`: check `partyId` first, then `id`
  - If party not in registry → `abortWith(Response.status(404).build())`
  - Read `Authorization` header; if absent → `abortWith(Response.status(401).build())`
  - Parse `Bearer <token>`; if token does not match `party.hostToken()` → `abortWith(Response.status(403).build())`

## 4. Backend — Protect PartyResource

- [x] 4.1 Add `@HostOnly` to `DELETE /{id}` in `PartyResource.java`
- [x] 4.2 Include `hostToken` in the `POST /api/party` response map: add `"hostToken", party.hostToken()` to the response entity

## 5. Backend — Protect TrackResource

- [x] 5.1 Add `@HostOnly` to `play` (`PUT /play`) in `TrackResource.java`
- [x] 5.2 Add `@HostOnly` to `pause` (`POST /pause`)
- [x] 5.3 Add `@HostOnly` to `resume` (`POST /resume`)
- [x] 5.4 Add `@HostOnly` to `playNext` (`POST /next`)
- [x] 5.5 Add `@HostOnly` to `startFromQueue` (`POST /start`)
- [x] 5.6 Add `@HostOnly` to `saveToPlaylist` (`POST /saveToPlaylist`)
- [x] 5.7 Add `@HostOnly` to `removeFromPlaylist` (`DELETE /remove`)

## 6. Frontend — PartyService

- [x] 6.1 Add `hostToken: string` to the `CreatePartyResponse` interface in `party.service.ts`
- [x] 6.2 Add `private readonly TOKEN_KEY = 'mv_host_token'` constant
- [x] 6.3 In `createParty()` tap: store `res.hostToken` via `writeStorage(TOKEN_KEY, res.hostToken)`
- [x] 6.4 In `clearParty()`: call `removeStorage(TOKEN_KEY)`
- [x] 6.5 Add `get currentHostToken(): string | null` getter that returns `readStorage(TOKEN_KEY)`

## 7. Frontend — HTTP interceptor

- [x] 7.1 Create `src/app/host-auth.interceptor.ts`: functional `HttpInterceptorFn`
  - Read `localStorage.getItem('mv_host_token')`
  - If present, clone the request with header `Authorization: Bearer <token>` and forward it; otherwise forward unchanged

## 8. Frontend — Route guard

- [x] 8.1 Create `src/app/host.guard.ts`: `CanActivateFn`
  - If `localStorage.getItem('mv_host_token')` is non-null → return `true`
  - Otherwise → `inject(Router).navigate(['/'])` and return `false`

## 9. Frontend — Wire up interceptor and guard

- [x] 9.1 In `main.ts`: add `withInterceptors` import; change `provideHttpClient()` to `provideHttpClient(withInterceptors([hostAuthInterceptor]))`
- [x] 9.2 In `app.routes.ts`: add `canActivate: [hostGuard]` to the `startpage`, `dashboard`, `voting-host`, and `search-host` route entries

## 10. Verify

- [x] 10.1 Start the stack: `cd musicvoting && docker compose up -d && mvn quarkus:dev`
- [x] 10.2 `POST /api/party {"provider":"spotify"}` → confirm response includes `hostToken` (non-empty string)
- [x] 10.3 `DELETE /api/party/{id}` with no Authorization header → expect HTTP 401
- [x] 10.4 `DELETE /api/party/{id}` with `Authorization: Bearer wrong` → expect HTTP 403
- [x] 10.5 `DELETE /api/party/{id}` with correct `Authorization: Bearer <hostToken>` → expect HTTP 204
- [x] 10.6 `POST /api/party/{id}/track/pause` without Authorization → expect HTTP 401
- [x] 10.7 `GET /api/party/{id}/track/queue` without Authorization → expect HTTP 200 (public, not guarded)
- [ ] 10.8 Frontend: navigate to `/dashboard` without a stored token → confirm redirect to `/`
- [ ] 10.9 Frontend: create a party in the app, then call a host action → confirm Authorization header is present in the request (check browser DevTools Network tab)
