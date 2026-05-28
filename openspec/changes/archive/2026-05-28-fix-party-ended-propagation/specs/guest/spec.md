# Delta for Guest

## MODIFIED Requirements

### Requirement: Party-Ended Redirect for Guests
When a connected guest receives a `party-ended` SSE event, the guest view MUST immediately show "Die Party ist beendet." and MUST stop attempting any further API calls for that party. On all platforms (web and iOS), the stored session MUST be cleared and the user MUST be returned to the start screen.
(Previously: web-only scenario; no iOS scenario.)

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
