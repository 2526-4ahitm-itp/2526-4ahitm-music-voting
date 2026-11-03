# Spec Delta: guest

## MODIFIED Requirements

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

## ADDED Requirements

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
- After a successful add, a short confirmation MUST appear above the bottom tab bar for about 4 seconds, in addition to the checkmark on the result. It MUST say where the song now ranks among the waiting songs, "Song hinzugefügt – Platz <N>", and offer the action "Zum Voten", which opens the voting view. If the rank cannot be determined, it says "Song hinzugefügt".
- Errors returned by the backend (for example "Song ist schon in der Warteschlange.", "Zu viele Anfragen — bitte kurz warten.") MUST be shown in the same confirmation area, in a colour with at least 4.5:1 contrast to its background.
- A blocked search result keeps the behaviour of `search/spec.md` (greyed out, no visible text). Its disabled "+" MUST have the `aria-label` and tooltip "Nicht verfügbar", without revealing the reason.
- Status messages MUST be announced to screen readers (see `web-ui/spec.md`).

#### Scenario: Search without results
- GIVEN a guest is on the add/search view
- WHEN the guest searches for "xyzxyzxyz" and no tracks are found
- THEN "Keine Treffer für „xyzxyzxyz“" is shown

#### Scenario: Successful add is confirmed
- GIVEN a guest sees song X in the search results
- WHEN the guest taps "+" on song X and the add succeeds
- THEN "Song hinzugefügt" appears above the tab bar
- AND song X's "+" turns into a checkmark

#### Scenario: Blocked result explains itself without a reason
- GIVEN song X is blocked by the party blacklist
- WHEN a guest focuses or hovers the disabled "+" of song X in the search results
- THEN "Nicht verfügbar" is announced or shown as a tooltip
- AND no blacklist entry or reason is revealed

#### Scenario: Network error while searching
- GIVEN the backend is unreachable
- WHEN the guest searches
- THEN "Verbindung verloren – versuch es gleich nochmal." is shown

### Requirement: Guest Voting View Shows What Plays and the Ranking
The web voting view MUST make visible that the room decides the order:
- The currently playing song MUST be shown in a compact bar at the top of the view (cover, title, artist, a "Läuft gerade" indicator), not as an entry inside the list.
- Every waiting song MUST show its rank as a number, counted from 1 in the order of the queue (see `queue/spec.md`), so a guest sees which song plays next.
- After the guest likes a song, its row MUST be highlighted for about 2 seconds, so the guest can follow it to its new position. Under reduced motion the highlight appears without animation.
- Filtering the list with the search field MUST NOT change the rank numbers.

#### Scenario: Guest sees the playing song and the ranks
- GIVEN song A is playing and songs B (3 likes) and C (1 like) are waiting
- WHEN a guest opens the voting view
- THEN A is shown in the bar at the top with "Läuft gerade"
- AND B is shown with rank 1 and C with rank 2

#### Scenario: Liked song is highlighted
- GIVEN a guest is on the voting view
- WHEN the guest likes song C
- THEN the row of C is highlighted for about 2 seconds

#### Scenario: Filter keeps the ranks
- GIVEN B has rank 1 and C has rank 2
- WHEN the guest filters the list for C
- THEN only C is shown, still with rank 2

#### Scenario: Add confirmation names the rank
- GIVEN three songs are waiting
- WHEN a guest adds a new song that ends up fourth
- THEN "Song hinzugefügt – Platz 4" is shown with the action "Zum Voten"

### Requirement: Guest Sees a Clear End of the Party
When the `party-ended` event arrives in the web guest views, the app MUST show a dedicated screen with "Die Party ist beendet." and "Danke fürs Mitfeiern!" and a button "Zur Startseite", instead of redirecting silently. This refines "Party-Ended Redirect for Guests": the session is still cleared and no further API calls are made.

#### Scenario: Host ends the party while a guest is voting
- GIVEN a guest is on the voting view
- WHEN the `party-ended` event arrives
- THEN the screen "Die Party ist beendet." with "Danke fürs Mitfeiern!" is shown
- AND tapping "Zur Startseite" navigates to `/`
- AND no further queue or vote requests are sent
