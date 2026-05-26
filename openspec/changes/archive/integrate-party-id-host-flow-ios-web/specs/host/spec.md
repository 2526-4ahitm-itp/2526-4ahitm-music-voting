# Delta for Host

## MODIFIED Requirements

### Requirement: Host Creates Party Before Provider Login
Before authenticating with a provider, the host MUST first land on a **host choice screen** that offers two paths on iOS (three on web). Only after selecting "Party erstellen" and receiving a successful party creation response does the host proceed to provider OAuth login. The returned party ID and PIN MUST be persisted in the session before navigating to OAuth.
(Previously: host navigated directly to provider OAuth without a choice screen or explicit party creation step.)

#### Scenario: Host selects "Party erstellen" on iOS
- GIVEN the host taps "Gastgeber auf einer Party" on the start screen
- WHEN the host choice screen appears and the host taps "Party erstellen"
- THEN `POST /api/party {"provider": "spotify"}` is called
- AND the returned `id` and `pin` are stored in the session with role `host`
- AND the host is navigated to the Spotify OAuth screen

#### Scenario: Host selects "Party erstellen" on web
- GIVEN the host clicks "Gastgeber einer Party" on the home page
- WHEN the host choice screen appears and the host clicks "Party erstellen"
- THEN the system creates a party via `POST /api/party`
- AND the host is redirected to `/api/party/{id}/spotify/login?source=web`

#### Scenario: Host sees the choice screen before doing anything else
- GIVEN the host opens the application (iOS or web)
- WHEN the host taps/clicks the "Gastgeber" button on the start/home screen
- THEN a choice screen is shown with the available host-entry options
- AND no API call is made until the host picks an option

## ADDED Requirements

### Requirement: Host Can Re-Open Dashboard via PIN (iOS)
On iOS, a host MUST be able to enter the Host Party PIN to look up a previously created party (e.g. created on web or in a prior session) and open the app dashboard for that party. After successful PIN resolution the party ID MUST be stored in the session with role `host`.

#### Scenario: Host opens dashboard for existing party via PIN on iOS
- GIVEN the host is on the iOS host choice screen
- WHEN the host taps "Dashboard öffnen" and enters a valid PIN
- THEN `GET /api/party/join/{pin}` is called
- AND the returned `id` is stored in the session with role `host` and the entered PIN
- AND the host is navigated to the iOS admin dashboard

#### Scenario: Invalid PIN returns an error message on iOS
- GIVEN the host is on the PIN entry screen (iOS)
- WHEN the host enters a PIN that does not match any active party
- THEN HTTP 404 is returned by the backend
- AND the view shows "Party nicht gefunden."
- AND the host remains on the PIN entry screen

### Requirement: Host Can Re-Open Dashboard or Startpage via PIN (Web)
On web, a host MUST be able to enter the Host Party PIN to open either the dashboard or the startpage of a previously created party. After successful PIN resolution the party ID MUST be stored in `PartyService` before navigation.

#### Scenario: Host opens dashboard for existing party via PIN on web
- GIVEN the host is on the web host choice screen
- WHEN the host clicks "Dashboard öffnen", enters a valid PIN, and confirms
- THEN `GET /api/party/join/{pin}` is called
- AND the returned `id` is stored in `PartyService`
- AND the host is navigated to `/dashboard`

#### Scenario: Host opens startpage for existing party via PIN on web
- GIVEN the host is on the web host choice screen
- WHEN the host clicks "Startseite öffnen", enters a valid PIN, and confirms
- THEN `GET /api/party/join/{pin}` is called
- AND the returned `id` is stored in `PartyService`
- AND the host is navigated to `/startpage`

#### Scenario: Invalid PIN on web
- GIVEN the host is on the web PIN entry screen
- WHEN the host enters a PIN that does not match any active party
- THEN an error message is shown
- AND the host remains on the PIN entry screen

### Requirement: iOS Admin Dashboard Uses Party-Scoped Endpoints
The iOS admin dashboard MUST construct all track and playback API URLs using the stored party ID (via `PartySessionStore.partyURL(path:)`). Hardcoded `/api/track/…` URLs MUST NOT be used.

#### Scenario: Dashboard loads queue after party creation
- GIVEN the host has created a party (ID stored in session)
- WHEN the iOS admin dashboard loads
- THEN queue is fetched from `/api/party/{id}/track/queue`
- AND current playback is fetched from `/api/party/{id}/track/current`

#### Scenario: Dashboard loads queue after PIN-based dashboard open
- GIVEN the host has opened the dashboard via PIN entry (ID stored from PIN resolution)
- WHEN the iOS admin dashboard loads
- THEN queue is fetched from `/api/party/{id}/track/queue`

### Requirement: iOS QR Code Tab Shows PIN and Backend QR
The iOS QR Code tab MUST display the stored Host Party PIN as readable text AND load the QR code image from `GET /api/party/{id}/qr`. The hardcoded static URL MUST be removed.

#### Scenario: QR tab shows party PIN and QR image
- GIVEN the host is on the admin screen with an active party (ID and PIN stored)
- WHEN the host opens the "QR-Code" tab
- THEN the 5-digit PIN is displayed as large readable text
- AND the QR code image is loaded from `/api/party/{id}/qr`
- AND the QR image is shown (or a loading/error placeholder if the request fails)
