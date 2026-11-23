# Host Specification

## Purpose

Defines the host role: the party creator who has exclusive permission to control playback, curate the queue manually, and manage a party-scoped blacklist. Host controls run on the host's own device (typically a phone); the dashboard never exposes host controls.

## Requirements

### Requirement: Play Controls Locked Without Active Playback Device
The web host-dashboard and the iOS admin dashboard MUST disable Play/Pause/Skip controls while `deviceActive` (from `GET /party/{id}/track/current`) is `false`, and MUST show a short hint explaining that the dashboard/startpage needs to be opened first. Controls MUST become interactive again as soon as `deviceActive` becomes `true`, without requiring a page reload or app restart.

#### Scenario: Host opens dashboard before startpage
- GIVEN the host opens the web host-dashboard before any startpage/TV has registered a playback device
- WHEN the dashboard loads
- THEN Play/Pause/Skip are shown disabled
- AND a hint is shown explaining that the player needs to be opened

#### Scenario: Controls unlock once device registers
- GIVEN the host-dashboard shows Play/Pause/Skip disabled because no device is active
- WHEN the TV/startpage opens and registers a Spotify Web Playback SDK device
- THEN the host-dashboard's Play/Pause/Skip controls become enabled without a reload

#### Scenario: iOS admin view reflects the same lock
- GIVEN a Spotify party with no active playback device
- WHEN the host opens the iOS admin dashboard
- THEN Play/Pause/Skip are shown disabled with the same hint as the web dashboard

### Requirement: Create Party Back Navigation Returns to Host Options
The back arrow on the "Create party" page MUST navigate to the "Host options" page (`/host-options`), the page from which "Create party" is reached, rather than skipping back to the home page.

#### Scenario: Host navigates back from Create party
- GIVEN the host navigated Home → Host options → Create party
- WHEN the host taps the back arrow on the "Create party" page
- THEN the host is taken to the "Host options" page
- AND not directly to the home page

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

In all web host and TV views, the two codes MUST be named consistently and shown with different icons:
- The party PIN that guests use MUST be labelled "Voting-PIN".
- The host PIN MUST be labelled "Gastgeber-PIN" and carry the hint "Nicht weitergeben – damit öffnest du Dashboard und Player auf einem anderen Gerät."

The term "Host-PIN" MUST NOT appear in the web UI. The two codes MUST NOT share the same icon.

On the host dashboard the Gastgeber-PIN MUST be hidden by default and shown as "•••••", placed below the party actions. A button "Anzeigen" reveals it; while it is visible the button reads "Verbergen". The hint "Nicht weitergeben – damit öffnest du Dashboard und Player auf einem anderen Gerät." stays visible in both states. Every time the dashboard loads, the PIN starts hidden again.

#### Scenario: Host dashboard shows PIN and QR code
- GIVEN the host has just created a party
- WHEN the host dashboard loads
- THEN the PIN is visible as a large readable number labelled "Voting-PIN"
- AND a QR code image is displayed (loaded from `/api/party/{id}/qr`)
- AND scanning the QR code navigates to `/join/{pin}` in a guest browser

#### Scenario: Host sees the host PIN explained
- GIVEN the host is on the host dashboard
- WHEN the host looks for the host PIN
- THEN it is labelled "Gastgeber-PIN" with the hint "Nicht weitergeben – damit öffnest du Dashboard und Player auf einem anderen Gerät."
- AND it uses a different icon than the "Voting-PIN"

#### Scenario: Gastgeber-PIN is hidden until revealed
- GIVEN the host is on the host dashboard
- WHEN the dashboard loads
- THEN the Gastgeber-PIN shows "•••••" below the party actions, with the button "Anzeigen"
- WHEN the host chooses "Anzeigen"
- THEN the 5-digit Gastgeber-PIN is visible and the button reads "Verbergen"
- WHEN the host reloads the dashboard
- THEN the Gastgeber-PIN is hidden again

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

### Requirement: Host Removes Songs from Queue
The host MUST be able to remove any song from the queue, including ones not yet played. Tapping "Song entfernen" MUST first ask "„<Titel>“ aus der Warteschlange entfernen?" with the choices "Auch sperren", "Nur entfernen" and "Abbrechen". "Nur entfernen" removes the song from the queue on every client. "Abbrechen" closes the question and changes nothing. For the currently playing song, "Auch sperren" MUST NOT be offered. Only one such question is open at a time.

#### Scenario: Host removes a queued song
- GIVEN a queue with three upcoming songs
- WHEN the host taps "Song entfernen" on the second song and chooses "Nur entfernen"
- THEN that song is gone from the queue on every client
- AND the remaining queue is re-sorted according to queue rules
- AND the blacklist is unchanged

#### Scenario: Host cancels the removal
- GIVEN song X is waiting in the queue
- WHEN the host taps "Song entfernen" on song X and chooses "Abbrechen"
- THEN song X stays in the queue
- AND no request is sent to the backend

#### Scenario: Currently playing song can only be removed
- GIVEN song X is currently playing
- WHEN the host taps "Song entfernen" on song X
- THEN the question offers "Nur entfernen" and "Abbrechen"
- AND "Auch sperren" is not offered

### Requirement: Host Manages Party Blacklist
The host MUST be able to keep a blacklist scoped to the current party. A blacklist entry is one of three kinds:
- **Word**: blocks a song whose title or any artist name contains the word as a whole word, case-insensitively. Word boundaries are any characters other than letters and digits, so "live" matches "Song X (Live)" and "LIVE at Wembley" but not "Oliver" or "Delivery". A word may consist of several words ("radio edit").
- **Artist**: identified by the provider's artist ID; blocks every song the artist takes part in, including features.
- **Song**: identified by the provider's track URI; blocks exactly that track.

**Setup step.** The web host flow MUST offer a blacklist setup page directly after the default-playlist picker. On this page the host MUST be able to block words, artists and songs from **one search field** with the placeholder "Wort, Künstler oder Song", and remove entries again. There are no tabs.

Page details:
- The page MUST show the subtitle "Gesperrte Wörter, Künstler und Songs können Gäste nicht hinzufügen."
- While the field has text, the results MUST show first the row "Wort „<eingabe>“ sperren", then at most 3 matching artists, then at most 5 matching songs.
- Pressing Enter in the field MUST block the input as a word; the field is emptied afterwards.
- The artist and song search MUST start while the host types (no "Suchen" button). Emptying the field clears the results.
- If only one of the two searches fails, the results of the other MUST still be shown.
- The page MUST be skippable via "Ohne Blacklist fortfahren".
- "Weiter" continues with the current entries and MUST be disabled (greyed out) while the blacklist has no entries.
- Both "Weiter" and "Ohne Blacklist fortfahren" continue to the go-live step (see "Host Setup Ends with a Go-Live Step").

**During the party.** The host dashboard menu MUST offer the entry "Blacklist". It opens the same page with the same capabilities: the one search field for words, artists and songs, and removing entries. In this mode the page MUST show a single button "Fertig" that returns to the host dashboard instead of "Weiter" / "Ohne Blacklist fortfahren". Every change is saved immediately.

Adding the same entry twice MUST NOT create a duplicate. During the party the host can additionally block single songs from the queue via "Song entfernen" → "Auch sperren" (see "Host Blocks a Queued Song").

When a guest attempts to add a blocked song, the add MUST be rejected with "Nicht erlaubt." Blocked songs MUST NOT be added by the automatic queue refill either (see `playback/spec.md`).

#### Scenario: Blacklisted word blocks a matching song
- GIVEN the blacklist contains the word "remix"
- WHEN a guest attempts to add a song whose title is "My Song (Remix)"
- THEN the add is rejected
- AND the guest sees the message "Nicht erlaubt."

#### Scenario: Host adds a new blacklist word mid-party
- GIVEN an active party with songs in the queue
- WHEN the host opens "Blacklist" from the dashboard menu and adds the word "explicit"
- THEN future guest adds matching "explicit" as a whole word are rejected
- AND songs already in the queue are not retroactively removed

#### Scenario: Blacklisted word does not match inside another word
- GIVEN the blacklist contains the word "live"
- WHEN a guest attempts to add a song by the artist "Oliver"
- THEN the add is accepted

#### Scenario: Blacklisted artist blocks a song with that artist as a feature
- GIVEN the blacklist contains artist A
- WHEN a guest attempts to add a song by artist B featuring artist A
- THEN the add is rejected
- AND the guest sees the message "Nicht erlaubt."

#### Scenario: Blacklisted song blocks exactly that track
- GIVEN the blacklist contains song X
- WHEN a guest attempts to add song X
- THEN the add is rejected
- AND adding another song by the same artist is accepted

#### Scenario: Host configures the blacklist after picking the default playlist
- GIVEN the host has just picked a default playlist (or chose to continue without one)
- WHEN the blacklist setup page loads
- THEN the host can add the word "explicit", search for and add an artist, and search for and add a song
- AND the entries are listed on the page and can be removed again
- AND "Weiter" continues to the go-live step

#### Scenario: Host edits the full blacklist during the party
- GIVEN the party is running and the host is on the host dashboard
- WHEN the host opens the menu and chooses "Blacklist"
- THEN the blacklist page shows the current entries
- AND the host can add a word, an artist and a song, and remove entries
- AND "Fertig" returns to the host dashboard

#### Scenario: Blacklist search starts while typing
- GIVEN the host is on the blacklist page
- WHEN the host types "a" into the search field and pauses briefly
- THEN the row "Wort „a“ sperren", matching artists and matching songs are shown without pressing a button
- AND the word row comes first, then the artists, then the songs
- WHEN the host empties the search field
- THEN the results are cleared

#### Scenario: Host blocks a word from the search field
- GIVEN the host is on the blacklist page
- WHEN the host types "remix" and presses Enter
- THEN the word "remix" is added to the blacklist
- AND the search field is empty again

#### Scenario: One failed search does not hide the other results
- GIVEN the host is on the blacklist page
- WHEN the host types "abba" and the artist search fails but the song search succeeds
- THEN the matching songs are shown
- AND the row "Wort „abba“ sperren" is still available

#### Scenario: "Weiter" is disabled until something is blocked
- GIVEN the host is on the blacklist setup page and the blacklist has no entries
- THEN "Weiter" is greyed out and cannot be clicked
- WHEN the host adds the word "explicit"
- THEN "Weiter" is enabled
- WHEN the host removes the last entry again
- THEN "Weiter" is greyed out again

#### Scenario: Host skips the blacklist
- GIVEN the host is on the blacklist setup page
- WHEN the host chooses "Ohne Blacklist fortfahren"
- THEN the host continues to the go-live step
- AND the party has no word or artist entries

#### Scenario: Adding an entry twice keeps one entry
- GIVEN the blacklist already contains the word "live"
- WHEN the host adds "Live" again
- THEN the blacklist still contains exactly one entry for "live"

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

### Requirement: Host Sees Synchronized Progress Bar
The host control client MUST display a progress bar for the current song, kept in sync with the TV player. Because the host client does not run the Spotify Web Playback SDK, it MUST derive the position from `progress` SSE events (see `playback/spec.md` "Cross-Client Playback Progress Relay") rather than polling Spotify.

- On each `progress` event the host client MUST set `currentPosition` / `currentDuration` from the payload and recompute the bar.
- The progress bar MUST render **below** the playback control buttons.
- Elapsed / total time MUST display as `m:ss`, measured against the event `duration` (falling back to the queue entry's `duration_ms`).

#### Scenario: Host progress bar mirrors the player
- GIVEN the host control client and the TV player are on the same party
- WHEN the player publishes its position via the progress relay
- THEN the host client's progress bar reflects that position within ~1 s
- AND the host client makes no Spotify API call to obtain it

### Requirement: Host Play/Pause Button Reflects Playback State
The host play/pause control MUST show a Play icon (▶) when playback is stopped or paused (tapping it starts/resumes) and a Pause icon (⏸) while playback is active (tapping it pauses).

#### Scenario: Icon matches the action it triggers
- GIVEN a song is paused on the host control client
- THEN the control shows a Play (▶) icon
- WHEN the host resumes and the song is playing
- THEN the control shows a Pause (⏸) icon

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

### Requirement: iOS Host Picks a Default Playlist After Spotify Auth
After Spotify authentication succeeds on iOS, the app MUST navigate to a playlist picker before opening the admin dashboard. The picker MUST list the host's Spotify playlists (fetched from `GET /api/party/{id}/spotify/playlists`) and offer a prominent "Ohne Standard-Playlist fortfahren" skip action. Selecting a playlist MUST call `PUT /api/party/{id}/default-playlist`; skipping MUST NOT call that endpoint. Both paths MUST then navigate to the admin dashboard.

The skip action MUST remain enabled at all times — a network error loading playlists MUST NOT prevent the host from reaching the admin dashboard.

#### Scenario: Host picks a playlist
- GIVEN the host has completed Spotify auth on iOS
- WHEN the playlist picker opens and the host taps a playlist
- THEN `PUT /api/party/{id}/default-playlist` is called with the chosen playlist ID
- AND the host is navigated to the admin dashboard
- AND auto-refill for this party will draw from the chosen playlist

#### Scenario: Host skips playlist selection
- GIVEN the host has completed Spotify auth on iOS
- WHEN the host taps "Ohne Standard-Playlist fortfahren"
- THEN no default-playlist endpoint is called
- AND the host is navigated to the admin dashboard
- AND auto-refill falls back to Spotify recommendations or Top-Charts

#### Scenario: Playlist load fails — skip still works
- GIVEN the playlist picker opens but `GET /api/party/{id}/spotify/playlists` returns an error
- WHEN the error banner is shown
- THEN the skip action is still visible and tappable
- AND tapping skip navigates to the admin dashboard without calling the default-playlist endpoint

### Requirement: iOS Login Does Not Trigger Webapp Refresh
When a host authenticates via the iOS app, the backend MUST NOT emit a
`login-success` SSE event with `source=web`. Only an iOS-scoped event
(`source=ios`) MUST be emitted. This prevents the web app's SSE listener from
reinitializing its player in response to an iOS login.

#### Scenario: iOS host creates a party — webapp stays stable
- GIVEN the webapp has an active party open with its SSE stream connected
- WHEN the iOS host completes Spotify authentication for a new or existing party
- THEN the webapp does NOT receive a `login-success` event with `source=web`
- AND the webapp does NOT reinitialize or refresh its player

#### Scenario: Web login still triggers webapp initialization
- GIVEN the webapp is awaiting Spotify authentication
- WHEN the host completes Spotify authentication via the web flow
- THEN the webapp receives a `login-success` event with `source=web`
- AND the webapp initializes its player normally

### Requirement: iOS Admin Album Art Loads Reliably via a Session Cache
The iOS admin dashboard MUST load album art through `URLSession.shared` and store fetched images in a session-scoped, thread-safe in-memory cache shared by every view (queue rows and the current-song view), rather than relying on `AsyncImage` (whose private URLSession ignores `URLCache.shared` on iOS 26). Once an image for a given URL has been fetched, subsequent views displaying the same URL MUST use the cached image without re-fetching. After the queue loads, the app MUST prefetch the queue's album-art URLs to warm the cache before the rows render.

#### Scenario: Album art is fetched once and reused
- GIVEN the iOS admin dashboard shows the same album art in the queue and in the current-song view
- WHEN both views display a track whose art URL has already been fetched
- THEN the image is served from the shared session cache
- AND no additional network request is made for that URL

#### Scenario: Art is ready when rows appear
- GIVEN the queue has just loaded with album-art URLs
- WHEN the queue rows render
- THEN their album art appears without a visible late-load flicker, because the URLs were prefetched into the cache

### Requirement: iOS Admin Shows a Placeholder When Album Art Is Missing
When a track has no album-art URL, or the image fails to load, the iOS admin dashboard MUST render a neutral placeholder showing a `music.note` symbol in place of the artwork, in both the queue rows and the current-song view.

#### Scenario: Track without album art
- GIVEN a queued track whose album-art URL is empty or fails to load
- WHEN its row or the current-song view renders
- THEN a placeholder with a `music.note` symbol is shown instead of artwork

### Requirement: iOS Admin Polling Does Not Cause Redundant Re-renders
The iOS admin dashboard polls playback state on a fixed interval. Polled `@Published` state (`isPlaying`, `deviceActive`, `currentPosition`, `currentDuration`) MUST only be reassigned when the newly polled value differs from the current value, so that SwiftUI does not re-render views when nothing has changed.

#### Scenario: Poll returns unchanged state
- GIVEN the iOS admin dashboard is polling and the playback state is unchanged between two polls
- WHEN the next poll completes with the same values
- THEN the `@Published` properties are not reassigned
- AND the views are not re-rendered for that poll

### Requirement: iOS Admin Shows a Loading Indicator While the QR Code Fetches
The iOS admin dashboard MUST show a loading indicator (spinner) for the QR code from the moment the dashboard opens until `GET /api/party/{id}/qr` resolves, instead of an invisible or "unavailable" placeholder. On success the fetched QR image MUST be shown; on failure the unavailable/error state MUST be shown.

#### Scenario: QR code is still loading
- GIVEN the host opens the iOS admin dashboard for an active party
- WHEN the QR image request to `/api/party/{id}/qr` has not yet completed
- THEN a loading spinner is shown in the QR area
- AND no invisible or "unavailable" placeholder is shown in its place

#### Scenario: QR code finishes loading
- GIVEN the QR image request to `/api/party/{id}/qr` completes successfully
- WHEN the response is received
- THEN the QR code image is displayed in place of the spinner

### Requirement: Host Selects an Optional Default Playlist at Party Creation
After the host authenticates with Spotify while creating a party, the web host flow MUST present a playlist picker listing the host's own Spotify playlists, with an explicit option to continue without a default playlist. The chosen playlist (if any) MUST be stored as the party's default playlist and used to refill the queue when it would otherwise empty (see `playback/spec.md` "Empty Queue Behavior"). Selecting "no default playlist" MUST leave the party without one, in which case the empty-queue refill uses Spotify recommendations instead. In both cases the host MUST then continue to the blacklist setup page (see "Host Manages Party Blacklist").

#### Scenario: Host picks a default playlist
- GIVEN the host has just authenticated with Spotify while creating a party
- WHEN the playlist picker loads
- THEN the host's own Spotify playlists are listed
- AND selecting one stores it as the party's default playlist
- AND the host then continues to the blacklist setup page

#### Scenario: Host continues without a default playlist
- GIVEN the host is on the playlist picker
- WHEN the host chooses to continue without a default playlist
- THEN the party is left with no default playlist
- AND the host continues to the blacklist setup page

### Requirement: List the Host's Spotify Playlists
The backend MUST expose a host-only endpoint `GET /api/party/{id}/spotify/playlists` that returns the authenticated host's Spotify playlists (at least id and name per playlist), using the existing `playlist-read-private` authorization. Requests without a valid host authorization MUST be rejected.

#### Scenario: Authorized host lists playlists
- GIVEN the host is authenticated for the party
- WHEN the host requests `GET /api/party/{id}/spotify/playlists`
- THEN the response lists the host's Spotify playlists with their ids and names

#### Scenario: Unauthorized playlist listing is rejected
- GIVEN a request without a valid host authorization for the party
- WHEN it calls `GET /api/party/{id}/spotify/playlists`
- THEN the request is rejected as not allowed

### Requirement: Set the Party Default Playlist
The backend MUST expose a host-only endpoint to set (or clear) the party's default playlist, e.g. `PUT /api/party/{id}/default-playlist` with a body identifying the chosen playlist, or clearing it. The stored value MUST persist on the party and survive a backend restart.

#### Scenario: Host sets the default playlist
- GIVEN the host is authenticated for the party
- WHEN the host sets the default playlist to a chosen playlist id
- THEN the party stores that playlist id as its default playlist
- AND a later empty-queue refill draws from that playlist

### Requirement: Host Spotify Session Survives a Backend Restart
The host's Spotify authorization MUST survive a backend restart. The party's Spotify **refresh token** MUST be persisted on the party's database row when it is obtained at OAuth and whenever Spotify rotates it. When the party is reconstructed from the database, the refresh token MUST be loaded back into its credentials, and the system MUST be able to mint a new access token from it without the host re-authenticating.

A party that has a stored refresh token (but no current access token, e.g. right after a restart) MUST be reported as logged in, and a request for the host access token MUST return a freshly refreshed, valid token.

#### Scenario: Host stays logged in across a restart
- GIVEN a host authenticated a party with Spotify
- AND the backend restarts (losing in-memory state)
- WHEN the party is reconstructed from the database
- THEN its Spotify refresh token is restored from the database row
- AND the host is reported as logged in without re-authenticating

#### Scenario: Access token is re-minted after a restart
- GIVEN a reconstructed party that has a refresh token but no current access token
- WHEN the host's access token is requested
- THEN a new access token is obtained from the refresh token
- AND the request returns a valid access token

#### Scenario: Refresh token persists across rotation
- GIVEN a party whose access token is refreshed
- AND Spotify returns a new refresh token during the refresh
- THEN the new refresh token is persisted on the party row

### Requirement: Host Blocks a Queued Song
The web host dashboard MUST NOT show a separate "Song sperren" button. The host blocks a waiting song through the removal question (see "Host Removes Songs from Queue"): choosing "Auch sperren" MUST add that track to the party blacklist as a song entry and MUST remove it from the queue on every client. The currently playing song cannot be blocked.

#### Scenario: Host blocks a waiting song
- GIVEN song X is waiting in the queue
- WHEN the host taps "Song entfernen" on song X and chooses "Auch sperren"
- THEN song X disappears from the queue on every client
- AND a later attempt by a guest to add song X is rejected with "Nicht erlaubt."

#### Scenario: Currently playing song has no block button
- GIVEN song X is currently playing
- WHEN the host views the queue on the host dashboard
- THEN song X shows no "Song sperren" button
- AND its removal question does not offer "Auch sperren"

#### Scenario: Host cancels the confirmation
- GIVEN song X is waiting in the queue
- WHEN the host taps "Song entfernen" on song X and chooses "Abbrechen"
- THEN song X stays in the queue
- AND the blacklist is unchanged

#### Scenario: Queue rows have no separate block button
- GIVEN song X is waiting in the queue
- WHEN the host views the queue on the host dashboard
- THEN song X shows a "Song entfernen" button
- AND no "Song sperren" button

### Requirement: Blacklist Is Visible Only to the Host
Reading the blacklist, editing it and searching for artists to block MUST require the host credential. Requests without it MUST be rejected as unauthorized. Guests MUST NOT be shown the blacklist entries or the reason why a song is blocked. The only exception: when a guest searches for a banned artist by name, the guest search MAY say "Dieser Artist ist nicht zulässig." (see `search/spec.md`).

#### Scenario: Guest requests the blacklist
- GIVEN a party with blacklist entries
- WHEN a request without the host PIN asks for the party's blacklist
- THEN the request is rejected as unauthorized
- AND no blacklist entries are returned

#### Scenario: Guest attempts to add a blacklist entry
- GIVEN a guest connected to a party
- WHEN the guest sends a request to add a blacklist word
- THEN the request is rejected as unauthorized
- AND the blacklist is unchanged

#### Scenario: Guest search hint does not list other entries
- GIVEN the blacklist contains artist A, artist B and the word "live"
- WHEN a guest searches for "A"
- THEN the guest is told "Dieser Artist ist nicht zulässig."
- AND artist B and the word "live" are not revealed

### Requirement: Blacklist Is Removed When the Party Ends
When a party ends (by the host or by automatic expiry), all of its blacklist entries MUST be deleted. A blacklist MUST NOT carry over to another party.

#### Scenario: Party ends
- GIVEN a party with blacklist entries
- WHEN the party ends
- THEN no blacklist entries remain stored for that party

#### Scenario: New party starts with an empty blacklist
- GIVEN the host ended a party whose blacklist contained the word "live"
- WHEN the host creates a new party
- THEN the new party's blacklist is empty

### Requirement: Host Navigation Adapts to Screen Width
From 1024 px viewport width the web host pages (dashboard, voting, search, blacklist during the party) MUST show the host navigation as a permanently visible side rail with icon and text per entry; below that width it MUST stay a burger menu. Both contain the same entries and mark the current page.

#### Scenario: Host on a laptop sees the navigation rail
- GIVEN the host opens the dashboard in a window at least 1024 px wide
- THEN the entries "Dashboard", "Voting", "Suchen" and "Blacklist" are visible at the left edge without opening a menu
- AND "Dashboard" is marked as the current page

#### Scenario: Host on a phone uses the burger menu
- GIVEN the host opens the dashboard in a window narrower than 1024 px
- THEN only the burger button is visible
- WHEN the host taps it
- THEN the same entries slide in

### Requirement: Host Setup Ends with a Go-Live Step
After the blacklist setup page, the web host flow MUST end with the step "Deine Party ist bereit", which MUST:
- explain in one sentence that the player plays the music and belongs on the device at the TV,
- offer "Player auf dem TV öffnen", opening `/startpage` for the party in a new window,
- show the "Voting-PIN" so the host can share it,
- offer "Zum Dashboard", which navigates to the host dashboard,
- show "Party ist live 🎉" once a player has registered as the playback device.

#### Scenario: Host finishes setup on the same device
- GIVEN the host has completed the blacklist setup page
- WHEN the go-live step loads
- THEN "Deine Party ist bereit", the explanation, the button "Player auf dem TV öffnen", the separate-device instructions and the "Voting-PIN" are shown
- WHEN the host opens the player and it registers as the playback device
- THEN "Party ist live 🎉" is shown
- AND "Zum Dashboard" navigates to the host dashboard

### Requirement: Go-Live Step Explains a Separate TV Device
The go-live step MUST explain how to open the player on a separate device: "Anderes Gerät am TV? Öffne dort MusicVoting → Gastgeber → Gastgeber-PIN eingeben → Player öffnen." The player route requires the host PIN, so a copied link alone would not work on another device.

#### Scenario: Host opens the player on a separate device
- GIVEN the host is on the go-live step
- THEN the instructions "Anderes Gerät am TV? Öffne dort MusicVoting → Gastgeber → Gastgeber-PIN eingeben → Player öffnen." are shown
- WHEN the host follows them on another device and that player registers
- THEN the go-live step shows "Party ist live 🎉"

### Requirement: Only Supported Providers Are Selectable
The "Party erstellen" page MUST offer only music providers that the web host flow fully supports as selectable options. Spotify MUST be selectable, together with the note "Du brauchst Spotify Premium." YouTube MUST be shown as a disabled option labelled "YouTube (bald verfügbar)" that cannot be selected. "Amazon Music" MUST NOT be shown.

#### Scenario: Only Spotify can be chosen
- GIVEN the host opens "Party erstellen"
- WHEN the host looks at the provider choice
- THEN Spotify is selectable with the note "Du brauchst Spotify Premium."
- AND "YouTube (bald verfügbar)" is shown but disabled
- AND "Amazon Music" is not shown

### Requirement: Spotify Player Endpoints Require the Host PIN
The endpoints only the TV player needs MUST require the host PIN like every host-only endpoint: `GET /api/party/{id}/spotify/token` (the host's Spotify access token), `GET /api/party/{id}/spotify/deviceId` and `PUT /api/party/{id}/spotify/deviceId` (the playback device). Without an `Authorization` header the server MUST answer 401, with a wrong host PIN 403. A guest MUST NOT be able to obtain the host's provider token or change the playback device.

#### Scenario: Guest requests the host's Spotify token
- **GIVEN** an active party
- **WHEN** `GET /api/party/{id}/spotify/token` is called without an `Authorization` header
- **THEN** HTTP 401 is returned
- **AND** no token is included in the response

#### Scenario: Guest tries to change the playback device
- **GIVEN** an active party whose TV player is the playback device
- **WHEN** `PUT /api/party/{id}/spotify/deviceId` is called with a wrong host PIN
- **THEN** HTTP 403 is returned
- **AND** the playback device stays unchanged

#### Scenario: TV player works with the host PIN
- **GIVEN** the TV player runs on a device where the host PIN is stored
- **WHEN** it requests the token and registers its device id with `Authorization: Bearer <hostPin>`
- **THEN** both requests succeed as before
