# Δ host/spec.md

## MODIFIED Requirements

### Requirement: Party-Ended Redirect for Host and Dashboard
When the host or dashboard receives a `party-ended` SSE event, the view MUST navigate to the home page and clear the stored party ID, **only if the event's `partyId` matches the client's current party**. Events for a different party MUST be ignored.
(Previously: no partyId check — any `party-ended` event triggered navigation regardless of which party it referred to.)

#### Scenario: Party ended externally for the same party
- GIVEN the host dashboard is open for party A
- WHEN a `party-ended` SSE event with `partyId=A` is received
- THEN the view navigates to the home page
- AND the session party ID is cleared

#### Scenario: party-ended for a different party is ignored
- GIVEN the host dashboard is open for party A
- WHEN a `party-ended` SSE event with `partyId=B` is received
- THEN the view does NOT navigate away
- AND the party A session remains active

### Requirement: iOS Admin View Reacts to Party-Ended SSE Event
The iOS admin view MUST maintain an SSE connection while open. When a `party-ended` event is received **whose `partyId` matches the current session's party ID**, the admin view MUST clear the stored session and return the host to the start screen. Events for other parties MUST be ignored.
(Previously: any `party-ended` event triggered navigation.)

#### Scenario: Party ended from web while iOS admin is open (same party)
- GIVEN the host has the iOS admin view open for party A
- AND the party is ended from the web dashboard
- WHEN the `party-ended` SSE event with `partyId=A` is received by the iOS app
- THEN the stored session is cleared from UserDefaults
- AND the app returns to the start screen

#### Scenario: Another party ends while iOS admin is open
- GIVEN the host has the iOS admin view open for party A
- WHEN a `party-ended` event with `partyId=B` is received
- THEN the iOS app does NOT navigate away
- AND party A's session remains intact
