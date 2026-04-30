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
  - On submit calls `resolveAsHost(pin:)` (added to `PartySession.swift`)
  - On success sets `appState.currentSite = .admin`
  - Shows "Party nicht gefunden." on 404, generic error otherwise
  - Back button → `.hostMenu`

## 3. iOS — Migrate AdminDashboard to party-scoped URLs

- [x] 3.1 Remove hardcoded URL constants (`queueURL`, `startURL`, `pauseURL`, etc.) from `AdminDashboardViewModel`
- [x] 3.2 Inject `PartySessionStore` into `AdminDashboard` / `AdminDashboardViewModel`
- [x] 3.3 Replace every `BackendConfiguration.endpoint("/api/track/…")` call with `partySession.partyURL("track/…")`
- [x] 3.4 Handle missing party ID gracefully (fallback URL returns 404 safely; no crash)
- [x] 3.5 Also migrated `SongAddView` search and addToPlaylist to party-scoped URLs

## 4. iOS — Update QRCodeView

- [x] 4.1 Remove the hardcoded `textInput` URL and local QR generation button
- [x] 4.2 Inject `PartySessionStore` into `QRCodeView`
- [x] 4.3 Display `partySession.pin` as large bold text ("Host-PIN: XXXXX")
- [x] 4.4 Fetch QR image from `GET /api/party/{id}/qr` using `partySession.partyURL("qr")` and display it
- [x] 4.5 Show a placeholder / error message if party ID or QR fetch is unavailable

## 5. Web — Host options page

- [x] 5.1 Create `host-options` Angular component (`host-options.ts`, `host-options.html`, `host-options.css`) with 3 buttons: "Party erstellen", "Dashboard öffnen", "Startseite öffnen"
- [x] 5.2 "Party erstellen" button navigates to `/create-party` (existing component, no changes needed)
- [x] 5.3 "Dashboard öffnen" button shows an inline PIN entry form; on submit calls `GET /api/party/join/{pin}`, stores party ID via `PartyService`, navigates to `/dashboard`
- [x] 5.4 "Startseite öffnen" button shows an inline PIN entry form; on submit calls `GET /api/party/join/{pin}`, stores party ID via `PartyService`, navigates to `/startpage`
- [x] 5.5 Show error message on invalid/not-found PIN for both flows
- [x] 5.6 Add `/host-options` route to `app.routes.ts`
- [x] 5.7 Update `Home.gotohostpage()` to navigate to `/host-options` instead of `/create-party`

## 6. Verification

- [ ] 6.1 iOS: Full "Party erstellen" flow — party is created, ID is stored, Spotify auth succeeds, dashboard loads party-scoped queue
- [ ] 6.2 iOS: Full "Dashboard öffnen" flow — enter PIN for a party created on web, dashboard opens and loads correct queue
- [ ] 6.3 iOS: QR code tab shows correct PIN and QR image from backend
- [ ] 6.4 Web: "Party erstellen" flow unchanged and still works end-to-end
- [ ] 6.5 Web: "Dashboard öffnen" — enter PIN, dashboard opens for correct party
- [ ] 6.6 Web: "Startseite öffnen" — enter PIN, startpage opens for correct party
- [ ] 6.7 Cross-platform: party created on web is accessible via its PIN in iOS "Dashboard öffnen", and vice versa
- [ ] 6.8 Error cases: invalid PIN shows error on both platforms; party creation failure shows error in iOS `HostMenuView`
