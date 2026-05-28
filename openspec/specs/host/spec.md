# Host Specification

## Purpose

Defines the host role: the party creator who has exclusive permission to control playback, curate the queue manually, and manage a party-scoped blacklist. Host controls run on the host's own device (typically a phone); the dashboard never exposes host controls.

## Requirements

### Requirement: Host Creates Party Before Provider Login
Before authenticating with a provider, the host MUST explicitly create a party by selecting the music provider on a dedicated "Party erstellen" screen. The system MUST call `POST /api/party` with the chosen provider and MUST store the returned party ID and host PIN for the duration of the session. Only after successful party creation does the host proceed to the provider OAuth login.

#### Scenario: Host creates a party and host PIN is stored
- GIVEN the host opens the "Party erstellen" screen
- WHEN the host selects "Spotify" and confirms
- THEN `POST /api/party {"provider": "spotify"}` is called
- AND the returned `hostPin` is stored in `localStorage`
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
The host MUST be able to end the party from any client (web dashboard or iOS admin view). Ending MUST call `DELETE /api/party/{id}` so that the backend emits the `party-ended` event to all connected clients. After confirmation and successful deletion, the host MUST be redirected to the home page and the session party ID MUST be cleared.

#### Scenario: Host ends the party from the web dashboard
- GIVEN the host is on the web dashboard with an active party
- WHEN the host taps "Party beenden" and confirms
- THEN `DELETE /api/party/{id}` is called
- AND the host is redirected to the home page
- AND the stored party ID is cleared from the session

#### Scenario: Host ends the party from the iOS admin view
- GIVEN the host is in the iOS admin view with an active party
- WHEN the host taps the exit button and confirms
- THEN `DELETE /api/party/{id}` is called with the host PIN in the Authorization header
- AND the backend emits the `party-ended` SSE event to all connected clients
- AND the iOS app clears the stored session and returns to the start screen

### Requirement: Party-Ended Redirect for Host and Dashboard
When the host or dashboard receives a `party-ended` SSE event (e.g. triggered from another device), the view MUST navigate to the home page and clear the stored party ID.

#### Scenario: Party ended externally
- GIVEN the host dashboard is open
- WHEN a `party-ended` SSE event is received
- THEN the view navigates to the home page
- AND the session party ID is cleared

### Requirement: Host Controls Playback
The host MUST be able to pause, resume, and skip the currently playing song.

#### Scenario: Host pauses playback
- GIVEN a song is playing
- WHEN the host taps "Pause"
- THEN playback on the dashboard pauses
- AND the paused state is reflected on every connected client

#### Scenario: Host skips the current song
- GIVEN a song is playing
- WHEN the host taps "Skip"
- THEN the current song is removed from the queue
- AND the next song in sort order begins playing

### Requirement: Host Removes Songs from Queue
The host MUST be able to remove any song from the queue, including ones not yet played.

#### Scenario: Host removes a queued song
- GIVEN a queue with three upcoming songs
- WHEN the host removes the second song
- THEN that song is gone from the queue on every client
- AND the remaining queue is re-sorted according to queue rules

### Requirement: Host Manages Party Blacklist
The host MUST be able to add and remove words from a blacklist scoped to the current party. When a guest attempts to add a song whose title or artist contains a blacklist word as a substring, the add MUST be rejected.

#### Scenario: Blacklisted word blocks a matching song
- GIVEN the blacklist contains the word "remix"
- WHEN a guest attempts to add a song whose title is "My Song (Remix)"
- THEN the add is rejected
- AND the guest sees the message "Nicht erlaubt."

#### Scenario: Host adds a new blacklist word mid-party
- GIVEN an active party with an empty blacklist
- WHEN the host adds the word "explicit" to the blacklist
- THEN future guest adds matching "explicit" as a substring are rejected
- AND songs already in the queue are not retroactively removed

### Requirement: Host PIN Sent on All Outgoing Requests
The Angular frontend MUST include an `Authorization: Bearer <hostPin>` header on every HTTP request when a host PIN is stored in `localStorage`. If no host PIN is stored, the header MUST NOT be added.

#### Scenario: Host makes a playback control request
- GIVEN a host PIN is stored in `localStorage`
- WHEN the frontend calls `POST /api/party/{id}/track/pause`
- THEN the request includes `Authorization: Bearer <hostPin>`

#### Scenario: Guest makes a vote request
- GIVEN no host PIN is stored in `localStorage` (guest session)
- WHEN the frontend calls `POST /api/party/{id}/track/vote`
- THEN the request does NOT include an `Authorization` header

### Requirement: Host Routes Require Stored PIN
Angular routes `startpage`, `dashboard`, `voting-host`, and `search-host` MUST be protected by a route guard that verifies a host PIN exists in `localStorage`. If no PIN is found, the guard MUST redirect the user to the home page (`/`).

#### Scenario: Unauthenticated user navigates to dashboard
- GIVEN no host PIN is stored in `localStorage`
- WHEN the user navigates to `/dashboard`
- THEN the user is redirected to `/`

#### Scenario: Host navigates to dashboard with stored PIN
- GIVEN a host PIN is stored in `localStorage`
- WHEN the host navigates to `/dashboard`
- THEN the route is activated normally

### Requirement: Spotify Access Token Is Refreshed Automatically

The backend MUST automatically refresh the Spotify access token when it is about to expire or when Spotify returns HTTP 401, so that a party running longer than one hour continues to work without host intervention.

**Proactive refresh:** If the backend knows the token's expiry time and the token will expire within 60 seconds, the backend MUST refresh the token before sending the next Spotify API request.

**Reactive refresh:** If a Spotify API call returns HTTP 401, the backend MUST attempt to refresh the token once using the stored refresh token and retry the original request. The host MUST NOT be prompted to re-authenticate unless the refresh itself fails.

**Refresh failure:** If the refresh call fails (e.g. the refresh token is revoked), the backend MUST return a 401 response to the caller with the message `"Spotify-Sitzung abgelaufen. Bitte neu anmelden."`. The host must then restart the party and re-authenticate with Spotify.

#### Scenario: Token refreshed proactively before expiry

- GIVEN a party has been running for nearly 1 hour
- AND the backend knows the token expires in less than 60 seconds
- WHEN the host triggers any Spotify API call (search, play, pause, etc.)
- THEN the backend refreshes the token first
- AND the Spotify API call proceeds with the new token
- AND no error is visible to any client

#### Scenario: Token refreshed reactively on HTTP 401 from Spotify

- GIVEN a party's Spotify access token has expired
- WHEN the backend sends a Spotify API request and receives HTTP 401
- THEN the backend calls the Spotify token endpoint with the stored refresh token
- AND retries the original request with the new token
- AND the caller receives the successful response
- AND no error is visible to any client

#### Scenario: Refresh token is revoked — host must re-authenticate

- GIVEN the Spotify refresh token is invalid or revoked
- WHEN the backend attempts to refresh and the token endpoint returns an error
- THEN the backend returns HTTP 401 to the caller
- AND the response body contains `"Spotify-Sitzung abgelaufen. Bitte neu anmelden."`

### Requirement: Host-Only Actions Are Restricted
Guests MUST NOT be able to invoke pause, resume, skip, remove-from-queue, blacklist-edit, or end-party actions. Attempts by non-hosts MUST be rejected.

#### Scenario: Guest attempts to skip
- GIVEN a guest connected to a party
- WHEN the guest sends a skip request
- THEN the request is rejected as unauthorized
- AND the current playback is unaffected

### Requirement: iOS Admin View Reacts to Party-Ended SSE Event
The iOS admin view MUST maintain an SSE connection while open. When a `party-ended` event is received (e.g. party ended from the web dashboard while the iOS admin is open), the admin view MUST clear the stored session and return the host to the start screen.

#### Scenario: Party ended from web while iOS admin is open
- GIVEN the host has the iOS admin view open
- AND the party is ended from the web dashboard
- WHEN the `party-ended` SSE event is received by the iOS app
- THEN the stored session is cleared from UserDefaults
- AND the app returns to the start screen

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
