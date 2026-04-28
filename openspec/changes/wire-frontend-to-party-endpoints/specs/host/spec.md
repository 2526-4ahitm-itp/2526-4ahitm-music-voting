# Delta for Host

## ADDED Requirements

### Requirement: Host Creates Party Before Provider Login
Before authenticating with a provider, the host MUST explicitly create a party by selecting the music provider on a dedicated "Party erstellen" screen. The system MUST call `POST /api/party` with the chosen provider and MUST store the returned party ID for the duration of the session. Only after successful party creation does the host proceed to the provider OAuth login.

#### Scenario: Host creates a party and is forwarded to Spotify login
- GIVEN the host opens the host landing page
- WHEN the host selects "Spotify" and taps "Party erstellen"
- THEN `POST /api/party {"provider": "spotify"}` is called
- AND the returned party ID is stored in the session
- AND the host is navigated to `/api/party/{id}/spotify/login`

### Requirement: Host Sees PIN and QR Code After Creation
After a party is created, the host view MUST display the 5-digit PIN and a QR code image that guests can scan. The QR code MUST be loaded from `GET /api/party/{id}/qr`.

#### Scenario: Host dashboard shows PIN and QR code
- GIVEN the host has just created a party
- WHEN the host dashboard loads
- THEN the PIN is visible as a large readable number
- AND a QR code image is displayed (loaded from `/api/party/{id}/qr`)
- AND scanning the QR code navigates to `/join/{pin}` in a guest browser

### Requirement: Host Can End the Party from the Dashboard
The host dashboard MUST include a "Party beenden" button that calls `DELETE /api/party/{id}`. After confirmation and successful deletion, the host MUST be redirected to the home page and the session party ID MUST be cleared.

#### Scenario: Host ends the party
- GIVEN the host is on the dashboard with an active party
- WHEN the host taps "Party beenden" and confirms
- THEN `DELETE /api/party/{id}` is called
- AND the host is redirected to the home page
- AND the stored party ID is cleared from the session

## ADDED Requirements (continued)

### Requirement: Party-Ended Redirect for Host and Dashboard
When the host or dashboard receives a `party-ended` SSE event (e.g. triggered from another device), the view MUST navigate to the home page and clear the stored party ID.

#### Scenario: Party ended externally
- GIVEN the host dashboard is open
- WHEN a `party-ended` SSE event is received
- THEN the view navigates to the home page
- AND the session party ID is cleared
