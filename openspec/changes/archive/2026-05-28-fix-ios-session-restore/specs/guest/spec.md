# Delta for Guest

## ADDED Requirements

### Requirement: iOS Guest Session Survives App Close
When the iOS app is fully closed and reopened, and a guest session is stored locally, the app MUST navigate directly to the guest view without prompting the guest to re-enter the party PIN.

#### Scenario: Guest reopens the iOS app after a full close
- GIVEN a guest has previously joined a party and the session (party ID, guest PIN, role) is stored in UserDefaults
- WHEN the guest fully closes the iOS app and reopens it
- THEN the app navigates directly to the guest view for the stored party
- AND the guest is NOT shown the start screen or the PIN entry screen

#### Scenario: Explicit guest exit clears the saved session
- GIVEN a guest is in the guest view and taps the exit button and confirms
- WHEN the exit is confirmed
- THEN the stored session credentials are cleared from UserDefaults
- AND the next app launch shows the start screen instead of auto-restoring the guest view
