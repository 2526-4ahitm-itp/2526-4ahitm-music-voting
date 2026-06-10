# Δ host/spec.md

## ADDED Requirements

### Requirement: iOS Host Controls Include Authorization Header
The iOS admin view MUST include an `Authorization: Bearer <hostPin>` header on every request to a host-only endpoint (play, pause, resume, skip, start, remove). If no host PIN is stored in the session, the header MUST NOT be added.

#### Scenario: iOS play request reaches the backend
- GIVEN the host has a stored host PIN and is on the iOS admin view
- WHEN the host taps the play button
- THEN the request to `POST /api/party/{id}/track/start` carries `Authorization: Bearer <hostPin>`
- AND the backend accepts the request and starts playback

#### Scenario: Missing PIN — request has no auth header
- GIVEN no host PIN is stored in the session
- WHEN a control request is built
- THEN no `Authorization` header is added to the request

### Requirement: iOS Admin View Previews First Queued Song Before Playback
Before playback has started (no current track from the backend), the iOS admin view MUST display the first song in the queue as a preview in the current-song area. The previewed song MUST be excluded from the queue list to avoid duplication.

#### Scenario: Dashboard opened before first play
- GIVEN the party has songs in the queue but no song is currently playing
- WHEN the iOS admin view loads its queue
- THEN the first queued song is shown in the current-song area
- AND that song does NOT appear again in the queue list below

#### Scenario: After playback starts the actual playing song is shown
- GIVEN the preview song is displayed
- WHEN the host taps play and a song starts
- THEN the current-song area updates to the actually playing track (from the backend)
- AND the queue reflects the remaining songs

### Requirement: iOS Host PIN Entry Uses Digit-Box Input
The iOS host PIN entry view MUST use the same five-digit-box input style as the guest code entry view: five individual rounded boxes, each showing one digit, with the keyboard cursor indicated by a highlighted active box. The view MUST auto-submit when the fifth digit is entered. On incorrect PIN the view MUST show a shake animation and haptic feedback, then clear the input for retry.

#### Scenario: Auto-submit on fifth digit
- GIVEN the host PIN entry view is open
- WHEN the host types the fifth digit of a valid PIN
- THEN the view submits automatically without requiring a separate "Weiter" button tap
- AND the host is navigated to the admin view on success

#### Scenario: Wrong PIN triggers shake and clears input
- GIVEN the host types an incorrect 5-digit PIN
- WHEN the submit is rejected by the backend
- THEN the digit boxes shake and haptic feedback fires
- AND all boxes are cleared so the host can retry

## MODIFIED Requirements

### Requirement: iOS Admin View Shows Synchronized Progress Bar
The iOS host admin view MUST display a progress bar for the current song, kept in sync with the TV player, matching the web host dashboard. Because the iOS app does not run the Spotify Web Playback SDK, it MUST derive the position from `progress` SSE events (see `playback/spec.md` "Cross-Client Playback Progress Relay") rather than polling Spotify.

- The iOS admin view MUST maintain an SSE connection that supplies the party's `partyId`, so the backend delivers party-scoped events to it.
- On each `progress` event the view MUST update `currentPosition` / `currentDuration` and the `isPlaying` state (from the `paused` field).
- When a `track-changed` SSE event is received, the view MUST immediately reset `currentPosition` and `currentDuration` to `0` and refresh the current-track state, without waiting for the poll timer.
- When `GET /track/current` returns no active track, the view MUST reset `currentPosition` and `currentDuration` to `0`.
- The bar MUST read `0:00` with no fill when no `progress` event has arrived or when no song is active.
- The hardcoded placeholder slider MUST be removed.
(Previously: `isPlaying` was not updated from progress events; position was not reset on `track-changed` or when no track was active.)

#### Scenario: iOS progress bar mirrors the player
- GIVEN the iOS host admin view and the TV player are on the same party
- WHEN the player publishes its position
- THEN the iOS admin view's progress bar reflects that position within ~1 s

#### Scenario: Progress resets immediately on track change
- GIVEN a song is playing and the progress bar is at 2:30
- WHEN the host skips to the next song
- THEN the progress bar resets to `0:00` immediately on receipt of the `track-changed` event
- AND does not briefly show `2:30` for the new song

#### Scenario: Dashboard opened with no active playback shows zero
- GIVEN no song is currently playing
- WHEN the iOS admin view loads
- THEN the progress bar shows `0:00` with no fill

### Requirement: Host Controls Playback
The host MUST be able to start, pause, resume, and skip the currently playing song from the iOS admin view. The first tap on the play button MUST call `/track/start` (starting the first song from the queue). Subsequent taps when playback is paused MUST call `/track/resume`. Tapping while playing MUST call `/track/pause`.
(Previously: the play/pause toggle used `currentSong != nil` to decide between start and resume. After the queue-preview feature set `currentSong` before playback, first-press always called resume instead of start.)

#### Scenario: First play starts the queue
- GIVEN the party has not started playing yet
- WHEN the host taps the play button for the first time
- THEN `POST /api/party/{id}/track/start` is called
- AND the first song in the queue begins playing on the TV player

#### Scenario: Pause and resume after start
- GIVEN a song is playing (party has started)
- WHEN the host taps pause
- THEN `POST /api/party/{id}/track/pause` is called
- WHEN the host taps play again
- THEN `POST /api/party/{id}/track/resume` is called
