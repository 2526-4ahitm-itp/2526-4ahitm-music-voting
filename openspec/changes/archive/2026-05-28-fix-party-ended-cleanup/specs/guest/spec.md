# Delta for Guest

## MODIFIED Requirements

### Requirement: iOS Guest View Reacts to Party-Ended SSE Event
When the iOS app is fully closed and reopened, and a guest session is stored locally, the app MUST navigate directly to the guest view without prompting the guest to re-enter the party PIN. The iOS guest view MUST maintain a persistent SSE connection while open. The connection MUST use no request timeout and MUST reconnect automatically if the stream drops, so that the `party-ended` event is reliably received regardless of how long the party has been running.
(Previously: no mention of timeout or reconnect behaviour.)

#### Scenario: SSE connection drops and reconnects
- GIVEN the iOS guest view is open and the SSE connection drops (timeout or network blip)
- WHEN the connection is lost
- THEN the app waits briefly and reopens the SSE connection
- AND the guest continues to receive future `party-ended` events

#### Scenario: Party ended after SSE reconnect
- GIVEN the iOS guest's SSE connection has reconnected at least once
- WHEN the host ends the party
- THEN the `party-ended` event is received by the guest
- AND the app shows "Die Party ist beendet." and returns to the start screen
