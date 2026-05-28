# Delta for Host

## ADDED Requirements

### Requirement: iOS Host Session Survives App Close
When the iOS app is fully closed and reopened, and a host session is stored locally, the app MUST navigate directly to the admin (host dashboard) view without prompting the host to re-create the party or re-authenticate with Spotify.

#### Scenario: Host reopens the iOS app after a full close
- GIVEN a host has previously created a party and the session (party ID, guest PIN, host PIN, role) is stored in UserDefaults
- WHEN the host fully closes the iOS app and reopens it
- THEN the app navigates directly to the admin view for the stored party
- AND the host is NOT shown the start screen, host menu, or Spotify auth screen

#### Scenario: Explicit host exit clears the saved session
- GIVEN a host is in the admin view and taps the exit button and confirms
- WHEN the exit is confirmed
- THEN the stored session credentials are cleared from UserDefaults
- AND the next app launch shows the start screen instead of auto-restoring the admin view
