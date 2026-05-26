# Tasks

## 1. iOS — App infrastructure

- [x] 1.1 Add `hostMenu` and `hostPinEntry` cases to `SiteState` in `ContentView.swift`
- [x] 1.2 Add `PartySessionStore` as an `@EnvironmentObject` in `appApp.swift` (root injection alongside `AppState`)
- [x] 1.3 Wire `ContentView` switch to render `HostMenuView` for `.hostMenu` and `HostPinEntryView` for `.hostPinEntry`
- [x] 1.4 Update `StartView` "Gastgeber" button to set `appState.currentSite = .hostMenu` (instead of `.spotifyAuth`)

## 2. iOS — New views

- [x] 2.1 Create `HostMenuView.swift` with two buttons: "Party erstellen" and "Dashboard öffnen"
  - "Party erstellen" calls `PartySessionStore.createParty()`, on success sets `appState.currentSite = .spotifyAuth`; shows inline error on failure
  - "Dashboard öffnen" sets `appState.currentSite = .hostPinEntry`
  - Loading state while `createParty()` is in flight
  - Back button → `.start`
- [x] 2.2 Create `HostPinEntryView.swift` with a 5-digit PIN text field and a "Weiter" button
  - On submit calls `resolveAsHost(hostPin:)` against `GET /api/party/host-join/{hostPin}`
  - On success sets `appState.currentSite = .admin`
  - Shows "Party nicht gefunden." on 404, generic error otherwise
  - Back button → `.hostMenu`

## 3. iOS — Migrate AdminDashboard to party-scoped URLs

- [x] 3.1 Remove hardcoded URL constants (`queueURL`, `startURL`, `pauseURL`, etc.) from `AdminDashboardViewModel`
- [x] 3.2 Inject `PartySessionStore` into `AdminDashboard` / `AdminDashboardViewModel`
- [x] 3.3 Replace every `BackendConfiguration.endpoint("/api/track/…")` call with `partySession.partyURL("track/…")`
- [x] 3.4 Handle missing party ID gracefully (fallback URL returns 404 safely; no crash)
- [x] 3.5 Also migrated `SongAddView` search and addToPlaylist to party-scoped URLs

## 4. iOS — QRCodeView and AdminDashboard PIN display

- [x] 4.1 Remove the hardcoded `textInput` URL and local QR generation button
- [x] 4.2 Inject `PartySessionStore` into `QRCodeView`
- [x] 4.3 `QRCodeView` (Startseite tab) displays `partySession.pin` (guest PIN) labeled "Gäste-PIN"
- [x] 4.4 Fetch QR image from `GET /api/party/{id}/qr` using `partySession.partyURL("qr")` and display it
- [x] 4.5 Show a placeholder / error message if party ID or QR fetch is unavailable
- [x] 4.6 `AdminDashboard` (Admin tab) displays `partySession.hostPin` labeled "Host-PIN"
- [x] 4.7 `Admin_ContentView` keeps all 4 tabs: Admin, QR-Code, Voting, Add Song

## 5. iOS — Two-pin system in PartySession.swift

- [x] 5.1 `CreatePartyResponse` includes both `pin` (guest) and `hostPin`
- [x] 5.2 `HostJoinResponse` struct with `id` and `guestPin`
- [x] 5.3 `PartySessionStore` stores both `pin` and `hostPin` in UserDefaults separately
- [x] 5.4 `createParty()` stores both pins from backend response
- [x] 5.5 `resolve(pin:)` calls `GET /api/party/join/{pin}` — guest flow only
- [x] 5.6 `resolveAsHost(hostPin:)` calls `GET /api/party/host-join/{hostPin}`, stores guest pin from response and host pin
- [x] 5.7 `CodeInputView` replaced hardcoded check with real `resolve(pin:)` API call

## 6. Web — Host options page

- [x] 6.1 Create `host-options` Angular component with 3 buttons: "Party erstellen", "Dashboard öffnen", "Startseite öffnen"
- [x] 6.2 "Party erstellen" button navigates to `/create-party`
- [x] 6.3 "Dashboard öffnen" and "Startseite öffnen" show inline PIN entry and call `resolveHostPin()` against `GET /api/party/host-join/{hostPin}`
- [x] 6.4 Show error message on invalid/not-found PIN
- [x] 6.5 Add `/host-options` route to `app.routes.ts`
- [x] 6.6 Update `Home.gotohostpage()` to navigate to `/host-options`

## 7. Web — Two-pin system in PartyService and pages

- [x] 7.1 `PartyService` stores `pin` (guest) and `hostPin` separately in localStorage (`mv_party_pin`, `mv_party_host_pin`)
- [x] 7.2 `createParty()` stores both pins from `POST /api/party` response
- [x] 7.3 `resolveHostPin(hostPin)` added — calls `GET /api/party/host-join/{hostPin}`, stores `guestPin` as `pin` and entered pin as `hostPin`
- [x] 7.4 `resolvePin(pin)` unchanged — guest flow, calls `GET /api/party/join/{pin}`
- [x] 7.5 `getParty()` also updates `hostPin` if returned by backend
- [x] 7.6 `clearParty()` clears both pins
- [x] 7.7 `host-dashboard` reads and displays `hostPin` labeled "Host-PIN"
- [x] 7.8 `startpage` displays guest `pin` labeled "Gäste-PIN"

## 8. Backend — Two-pin system

- [x] 8.1 `Party.java` — added `hostPin` field alongside `pin`
- [x] 8.2 `PartyEntity.java` — added nullable `host_pin` column, `findByHostPin()` query
- [x] 8.3 `PartyRegistry.java` — added `findByHostPin()` lookup
- [x] 8.4 `setup.sql` — added `host_pin VARCHAR(5)` column + unique active-party index
- [x] 8.5 `POST /api/party` — generates two different pins via `generatePinPair()`, returns `{id, pin, hostPin, joinUrl}`
- [x] 8.6 `GET /api/party/join/{pin}` — guest endpoint, unchanged
- [x] 8.7 `GET /api/party/host-join/{hostPin}` — new host endpoint, returns `{id, guestPin}`
- [x] 8.8 `GET /api/party/{id}` — now also returns `hostPin` when present

## 9. Verification

- [x] 9.1 Web: two-pin system confirmed working end-to-end
- [x] 9.2 iOS: two-pin system confirmed working end-to-end
- [x] 9.3 iOS: Full "Party erstellen" flow — party created, Spotify auth succeeds, dashboard loads party-scoped queue
- [x] 9.4 iOS: "Dashboard öffnen" — enter host PIN, dashboard opens and loads correct queue
- [x] 9.5 iOS: QR-Code tab shows guest PIN and QR image from backend
- [x] 9.6 Web: "Party erstellen" flow unchanged and still works end-to-end
- [x] 9.7 Web: "Dashboard öffnen" — enter host PIN, dashboard opens for correct party
- [x] 9.8 Web: "Startseite öffnen" — enter host PIN, startpage opens for correct party
- [x] 9.9 Cross-platform: party created on web accessible via host PIN in iOS, and vice versa
- [x] 9.10 Error cases: invalid PIN shows error on both platforms

## Known limitations

- `host_pin` column is nullable in DB — old parties created before this change have `host_pin = NULL` and cannot be reopened via the host-join endpoint. Only newly created parties have both pins.
- `loadPartyDetails()` in iOS updates only guest `pin`, not `hostPin`. Not currently called anywhere; if wired up in future it needs updating.
