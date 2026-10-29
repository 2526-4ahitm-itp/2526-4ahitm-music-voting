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
When a connected guest receives a `party-ended` SSE event, the guest view MUST immediately show "Die Party ist beendet." and MUST stop attempting any further API calls for that party. On all platforms (web and iOS), the stored session MUST be cleared and the user MUST be returned to the start screen.

#### Scenario: Host ends the party while web guests are connected
- GIVEN one or more guests are in the web guest view
- WHEN the host ends the party and the `party-ended` event is broadcast
- THEN every web guest view displays "Die Party ist beendet."
- AND no further queue or vote requests are sent to the backend

#### Scenario: Host ends the party while iOS guests are connected
- GIVEN one or more guests have the iOS app open in the guest view
- WHEN the host ends the party (from web or iOS) and the `party-ended` SSE event is received
- THEN the iOS guest view shows "Die Party ist beendet."
- AND the stored session is cleared from UserDefaults
- AND the app returns to the start screen
- AND no further API calls for that party are made

### Requirement: Guest Session Persists Across Reloads
A guest's anonymous identity MUST be restored across reloads of the same device when a previously stored identity exists, so that the guest's existing likes and adds remain attributed to them. The persistence mechanism (localStorage, cookie, or device ID) is not yet fixed — see the project's open questions.

#### Scenario: Guest reloads the page
- GIVEN a guest has added one song and liked two songs
- WHEN the guest reloads the page
- THEN the same guest identity is restored
- AND the two likes are still shown as "liked by me"

### Requirement: iOS Guest SSE Connection Is Persistent and Reconnects
The iOS guest view MUST open its SSE connection with no request timeout and MUST reconnect automatically after a brief delay if the stream drops, so that the `party-ended` event is reliably received regardless of how long the party has been running.

#### Scenario: SSE connection drops and reconnects
- GIVEN the iOS guest view is open and the SSE connection drops (timeout or network blip)
- WHEN the connection is lost
- THEN the app waits briefly and reopens the SSE connection
- AND the guest continues to receive future `party-ended` events

#### Scenario: Party ended after SSE reconnect
- GIVEN the iOS guest's SSE connection has reconnected at least once
- WHEN the host ends the party
- THEN the `party-ended` event is received
- AND the app shows "Die Party ist beendet." and returns to the start screen

### Requirement: iOS Guest Session Survives App Close
When the iOS app is fully closed and reopened, and a guest session is stored locally, the app MUST navigate directly to the guest view without prompting the guest to re-enter the party PIN.

#### Scenario: Guest reopens the iOS app after a full close
- GIVEN a guest has previously joined a party and the session (party ID, guest PIN, role) is stored in UserDefaults
- WHEN the guest fully closes the iOS app and reopens it
- THEN the app navigates directly to the guest view for the stored party
- AND the guest is NOT shown the start screen or the PIN entry screen

#### Scenario: Explicit guest exit clears the saved session
- GIVEN a guest is in the guest view and taps the exit button and confirms
- WHEN the exit is confirmed
- THEN the stored session credentials are cleared from UserDefaults
- AND the next app launch shows the start screen instead of auto-restoring the guest view

### Requirement: Guest Bottom Tab Navigation
The web guest experience MUST present a persistent bottom tab bar on both guest views — the voting view (`/voting`) and the add/search view (`/guest`). The tab bar MUST contain exactly two tabs: "Voten" navigating to `/voting`, and "Hinzufügen" navigating to `/guest`. The tab corresponding to the currently displayed view MUST be marked active. No burger button or slide-in side menu is used for navigation between guest views. The tab bar MUST NOT permanently cover content: the scrolling list on both views MUST reserve enough space at its end (including the device's bottom safe area) that the last card and its button can be scrolled fully above the tab bar. Both views MUST size to the dynamic viewport height (`100dvh`) so the mobile browser's address bar does not shift the layout.

#### Scenario: Guest switches from voting to adding songs
- GIVEN a guest is on the voting view (`/voting`) with the "Voten" tab active
- WHEN the guest taps the "Hinzufügen" tab
- THEN the app navigates to the add/search view (`/guest`)
- AND the "Hinzufügen" tab is now marked active

#### Scenario: Guest switches from adding back to voting
- GIVEN a guest is on the add/search view (`/guest`) with the "Hinzufügen" tab active
- WHEN the guest taps the "Voten" tab
- THEN the app navigates to the voting view (`/voting`)
- AND the "Voten" tab is now marked active

#### Scenario: Last song can be liked on a phone
- GIVEN a guest on a 390×844 phone viewport views a queue whose cards fill more than the screen
- WHEN the guest scrolls the list to the end
- THEN the last card's like button is fully visible above the tab bar and can be tapped

### Requirement: Guest Lands on the Voting View After Joining
After a guest successfully enters a valid party PIN, the app MUST navigate the guest to the voting view (`/voting`) so the queue is the first thing shown. The guest can move to the add/search view via the bottom tab bar.

#### Scenario: Guest joins with a valid PIN
- GIVEN a guest enters a valid party PIN that resolves successfully
- WHEN the PIN resolution completes
- THEN the app navigates the guest to the voting view (`/voting`)
- AND the voting view's "Voten" tab is marked active

### Requirement: Guest Feedback Messages
Both web guest views MUST show the outcome of a guest's add and vote actions, and of failed searches, as a short German message in a shared feedback area that is announced to assistive technology (`aria-live="polite"`) and disappears on its own after a few seconds. Error messages MUST NOT only be logged to the console. The add endpoint's responses MUST map to these messages:
- success: the song was added (e.g. „„<Titel>“ ist in der Warteschlange.“),
- HTTP 409: „Song ist schon in der Warteschlange.“,
- HTTP 429: „Zu viele Anfragen — bitte kurz warten.“,
- any other failure: a generic retry message.

#### Scenario: Guest adds a song
- GIVEN a guest on `/guest` sees song X in the search results
- WHEN the guest taps "+" on song X and the server accepts it
- THEN the guest sees a message that song X is in the queue

#### Scenario: Duplicate add is explained
- GIVEN song X is already waiting in the queue
- WHEN a guest's add request for song X returns HTTP 409
- THEN the guest sees „Song ist schon in der Warteschlange.“

#### Scenario: Rate limit is explained
- GIVEN a guest's add request returns HTTP 429
- WHEN the response arrives
- THEN the guest sees „Zu viele Anfragen — bitte kurz warten.“

### Requirement: Readable PIN Entry Error
On the web PIN entry view (`/code`), error messages MUST be readable on the brand gradient (at least WCAG AA contrast, e.g. dark text on a white chip) and announced to assistive technology. When a complete PIN does not resolve to a party („Party nicht gefunden.“), the five digit boxes MUST be cleared and focus MUST return to the first box so the guest can type the PIN again.

#### Scenario: Wrong PIN resets the input
- GIVEN a guest types the 5-digit PIN "12345" that belongs to no party
- WHEN the PIN lookup fails
- THEN the guest sees „Party nicht gefunden.“ with readable contrast
- AND all five boxes are empty and the first box has focus

### Requirement: Accessible Guest Screens
The web app MUST declare German as its document language (`<html lang="de">`). On the guest screens (`/code`, `/voting`, `/guest`):
- every interactive control MUST be a native control (`<button>`, `<input>`) reachable by keyboard and MUST have an accessible name in German,
- the five PIN boxes MUST form a group named „Party-PIN“ and each box MUST be labelled „Ziffer N von 5“,
- search fields MUST have an accessible name independent of their placeholder,
- cover images next to a visible song title MUST be decorative (`alt=""`),
- the bottom tab of the current view MUST carry `aria-current="page"`,
- keyboard focus MUST be visible on every control.

#### Scenario: Screen reader reads German
- GIVEN a guest uses a screen reader on any page of the web app
- WHEN the page loads
- THEN the document language is German (`lang="de"`)

#### Scenario: Back control works with the keyboard
- GIVEN a guest on `/code` navigates with the Tab key
- WHEN focus reaches the back control and the guest presses Enter
- THEN the app navigates to the start page
- AND the control is announced as a button named „Zurück“

#### Scenario: PIN boxes are labelled
- GIVEN a screen reader user on `/code`
- WHEN focus moves into the third PIN box
- THEN it is announced as „Ziffer 3 von 5“ within the group „Party-PIN“

#### Scenario: Current tab is announced
- GIVEN a guest on `/voting`
- WHEN a screen reader reaches the bottom tab bar
- THEN the „Voten“ tab is announced as the current page

### Requirement: Consistent Informal Guest Copy
All guest-facing text MUST address the guest informally („du“). The guest side MUST use „Warteschlange“ for the party's song list (not „Playlist“) and „PIN“ for the 5-digit join code (not „Code“). The PIN entry view MUST tell the guest where to find the PIN (on the TV). The voting view MUST explain in one line that likes decide the order. When the queue is empty, the voting view MUST show „Warteschlange ist leer“.

#### Scenario: PIN entry explains where the PIN is
- GIVEN a guest opens `/code`
- WHEN the guest reads the instructions
- THEN the text uses „du“ and says that the PIN is shown on the TV

#### Scenario: Voting view explains likes
- GIVEN a guest opens `/voting`
- WHEN the guest reads the header
- THEN a line states that songs with more likes play earlier

#### Scenario: Empty queue
- GIVEN the party's queue is empty
- WHEN a guest opens `/voting`
- THEN the view shows „Warteschlange ist leer“

