# Design: Integrate Party ID & Host Flow — iOS + Web

## Technical Approach

All party data is already stored and served by the backend. The task is purely front-end wiring on both platforms.

**iOS** — `PartySession.swift` (already exists, untracked) provides `PartySessionStore`, which covers `createParty()`, `resolve(pin:)`, `loadPartyDetails()`, `partyURL(path:)`, and `UserDefaults` persistence. Two new SwiftUI views (`HostMenuView`, `HostPinEntryView`) are added and routed through two new `SiteState` cases. `AdminDashboard` drops its hardcoded URL constants and replaces them with `partySession.partyURL(path:)` calls. `QRCodeView` is rebuilt to fetch from the backend instead of generating locally.

**Web** — A new `/host-options` Angular page replaces the direct `/create-party` shortcut. The existing `PartyService` and `CodeInput` PIN pattern are reused for PIN-based flows. Home navigates to `/host-options` instead of `/create-party`.

## Architecture Decisions

### Decision: Reuse `PartySessionStore` as `@EnvironmentObject`
Inject `PartySessionStore` at the app root (alongside `AppState`) so all views (`HostMenuView`, `SpotifyAuthView`, `AdminDashboard`, `QRCodeView`) can read and write party state without prop-drilling.
Alternatives considered: passing it as a parameter — rejected because `AdminDashboard` and `QRCodeView` are nested inside `Admin_ContentView` which is inside `ContentView`, making injection much cleaner.

### Decision: Two new SiteState cases (`hostMenu`, `hostPinEntry`) instead of NavigationStack
`ContentView` already uses a flat enum-switch for routing. Adding two cases is the minimal, consistent change.
Alternatives considered: converting to `NavigationStack` with push/pop — rejected as it would require refactoring all existing views.

### Decision: New `/host-options` web page instead of modifying `/create-party`
`/create-party` is a simple focused component (create + Spotify redirect). Rather than adding conditional UI to it, a new `/host-options` page acts as the landing with three clear paths, and `/create-party` remains a dedicated step reachable from it.
Alternatives considered: converting `/create-party` into a multi-mode component — rejected to keep each component single-purpose.

### Decision: Reuse `GET /api/party/join/{pin}` for host PIN lookup
This endpoint already resolves a PIN to a party ID. The only difference for the host case is that `PartySessionStore` stores `role: .host` instead of `.guest`. No new backend endpoint is needed.

## Data Flow

### iOS "Party erstellen":
```
HostMenuView.createParty()
  → PartySessionStore.createParty()
  → POST /api/party
  → store id, pin, role=host in UserDefaults
  → appState.currentSite = .spotifyAuth
  → SpotifyAuthView (party ID already set)
  → on login success → appState.currentSite = .admin
  → AdminDashboard fetches /api/party/{id}/track/queue
```

### iOS "Dashboard öffnen":
```
HostMenuView → appState.currentSite = .hostPinEntry
HostPinEntryView.submit(pin)
  → PartySessionStore.resolveAsHost(pin:)
  → GET /api/party/join/{pin}
  → store id, pin, role=host in UserDefaults
  → appState.currentSite = .admin
  → AdminDashboard fetches /api/party/{id}/track/queue
```

### Web "Dashboard öffnen" / "Startseite öffnen":
```
Home → /host-options
HostOptions: user enters PIN, clicks "Dashboard öffnen" or "Startseite öffnen"
  → GET /api/party/join/{pin}
  → PartyService.setCurrentPartyId(id), setCurrentPin(pin)
  → router.navigate(['/dashboard']) or router.navigate(['/startpage'])
```

## File Changes

### iOS
- `musicvoting/app/app/ContentView.swift` (modified — add `hostMenu`, `hostPinEntry` to `SiteState`; add `PartySessionStore` `@EnvironmentObject` injection)
- `musicvoting/app/app/views_content/StartView.swift` (modified — "Gastgeber" button sets `.hostMenu`)
- `musicvoting/app/app/views_content/views/HostMenuView.swift` (new)
- `musicvoting/app/app/views_content/views/HostPinEntryView.swift` (new)
- `musicvoting/app/app/views_content/views/SpotifyAuthView.swift` (modified — remove `createParty()` call if any; now party is already created before arriving here)
- `musicvoting/app/app/views_content/views/AdminDash/AdminDashboard.swift` (modified — replace hardcoded URL constants with `partySession.partyURL(path:)`)
- `musicvoting/app/app/views_content/views/QRCodeView.swift` (modified — show PIN from session, load QR from backend)
- `musicvoting/app/appApp.swift` (modified — inject `PartySessionStore` as `@EnvironmentObject`)

### Web
- `musicvoting/frontend/src/app/pages/home/home.ts` (modified — navigate to `/host-options`)
- `musicvoting/frontend/src/app/pages/home/home.html` (modified — button label/action unchanged, target route changes)
- `musicvoting/frontend/src/app/pages/host-options/` (new component — 3 buttons + inline PIN entry states)
- `musicvoting/frontend/src/app/app.routes.ts` (modified — add `/host-options` route)
