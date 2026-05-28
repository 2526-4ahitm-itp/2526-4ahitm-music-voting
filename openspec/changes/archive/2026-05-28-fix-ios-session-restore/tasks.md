# Tasks

## 1. App launch session restore
- [x] 1.1 Refactor `appApp.init()` to create `PartySessionStore` and `AppState` manually using `StateObject(wrappedValue:)`
- [x] 1.2 After creating the session store, check `hasActiveParty` and `role`; set `AppState.currentSite` to `.admin` (host) or `.guest` (guest) before the window renders

## 2. Explicit exit clears session
- [x] 2.1 Add `@EnvironmentObject var partySession: PartySessionStore` to `ExitView`
- [x] 2.2 Call `partySession.clear()` in `handleGuestExit()` before navigating to `.start`
- [x] 2.3 Call `partySession.clear()` in `handleAdminExit()` before navigating to `.start`
- [x] 2.4 Add `PartySessionStore` to `ExitView` `#Preview`
