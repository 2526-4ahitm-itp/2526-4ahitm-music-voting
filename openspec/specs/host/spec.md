# Host Specification

## Purpose

Defines the host role: the party creator who has exclusive permission to control playback, curate the queue manually, and manage a party-scoped blacklist. Host controls run on the host's own device (typically a phone); the dashboard never exposes host controls.

## Requirements

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

### Requirement: Host-Only Actions Are Restricted
Guests MUST NOT be able to invoke pause, resume, skip, remove-from-queue, blacklist-edit, or end-party actions. Attempts by non-hosts MUST be rejected.

#### Scenario: Guest attempts to skip
- GIVEN a guest connected to a party
- WHEN the guest sends a skip request
- THEN the request is rejected as unauthorized
- AND the current playback is unaffected
