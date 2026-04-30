# Proposal: Integrate Party ID & Host Flow — iOS + Web

## Intent

The backend already exposes all necessary party endpoints (`POST /api/party`, `GET /api/party/{id}`, `GET /api/party/join/{pin}`, `GET /api/party/{id}/qr`) and the web dashboard already consumes party-scoped track endpoints. However, neither the iOS app nor the web host landing page uses the party ID and PIN correctly end-to-end:

- iOS goes directly from "Gastgeber" → Spotify auth → dashboard, skipping party creation entirely and using hardcoded non-party-scoped URLs in the dashboard.
- The web host landing navigates directly to `/create-party` with no option to re-open an existing party created from iOS (or another web session).

This change wires both platforms to the same party identity model so that a party created on one platform is accessible on the other, queues are always loaded from the DB by party ID, and the host PIN is the single cross-platform entry credential.

## Scope

In scope:
- iOS: new "host choice" screen between the start screen and Spotify auth (2 buttons: "Party erstellen", "Dashboard öffnen")
- iOS: "Party erstellen" flow — call `POST /api/party`, store party ID + PIN in `PartySessionStore`, then Spotify auth, then dashboard
- iOS: "Dashboard öffnen" flow — PIN entry → `GET /api/party/join/{pin}` → store party ID (host role) → dashboard
- iOS: Migrate `AdminDashboard` to party-scoped URLs via `PartySessionStore.partyURL(path:)`
- iOS: Update `QRCodeView` to display the stored host PIN and load the QR image from `GET /api/party/{id}/qr`
- Web: Replace the direct "Gastgeber" → `/create-party` navigation with a new `/host-options` landing that shows 3 buttons: "Party erstellen", "Dashboard öffnen", "Startseite öffnen"
- Web: "Dashboard öffnen" — PIN entry → `GET /api/party/join/{pin}` → store party ID → navigate to `/dashboard`
- Web: "Startseite öffnen" — PIN entry → `GET /api/party/join/{pin}` → store party ID → navigate to `/startpage`

Out of scope:
- Backend changes (all required endpoints already exist)
- Guest-side changes
- YouTube provider support
- Changes to Spotify OAuth mechanics
- Changing existing `create-party` web component internals

## Approach

**iOS:** Add two new `SiteState` cases (`hostMenu`, `hostPinEntry`) to `AppState`. Create `HostMenuView` (2 buttons) and `HostPinEntryView` (PIN field + validate). Inject `PartySessionStore` (already implemented in `PartySession.swift`) as an `@EnvironmentObject` throughout the admin flow. Update `AdminDashboard` to call `partySession.partyURL(path:)` instead of hardcoded `/api/track/…` paths. Update `QRCodeView` to read PIN from `PartySessionStore` and fetch the QR image from the backend.

**Web:** Add a new `/host-options` Angular page with 3 action buttons. Reuse or extend the existing PIN entry pattern (already present in `CodeInput` for guests) for host PIN resolution. Navigate to `/dashboard` or `/startpage` after successful PIN validation, setting the party ID in `PartyService` before navigation. Update `Home` to navigate to `/host-options` instead of `/create-party`.
