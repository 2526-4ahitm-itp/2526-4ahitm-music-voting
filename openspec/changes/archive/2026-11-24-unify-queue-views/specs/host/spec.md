# Spec Delta: host

## ADDED Requirements

### Requirement: Host Dashboard Shows the Whole Queue on Every Screen
The web host dashboard is the only host view of the queue. Every waiting song MUST show its rank, cover, title, artist, like count, like button and the "Song entfernen" button at every viewport width. On narrow screens the cover MUST get smaller rather than hiding rank or likes. There is no separate host voting page: `/voting-host` MUST redirect to `/dashboard`.

#### Scenario: Host on a phone sees ranks and likes
- GIVEN the host opens the dashboard in a 390 px wide window
- AND song B (3 likes) is ranked first
- WHEN the queue is rendered
- THEN B's row shows rank "1", the like count "3", the like button and the "Song entfernen" button

#### Scenario: Old host voting link
- GIVEN a host with a stored PIN opens `/voting-host`
- WHEN the route loads
- THEN the app redirects to `/dashboard`

### Requirement: Host Searches and Adds Songs on the Dashboard
The queue card of the web host dashboard MUST offer one search field "Song oder Künstler suchen …" that works like the guest page: while it holds text, results from the party's provider replace the queue list under the label "Suchergebnisse"; when it is empty, the queue is shown. `/search-host` MUST redirect to `/dashboard`.

#### Scenario: Host adds a song without leaving the dashboard
- GIVEN the host is on the dashboard
- WHEN the host types "Daft Punk" into the search field and taps "+" on a result
- THEN the song is added to the queue
- AND the host is still on `/dashboard`

#### Scenario: Emptying the field shows the queue again
- GIVEN the host sees search results
- WHEN the host empties the field
- THEN the queue with ranks is shown again

#### Scenario: Old host search link
- GIVEN a host with a stored PIN opens `/search-host`
- WHEN the route loads
- THEN the app redirects to `/dashboard`

### Requirement: Host Search Results Show What Each Song Offers
In the host dashboard search, a result already in the queue MUST show its like count and like button instead of "+"; any other result shows "+". A blocked result stays visible, greyed out, with a disabled "+" and the text "Nicht erlaubt.", so the host knows why.

#### Scenario: Queued song in the host results
- GIVEN song X is in the queue with 2 likes
- WHEN the host searches and song X appears in the results
- THEN song X shows "2" and a like button instead of "+"

#### Scenario: Blocked song in the host results
- GIVEN the blacklist contains the word "live"
- WHEN the host searches and "Song X (Live)" appears
- THEN it is greyed out with a disabled "+" and the text "Nicht erlaubt."

### Requirement: Host Can Like Songs
The host MUST be able to like and un-like songs on the web host dashboard, in every waiting queue row (next to "Song entfernen") and in the search results for queued songs. A host like counts exactly like a guest like: one like per device and song (see `voting/spec.md` "One Like per Guest per Song", "Likes Are Togglable"), shown optimistically. The playing song cannot be liked.

#### Scenario: Host likes a waiting song
- GIVEN song B is waiting with 2 likes and the host has not liked it
- WHEN the host taps the like button in B's queue row
- THEN B shows 3 likes with a filled heart on the dashboard and on every client

#### Scenario: Host takes the like back
- GIVEN the host has liked song B
- WHEN the host taps B's like button again
- THEN B's like count goes down by one and the heart is no longer filled

### Requirement: Search Field Has a Clear Button
The search field on the web guest page and on the host dashboard MUST show a button with the `aria-label` "Suche leeren" while it holds text. Activating it MUST empty the field in one step, close the search results, show the queue again and keep the focus in the field. While the field is empty, the button MUST NOT be shown.

#### Scenario: One tap closes the search
- GIVEN a guest sees search results for "abba"
- WHEN the guest taps "Suche leeren"
- THEN the field is empty, the queue is shown and the field has the focus

#### Scenario: No clear button on an empty field
- GIVEN the search field is empty
- THEN no "Suche leeren" button is shown

### Requirement: Dashboard Confirmations Manage Focus
When a confirmation opens on the web host dashboard, keyboard focus MUST move into it: for "Song entfernen?" to its first button ("Entfernen und sperren", or "Nur entfernen" for the playing song), for "Party wirklich beenden?" to "Abbrechen". Pressing Escape MUST close the confirmation without changes. When it closes without removing the button that opened it, focus MUST return to that button.

#### Scenario: Removal question takes the focus
- GIVEN song X is waiting in the queue
- WHEN the host activates "Song entfernen" on song X
- THEN focus is on "Entfernen und sperren"

#### Scenario: End-party question takes the focus
- GIVEN the host is on the dashboard
- WHEN the host activates "Party beenden"
- THEN focus is on "Abbrechen"

#### Scenario: Escape closes and returns focus
- GIVEN the removal question for song X is open
- WHEN the host presses Escape
- THEN the question closes, song X stays in the queue
- AND focus is back on song X's "Song entfernen" button

## MODIFIED Requirements

### Requirement: Host Removes Songs from Queue
The host MUST be able to remove any song from the queue, including ones not yet played. Tapping "Song entfernen" MUST first ask "„<Titel>“ aus der Warteschlange entfernen?" with the choices "Entfernen und sperren", "Nur entfernen" and "Abbrechen". "Nur entfernen" removes the song from the queue on every client. "Abbrechen" closes the question and changes nothing. For the currently playing song, "Entfernen und sperren" MUST NOT be offered. Only one such question is open at a time.

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
- AND "Entfernen und sperren" is not offered

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
- The page MUST be skippable via "Ohne Blocklist fortfahren".
- "Weiter" continues with the current entries and MUST be disabled (greyed out) while the blacklist has no entries.
- Both "Weiter" and "Ohne Blocklist fortfahren" continue to the go-live step (see "Host Setup Ends with a Go-Live Step").

**During the party.** The host dashboard menu MUST offer the entry "Blocklist". It opens the same page with the same capabilities: the one search field for words, artists and songs, and removing entries. In this mode the page MUST show a single button "Fertig" that returns to the host dashboard instead of "Weiter" / "Ohne Blocklist fortfahren". Every change is saved immediately.

Adding the same entry twice MUST NOT create a duplicate. During the party the host can additionally block single songs from the queue via "Song entfernen" → "Entfernen und sperren" (see "Host Blocks a Queued Song").

When a guest attempts to add a blocked song, the add MUST be rejected with "Nicht erlaubt." Blocked songs MUST NOT be added by the automatic queue refill either (see `playback/spec.md`).

#### Scenario: Blacklisted word blocks a matching song
- GIVEN the blacklist contains the word "remix"
- WHEN a guest attempts to add a song whose title is "My Song (Remix)"
- THEN the add is rejected
- AND the guest sees the message "Nicht erlaubt."

#### Scenario: Host adds a new blacklist word mid-party
- GIVEN an active party with songs in the queue
- WHEN the host opens "Blocklist" from the dashboard menu and adds the word "explicit"
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
- WHEN the host opens the menu and chooses "Blocklist"
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
- WHEN the host chooses "Ohne Blocklist fortfahren"
- THEN the host continues to the go-live step
- AND the party has no word or artist entries

#### Scenario: Adding an entry twice keeps one entry
- GIVEN the blacklist already contains the word "live"
- WHEN the host adds "Live" again
- THEN the blacklist still contains exactly one entry for "live"

### Requirement: Host Blocks a Queued Song
The web host dashboard MUST NOT show a separate "Song sperren" button. The host blocks a waiting song through the removal question (see "Host Removes Songs from Queue"): choosing "Entfernen und sperren" MUST add that track to the party blacklist as a song entry and MUST remove it from the queue on every client. The currently playing song cannot be blocked.

#### Scenario: Host blocks a waiting song
- GIVEN song X is waiting in the queue
- WHEN the host taps "Song entfernen" on song X and chooses "Entfernen und sperren"
- THEN song X disappears from the queue on every client
- AND a later attempt by a guest to add song X is rejected with "Nicht erlaubt."

#### Scenario: Currently playing song has no block button
- GIVEN song X is currently playing
- WHEN the host views the queue on the host dashboard
- THEN song X shows no "Song sperren" button
- AND its removal question does not offer "Entfernen und sperren"

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
Reading the blacklist, editing it and searching for artists to block MUST require the host credential. Requests without it MUST be rejected as unauthorized. Guests MUST NOT be shown the blacklist entries or the reason why a song is blocked. The only exception: when a guest searches for a banned artist by name, the guest search MAY say "Dieser Artist ist vom Gastgeber gesperrt." (see `search/spec.md`).

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
- THEN the guest is told "Dieser Artist ist vom Gastgeber gesperrt."
- AND artist B and the word "live" are not revealed

### Requirement: Host Setup Ends with a Go-Live Step
After the blacklist setup page, the web host flow MUST end with the step "Deine Party ist bereit", which MUST:
- explain in one sentence that the player plays the music and belongs on the device at the TV,
- offer "Player auf diesem Gerät öffnen", opening `/startpage` for the party in a new window, and below it the instructions "Player auf anderem Gerät öffnen" (see "Go-Live Step Explains a Separate TV Device"),
- show the "Voting-PIN" so the host can share it,
- offer "Zum Dashboard", which navigates to the host dashboard,
- show "Party ist live 🎉" once a player has registered as the playback device.

#### Scenario: Host finishes setup on the same device
- GIVEN the host has completed the blacklist setup page
- WHEN the go-live step loads
- THEN "Deine Party ist bereit", the explanation, the button "Player auf diesem Gerät öffnen", the separate-device instructions and the "Voting-PIN" are shown
- WHEN the host opens the player and it registers as the playback device
- THEN "Party ist live 🎉" is shown
- AND "Zum Dashboard" navigates to the host dashboard


### Requirement: Host Sees PIN and QR Code After Creation
After a party is created, the host view MUST display the 5-digit PIN and a QR code image that guests can scan. The QR code MUST be loaded from `GET /api/party/{id}/qr`.

In all web host and TV views, the two codes MUST be named consistently and shown with different icons:
- The party PIN that guests use MUST be labelled "Voting-PIN".
- The host PIN MUST be labelled "Gastgeber-PIN" and carry the hint "Geheim – damit kommst du zurück ins Dashboard."

The term "Host-PIN" MUST NOT appear in the web UI. The two codes MUST NOT share the same icon.

On the web host views (dashboard and go-live step) each label MUST carry a short tag saying who the code is for: "für Gäste" next to "Voting-PIN" and "nur für dich" next to "Gastgeber-PIN".

On the host dashboard the Gastgeber-PIN MUST be hidden by default and shown as "•••••", placed below the party actions. A button "Anzeigen" reveals it; while it is visible the button reads "Verbergen". The hint "Geheim – damit kommst du zurück ins Dashboard." stays visible in both states. Every time the dashboard loads, the PIN starts hidden again.

#### Scenario: Host dashboard shows PIN and QR code
- GIVEN the host has just created a party
- WHEN the host dashboard loads
- THEN the PIN is visible as a large readable number labelled "Voting-PIN"
- AND a QR code image is displayed (loaded from `/api/party/{id}/qr`)
- AND scanning the QR code navigates to `/join/{pin}` in a guest browser

#### Scenario: Host sees the host PIN explained
- GIVEN the host is on the host dashboard
- WHEN the host looks for the host PIN
- THEN it is labelled "Gastgeber-PIN" with the hint "Geheim – damit kommst du zurück ins Dashboard."
- AND it uses a different icon than the "Voting-PIN"

#### Scenario: Host sees who each PIN is for
- GIVEN the host is on the host dashboard or the go-live step
- WHEN the host looks at the PIN labels
- THEN "Voting-PIN" carries the tag "für Gäste"
- AND "Gastgeber-PIN", where shown, carries the tag "nur für dich"

#### Scenario: Gastgeber-PIN is hidden until revealed
- GIVEN the host is on the host dashboard
- WHEN the dashboard loads
- THEN the Gastgeber-PIN shows "•••••" below the party actions, with the button "Anzeigen"
- WHEN the host chooses "Anzeigen"
- THEN the 5-digit Gastgeber-PIN is visible and the button reads "Verbergen"
- WHEN the host reloads the dashboard
- THEN the Gastgeber-PIN is hidden again

### Requirement: Host Routes Require Stored PIN
Angular routes `startpage` and `dashboard` MUST be protected by a route guard that verifies a host PIN exists in `localStorage`. If no PIN is found, the guard MUST redirect the user to the home page (`/`). The former routes `voting-host` and `search-host` redirect to `dashboard`, so the same guard applies.

#### Scenario: Unauthenticated user navigates to dashboard
- GIVEN no host PIN is stored in `localStorage`
- WHEN the user navigates to `/dashboard`
- THEN the user is redirected to `/`

#### Scenario: Host navigates to dashboard with stored PIN
- GIVEN a host PIN is stored in `localStorage`
- WHEN the host navigates to `/dashboard`
- THEN the route is activated normally

#### Scenario: Unauthenticated user opens an old host link
- GIVEN no host PIN is stored in `localStorage`
- WHEN the user navigates to `/voting-host`
- THEN the user ends up on `/`

### Requirement: Host Navigation Adapts to Screen Width
From 1024 px viewport width the web host pages (dashboard, blacklist during the party) MUST show the host navigation as a permanently visible side rail with icon and text per entry; below that width it MUST stay a burger menu. Both contain the same entries, "Dashboard" and "Blocklist", and mark the current page. The rail and the slide-in menu MUST show the MusicVoting logo instead of the text "MusicVoting" and a badge "Party läuft · <Voting-PIN>".

#### Scenario: Host on a laptop sees the navigation rail
- GIVEN the host opens the dashboard in a window at least 1024 px wide
- THEN the entries "Dashboard" and "Blocklist" are visible at the left edge without opening a menu
- AND "Dashboard" is marked as the current page
- AND the rail shows the logo and "Party läuft · 47291" for a party with Voting-PIN 47291

#### Scenario: Host on a phone uses the burger menu
- GIVEN the host opens the dashboard in a window narrower than 1024 px
- THEN only the burger button is visible
- WHEN the host taps it
- THEN the same entries, the logo and the badge slide in

#### Scenario: Removed entries
- GIVEN the host opens the navigation
- THEN no "Voting" and no "Suchen" entry is shown

### Requirement: Go-Live Step Explains a Separate TV Device
Below the button "Player auf diesem Gerät öffnen", the go-live step and the host dashboard MUST show the heading "Player auf anderem Gerät öffnen" followed by a numbered list of five steps: "MusicVoting öffnen" (with a link to the public address https://it220241.cloud.htl-leonding.ac.at, shown as "it220241.cloud.htl-leonding.ac.at", also during local development), "Gastgeber einer Party wählen", "Player öffnen auswählen", "Gastgeber-PIN eingeben", "Player öffnen". The player route requires the host PIN, so a copied link alone would not work on another device.

#### Scenario: Host opens the player on a separate device
- GIVEN the host is on the go-live step
- THEN "Player auf anderem Gerät öffnen" is followed by an ordered list with the five steps "MusicVoting öffnen", "Gastgeber einer Party wählen", "Player öffnen auswählen", "Gastgeber-PIN eingeben" and "Player öffnen"
- AND "MusicVoting öffnen" links to https://it220241.cloud.htl-leonding.ac.at, not to "localhost"
- WHEN the host follows them on another device and that player registers
- THEN the go-live step shows "Party ist live 🎉"

#### Scenario: Dashboard shows the same instructions
- GIVEN the host is on the dashboard
- THEN the party actions offer "Player auf diesem Gerät öffnen"
- AND below it "Player auf anderem Gerät öffnen" with the same five steps

