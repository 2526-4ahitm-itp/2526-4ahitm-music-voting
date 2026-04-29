# Proposal: Wire Frontend to Party Endpoints

## Intent

The `add-party-lifecycle-endpoints` backend change moves all API paths under `/api/party/{id}/…` and adds `POST /api/party`, `DELETE /api/party/{id}`, and `GET /api/party/join/{pin}`. The Angular frontend still calls the old paths (`/api/track/…`, `/api/spotify/…`) with no party ID and has no party creation flow, no join-by-PIN page, and no party-ended handling. This change wires everything together so the full end-to-end flow works: host creates a party in the UI, guests join via QR code / PIN, and all clients handle the party-ended event.

## Scope

In scope:
- New `PartyService` Angular service — calls `POST /api/party` and `GET /api/party/join/{pin}`; stores the current party ID (BehaviorSubject, persisted to `sessionStorage`)
- Update `TrackService` and `SpotifyWebPlayerService` to inject `PartyService` and prefix every API call with `/api/party/{id}`
- New `/join/:pin` route and component — resolves the PIN to a party ID and redirects to the guest view
- Add a party-creation step to the host flow: host picks provider on a new screen, calls `POST /api/party`, then proceeds to Spotify login
- Display PIN and `<img [src]="qrUrl">` on the host dashboard after party creation
- Add "Party beenden" button on the host dashboard that calls `DELETE /api/party/{id}` and redirects to the home page
- Listen for the `party-ended` SSE event in all party-scoped views (guest, dashboard, host) and redirect to a "party ended" screen

Out of scope:
- Any change to the Spotify OAuth flow itself (that stays on the backend; the frontend still navigates to `/api/party/{id}/spotify/login`)
- iOS / SwiftUI app changes
- Persistence of party ID across browser sessions (sessionStorage is intentionally cleared on tab close)
- Multi-party support in the frontend (one party ID at a time)

## Approach

Introduce a `PartyService` with a `partyId$: BehaviorSubject<string | null>` and two methods: `createParty(provider)` and `resolvePin(pin)`. On startup it rehydrates from `sessionStorage`. `TrackService` and `SpotifyWebPlayerService` use `partyId$` synchronously (they read the current value before each HTTP call, throwing a clear error if it is null). Add a `JoinComponent` at `/join/:pin` that calls `resolvePin()` on init and navigates to the guest route on success. Update the host landing page to render a "Party erstellen" form before Spotify login, wiring up `createParty()`. After creation, the host view shows the QR image and PIN. A shared `PartyEndedGuard` (or simple SSE listener in a root-level component) listens for `party-ended` events and navigates every open view to a static "Die Party ist beendet." page.
