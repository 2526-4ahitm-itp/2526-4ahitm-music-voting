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

The existing attempt to open the native app first (`musicvotingapp://join/<pin>`, then resolving in the web app after about 1.5 s if the page is still visible) stays unchanged. From the moment a PIN is present until the guest is admitted or an error is shown, including the waiting time for the app attempt, the page MUST show "Party wird gesucht …". If resolution fails, the error MUST be followed by the hint "Prüfe den Code auf dem TV-Bildschirm." and the code boxes MUST stay editable so the guest can retry without reloading. The code-input page MUST use "du" ("Gib den Code ein", not "Geben Sie …") and MUST state that the code is the 5-digit code shown on the TV.

#### Scenario: Guest joins via QR code
- GIVEN the dashboard is showing a QR code for an active party with PIN `"47291"`
- WHEN a guest scans the QR code
- THEN the browser opens `/join/47291`
- AND the app shows "Party wird gesucht …" while it waits for the native-app attempt and resolves the PIN to a party ID
- AND the guest is navigated to the guest view for that party

#### Scenario: Guest arrives with an invalid PIN
- GIVEN no active party holds PIN `"00000"`
- WHEN a guest navigates to `/join/00000`
- THEN the app displays "Party nicht gefunden." followed by "Prüfe den Code auf dem TV-Bildschirm."
- AND the guest is not admitted to any party view
- AND the guest can type a different code without reloading the page

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
The web guest experience MUST present a persistent bottom tab bar on both guest views — the voting view (`/voting`) and the add/search view (`/guest`). The tab bar MUST contain exactly two tabs: "Voten" navigating to `/voting`, and "Hinzufügen" navigating to `/guest`. The tab corresponding to the currently displayed view MUST be marked active. No burger button or slide-in side menu is used for navigation between guest views.

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

### Requirement: Guest Lands on the Voting View After Joining
After a guest successfully enters a valid party PIN, the app MUST navigate the guest to the voting view (`/voting`) so the queue is the first thing shown. The guest can move to the add/search view via the bottom tab bar.

#### Scenario: Guest joins with a valid PIN
- GIVEN a guest enters a valid party PIN that resolves successfully
- WHEN the PIN resolution completes
- THEN the app navigates the guest to the voting view (`/voting`)
- AND the voting view's "Voten" tab is marked active

### Requirement: Guest Is Welcomed After Joining
After a guest joins a party for the first time on a device, the voting view MUST show a one-time welcome sheet. It MUST contain "Du bist dabei!" and a one-line explanation "Like Songs, die du hören willst, oder füg eigene hinzu.", plus a button "Los geht's" that closes it. The sheet MUST NOT appear again for the same `deviceId` and party, including after a reload. Joining a different party shows it again.

#### Scenario: First join shows the welcome
- GIVEN a guest has never joined party P on this device
- WHEN the guest joins party P and lands on the voting view
- THEN the welcome sheet with "Du bist dabei!" is shown
- WHEN the guest taps "Los geht's"
- THEN the sheet closes

#### Scenario: Reload does not show the welcome again
- GIVEN a guest has dismissed the welcome sheet for party P
- WHEN the guest reloads the voting view
- THEN the welcome sheet is not shown

### Requirement: Guest Search and Add Give Feedback
The web add/search view MUST tell the guest what is happening at every step:
- While a search request is running, a loading indicator MUST be shown.
- A search that returns no results MUST show "Keine Treffer für „<Suchbegriff>“".
- A failed search or a failed queue load (network or server error) MUST show "Verbindung verloren – versuch es gleich nochmal." instead of leaving stale content without a message.
- Status messages MUST be announced to screen readers (see `web-ui/spec.md`).

#### Scenario: Search without results
- GIVEN a guest is on the add/search view
- WHEN the guest searches for "xyzxyzxyz" and no tracks are found
- THEN "Keine Treffer für „xyzxyzxyz“" is shown

#### Scenario: Network error while searching
- GIVEN the backend is unreachable
- WHEN the guest searches
- THEN "Verbindung verloren – versuch es gleich nochmal." is shown

### Requirement: Guest Add Is Confirmed with the Rank
After a successful add, a confirmation MUST appear above the bottom tab bar for about 4 seconds, besides the checkmark on the result. It MUST say "Song hinzugefügt – Platz <N>" (the rank among the waiting songs) and offer the action "Zum Voten", which opens the voting view; without a known rank it says "Song hinzugefügt". Backend errors (for example "Song ist schon in der Warteschlange.", "Zu viele Anfragen — bitte kurz warten.") MUST be shown in the same area, with at least 4.5:1 contrast.

#### Scenario: Successful add is confirmed
- GIVEN a guest sees song X in the search results
- WHEN the guest taps "+" on song X and the add succeeds
- THEN "Song hinzugefügt" appears above the tab bar
- AND song X's "+" turns into a checkmark

### Requirement: Blocked Search Results Stay Discreet
A blocked search result keeps the behaviour of `search/spec.md` (greyed out, no visible text). Its disabled "+" MUST have the `aria-label` and tooltip "Nicht verfügbar", without revealing the reason.

#### Scenario: Blocked result explains itself without a reason
- GIVEN song X is blocked by the party blacklist
- WHEN a guest focuses or hovers the disabled "+" of song X in the search results
- THEN "Nicht verfügbar" is announced or shown as a tooltip
- AND no blacklist entry or reason is revealed

### Requirement: Guest Voting View Shows What Plays and the Ranking
The web voting view MUST make visible that the room decides the order:
- The currently playing song MUST be shown in a compact bar at the top (cover, title, artist, a "Läuft gerade" indicator), not as an entry inside the list.
- Every waiting song MUST show its rank as a number, counted from 1 in queue order (see `queue/spec.md`).
- Filtering the list with the search field MUST NOT change the rank numbers.

#### Scenario: Guest sees the playing song and the ranks
- GIVEN song A is playing and songs B (3 likes) and C (1 like) are waiting
- WHEN a guest opens the voting view
- THEN A is shown in the bar at the top with "Läuft gerade"
- AND B is shown with rank 1 and C with rank 2

#### Scenario: Filter keeps the ranks
- GIVEN B has rank 1 and C has rank 2
- WHEN the guest filters the list for C
- THEN only C is shown, still with rank 2

#### Scenario: Add confirmation names the rank
- GIVEN three songs are waiting
- WHEN a guest adds a new song that ends up fourth
- THEN "Song hinzugefügt – Platz 4" is shown with the action "Zum Voten"

### Requirement: Liked Song Is Highlighted in the Guest List
After the guest likes a song, its row MUST be highlighted for about 2 seconds, so the guest can follow it to its new position. Under reduced motion the highlight appears without animation.

#### Scenario: Liked song is highlighted
- GIVEN a guest is on the voting view
- WHEN the guest likes song C
- THEN the row of C is highlighted for about 2 seconds

### Requirement: Guest Sees Which Party They Are In
Both guest views MUST show a plain page title in the top bar: "Warteschlange" on `/voting` and "Song suchen" on `/guest`. Directly below the title the top bar MUST show the party as "Party <Voting-PIN>" (e.g. "Party 47291") and a button "Party verlassen".

#### Scenario: Guest sees the party in the top bar
- GIVEN a guest has joined the party with Voting-PIN 47291
- WHEN the guest opens `/voting`
- THEN the top bar shows the title "Warteschlange" and below it "Party 47291" and "Party verlassen"
- WHEN the guest switches to `/guest`
- THEN the title reads "Song suchen" with the same party line

### Requirement: Guest Can Leave the Party
"Party verlassen" MUST first ask "Party wirklich verlassen?" with "Ja, verlassen" and "Abbrechen". Confirming MUST clear the stored party (party ID and PIN) but keep the persistent `deviceId`, and return to the start page `/`. "Abbrechen" or Escape closes the question and the guest stays in the party.

#### Scenario: Guest leaves the party
- GIVEN a guest is on `/voting`
- WHEN the guest chooses "Party verlassen"
- THEN the question "Party wirklich verlassen?" appears
- WHEN the guest chooses "Ja, verlassen"
- THEN the guest is on the start page and no party is stored any more
- AND the guest's `deviceId` is unchanged

#### Scenario: Guest cancels leaving
- GIVEN the question "Party wirklich verlassen?" is open
- WHEN the guest chooses "Abbrechen"
- THEN the question closes and the guest is still in the party

### Requirement: Guest Sees a Clear End of the Party
When the `party-ended` event arrives in the web guest views, the app MUST show a dedicated screen with "Die Party ist beendet." and "Danke fürs Mitfeiern!" and a button "Zur Startseite", instead of redirecting silently. This refines "Party-Ended Redirect for Guests": the session is still cleared and no further API calls are made.

#### Scenario: Host ends the party while a guest is voting
- GIVEN a guest is on the voting view
- WHEN the `party-ended` event arrives
- THEN the screen "Die Party ist beendet." with "Danke fürs Mitfeiern!" is shown
- AND tapping "Zur Startseite" navigates to `/`
- AND no further queue or vote requests are sent
