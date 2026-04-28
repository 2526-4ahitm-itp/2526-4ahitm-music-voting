# Delta for Guest

## MODIFIED Requirements

### Requirement: Join via QR Code
Guests MUST be able to join a party by scanning the QR code displayed on the dashboard. The QR code encodes a join URL of the form `<base-url>/join/<pin>`. Scanning MUST open the Angular app at `/join/<pin>`, which resolves the PIN to a party ID via `GET /api/party/join/{pin}` and navigates to the guest view scoped to that party. If PIN resolution fails (unknown or ended party) the guest MUST see an error message and MUST NOT be admitted.
(Previously: the requirement stated guests join by scanning the QR code but did not specify the frontend URL format or the PIN-resolution step.)

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

## ADDED Requirements

### Requirement: Party-Ended Redirect for Guests
When a connected guest receives a `party-ended` SSE event, the guest view MUST immediately navigate to a static "Die Party ist beendet." screen and MUST stop attempting any further API calls for that party.

#### Scenario: Host ends the party while guests are connected
- GIVEN one or more guests are in the guest view
- WHEN the host ends the party and the `party-ended` event is broadcast
- THEN every guest view displays "Die Party ist beendet."
- AND no further queue or vote requests are sent to the backend
