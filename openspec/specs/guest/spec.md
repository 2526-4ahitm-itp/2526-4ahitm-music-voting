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
When a connected guest receives a `party-ended` SSE event, the guest view MUST immediately navigate to a static "Die Party ist beendet." screen and MUST stop attempting any further API calls for that party.

#### Scenario: Host ends the party while guests are connected
- GIVEN one or more guests are in the guest view
- WHEN the host ends the party and the `party-ended` event is broadcast
- THEN every guest view displays "Die Party ist beendet."
- AND no further queue or vote requests are sent to the backend

### Requirement: Guest Session Persists Across Reloads
A guest's anonymous identity SHOULD persist across reloads of the same device so that the guest's existing likes and adds remain attributed to them.

#### Scenario: Guest reloads the page
- GIVEN a guest has added one song and liked two songs
- WHEN the guest reloads the page
- THEN the same guest identity is restored
- AND the two likes are still shown as "liked by me"
