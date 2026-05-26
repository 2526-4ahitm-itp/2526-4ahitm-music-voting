# Proposal: Enforce Host Authorization

## Intent

Party-mutating endpoints (`DELETE /api/party/{id}`, playback controls, queue removal, blacklist management) are currently unprotected — any client that knows a party ID can call them. The spec already requires that guests be rejected from host-only actions, but nothing enforces this at the API level. This change adds a host token issued at party creation and validates it on all host-only endpoints.

## Scope

In scope:
- Generate a random opaque host token when `POST /api/party` is called; return it in the response and store it server-side on the `Party` aggregate.
- Require the host token as a `Bearer` token in the `Authorization` header on all host-only backend endpoints: `DELETE /api/party/{id}`, pause, resume, skip, remove-from-queue, and blacklist add/remove.
- Return HTTP 401 when the header is absent and HTTP 403 when the token is present but wrong.
- Store the token in `localStorage` on the Angular frontend after party creation; include it automatically in all host-originated requests.
- Angular `AuthGuard` (or equivalent) blocks the host dashboard route if no token is stored.

Out of scope:
- Token expiry / rotation (tokens live for the duration of the party only; they are deleted when the party ends, which is already implemented).
- Guest session tokens or identity (separate open question).
- JWT or signed tokens — a random UUID is sufficient for this threat model (no external clients, school project).
- Protecting `GET` endpoints (PIN lookup, QR code, queue reads) — these are intentionally public.

## Approach

On `POST /api/party`, the backend generates a `UUID` host token, stores it as a new `hostToken` field on the `Party` domain object, and includes it in the JSON response. A `ContainerRequestFilter` (`HostAuthFilter`) checks the `Authorization: Bearer <token>` header on every request path that requires host privileges. The filter looks up the party from the path parameter `{id}` and compares the token; missing or mismatched tokens yield 401/403 respectively. The frontend `PartyService` persists the token in `localStorage` (consistent with how `partyId` is currently stored) and an Angular HTTP interceptor appends the `Authorization` header to all requests to host-only paths.
