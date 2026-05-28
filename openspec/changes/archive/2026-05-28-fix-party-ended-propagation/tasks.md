# Tasks

## 1. iOS host exit calls the backend
- [x] 1.1 Add `Authorization: Bearer <hostPin>` header to `PartySession.endParty()` (was missing; DELETE would have 401'd)
- [x] 1.2 In `ExitView.handleAdminExit()`, wrap in `Task`, call `partySession.endParty()`; on error fall back to `partySession.clear()`; navigate to `.start` in both cases

## 2. iOS guest view SSE listener
- [x] 2.1 Add `sseEventsURL` computed property to `PartySessionStore` (reads/creates installationId from UserDefaults, builds `/api/spotify/events?source=ios&installationId=...`)
- [x] 2.2 Add `@EnvironmentObject var partySession` and `@State private var partyEndedAlert` to `Gast_ContentView`
- [x] 2.3 Add `.task { await listenForPartyEnded() }` — SwiftUI cancels automatically on disappear
- [x] 2.4 Add `.alert("Die Party ist beendet.", isPresented: $partyEndedAlert)` with OK button that calls `partySession.clear()` and sets `appState.currentSite = .start`

## 3. iOS admin view SSE listener
- [x] 3.1 Add `@EnvironmentObject var partySession` to `Admin_ContentView`
- [x] 3.2 Add `.task { await listenForPartyEnded() }` — on `party-ended`, calls `partySession.clear()` and sets `appState.currentSite = .start`

## 4. Verify
- [ ] 4.1 End party from web dashboard → iOS guest view shows alert and returns to start
- [ ] 4.2 End party from iOS admin → iOS guest view shows alert and returns to start
- [ ] 4.3 End party from iOS admin → backend receives DELETE and emits event (check backend logs)
- [ ] 4.4 Explicit iOS admin exit clears session so next launch shows start screen (regression check from previous fix)
