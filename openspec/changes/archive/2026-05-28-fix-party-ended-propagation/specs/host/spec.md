# Delta for Host

## MODIFIED Requirements

### Requirement: Host Can End the Party from the Dashboard
The host MUST be able to end the party from any client (web dashboard or iOS admin view). Ending MUST call `DELETE /api/party/{id}` so that the backend emits the `party-ended` event to all connected clients. After confirmation and successful deletion, the host MUST be redirected to the home page and the session party ID MUST be cleared.
(Previously: scenario only covered the web dashboard; iOS admin exit cleared session locally without calling the backend.)

#### Scenario: Host ends the party from the web dashboard
- GIVEN the host is on the web dashboard with an active party
- WHEN the host taps "Party beenden" and confirms
- THEN `DELETE /api/party/{id}` is called
- AND the host is redirected to the home page
- AND the stored party ID is cleared from the session

#### Scenario: Host ends the party from the iOS admin view
- GIVEN the host is in the iOS admin view with an active party
- WHEN the host taps the exit button and confirms
- THEN `DELETE /api/party/{id}` is called
- AND the backend emits the `party-ended` SSE event to all connected clients
- AND the iOS app clears the stored session and returns to the start screen

## ADDED Requirements

### Requirement: iOS Admin View Reacts to Party-Ended SSE Event
The iOS admin view MUST maintain an SSE connection while open. When a `party-ended` event is received (e.g. party ended from the web dashboard while the iOS admin is open), the admin view MUST clear the stored session and return the host to the start screen.

#### Scenario: Party ended from web while iOS admin is open
- GIVEN the host has the iOS admin view open
- AND the party is ended from the web dashboard
- WHEN the `party-ended` SSE event is received by the iOS app
- THEN the stored session is cleared from UserDefaults
- AND the app returns to the start screen
