# Guest Specification

## Purpose

Defines how a guest joins a party, how the system identifies them anonymously, and what per-guest limits apply. Guests are the primary contributors of songs and likes. They never register, log in, or provide a name.
## Requirements
### Requirement: Anonymous Guest Identity
The system MUST assign each guest an anonymous identifier on first contact. Guests MUST NOT be required to supply a name, email, or any provider login.

#### Scenario: Guest is assigned an identity on join
- GIVEN a visitor opens the guest app and joins a party
- WHEN the join completes
- THEN the system has associated the visitor with an anonymous guest identifier
- AND the guest is not asked for a name or any account credentials

### Requirement: Join via QR Code
Guests MUST be able to join a party by scanning the QR code displayed on the dashboard. The QR code encodes a join URL of the form `<base-url>/join/<pin>`. Scanning MUST open the Angular app at `/join/<pin>`, which resolves the PIN to a party ID via `GET /api/party/join/{pin}` and navigates to the guest view scoped to that party. If PIN resolution fails (unknown or ended party) the guest MUST see an error message and MUST NOT be admitted.

#### Scenario: Guest joins via QR code
- GIVEN the dashboard is showing a QR code for an active party with PIN `"47291"`
- WHEN a guest scans the QR code
- THEN the browser opens `/join/47291`
- AND the app resolves the PIN to a party ID
- AND the guest is navigated to the guest view for that party

#### Scenario: Guest arrives with an invalid PIN
- GIVEN no active party holds PIN `"00000"`
- WHEN a guest navigates to `/join/00000`
- THEN the app displays an error ("Party nicht gefunden." or similar)
- AND the guest is not admitted to any party view

### Requirement: Per-Guest Add Rate Limit
A guest MUST NOT be able to add more than 10 songs per rolling minute. Exceeding the limit MUST be rejected with a user-visible message.

#### Scenario: Guest is rate-limited after 10 adds
- GIVEN a guest who has added 10 songs within the last minute
- WHEN the guest attempts to add an 11th song
- THEN the request is rejected
- AND the guest sees a message such as "Zu viele Anfragen — bitte kurz warten."

### Requirement: Party-Ended Redirect for Guests
When a connected guest receives a `party-ended` SSE event, the guest view MUST immediately show "Die Party ist beendet." and MUST stop attempting any further API calls for that party. On all platforms (web and iOS), the stored session MUST be cleared and the user MUST be returned to the start screen.

#### Scenario: Host ends the party while web guests are connected
- GIVEN one or more guests are in the web guest view
- WHEN the host ends the party and the `party-ended` event is broadcast
- THEN every web guest view displays "Die Party ist beendet."
- AND no further queue or vote requests are sent to the backend

#### Scenario: Host ends the party while iOS guests are connected
- GIVEN one or more guests have the iOS app open in the guest view
- WHEN the host ends the party (from web or iOS) and the `party-ended` SSE event is received
- THEN the iOS guest view shows "Die Party ist beendet."
- AND the stored session is cleared from UserDefaults
- AND the app returns to the start screen
- AND no further API calls for that party are made

### Requirement: Guest Session Persists Across Reloads
A guest's anonymous identity MUST be restored across reloads of the same device when a previously stored identity exists, so that the guest's existing likes and adds remain attributed to them. The persistence mechanism (localStorage, cookie, or device ID) is not yet fixed — see the project's open questions.

#### Scenario: Guest reloads the page
- GIVEN a guest has added one song and liked two songs
- WHEN the guest reloads the page
- THEN the same guest identity is restored
- AND the two likes are still shown as "liked by me"

### Requirement: iOS Guest SSE Connection Is Persistent and Reconnects
The iOS guest view MUST open its SSE connection with no request timeout and MUST reconnect automatically after a brief delay if the stream drops, so that the `party-ended` event is reliably received regardless of how long the party has been running.

#### Scenario: SSE connection drops and reconnects
- GIVEN the iOS guest view is open and the SSE connection drops (timeout or network blip)
- WHEN the connection is lost
- THEN the app waits briefly and reopens the SSE connection
- AND the guest continues to receive future `party-ended` events

#### Scenario: Party ended after SSE reconnect
- GIVEN the iOS guest's SSE connection has reconnected at least once
- WHEN the host ends the party
- THEN the `party-ended` event is received
- AND the app shows "Die Party ist beendet." and returns to the start screen

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

