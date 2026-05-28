# Proposal: Fix iOS Session Restore on App Launch

## Intent
When a guest or host fully closed the iOS app and reopened it, they were always shown the start screen and had to re-enter their PIN or re-create the party. The credentials were already persisted to `UserDefaults` by `PartySessionStore`, but `AppState` always initialised with `currentSite = .start`, ignoring any saved session.

## Scope
In scope:
- iOS app: restore guest session (navigate to guest view) on launch when a guest session is saved
- iOS app: restore host session (navigate to admin view) on launch when a host session is saved
- iOS app: clear the saved session when the user explicitly exits via ExitView

Out of scope:
- Web frontend session restore (handled separately via localStorage)
- Backend validation of whether the party is still active on restore (error handling already present in the views)
- Actually ending the party on the backend when the host taps "Party beenden" (separate task)

## Approach
Initialise `PartySessionStore` and `AppState` manually in `appApp.init()` using the `StateObject(wrappedValue:)` pattern. After creating the session store, inspect `hasActiveParty` and `role` to set the initial `currentSite` before the window renders. Also wire `partySession.clear()` into `ExitView` so that an explicit exit removes the stored credentials and does not trigger an auto-restore on the next launch.
