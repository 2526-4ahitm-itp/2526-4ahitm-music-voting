# Spec Delta: host

## ADDED Requirements

### Requirement: Host Manages Party Blocklist
The host MUST be able to keep a blocklist scoped to the current party. A blocklist entry is one of three kinds:
- **Word**: blocks a song whose title or any artist name contains the word as a whole word, case-insensitively. Word boundaries are any characters other than letters and digits, so "live" matches "Song X (Live)" and "LIVE at Wembley" but not "Oliver" or "Delivery". A word may consist of several words ("radio edit").
- **Artist**: identified by the provider's artist ID; blocks every song the artist takes part in, including features.
- **Song**: identified by the provider's track URI; blocks exactly that track.

**Setup step.** The web host flow MUST offer a blocklist setup page directly after the default-playlist picker. On this page the host MUST be able to block words, artists and songs from **one search field** with the placeholder "Wort, Künstler oder Song", and remove entries again. There are no tabs.

Page details:
- The page MUST show the subtitle "Gesperrte Wörter, Künstler und Songs können Gäste nicht hinzufügen."
- While the field has text, the results MUST show first the row "Wort „<eingabe>“ sperren", then at most 3 matching artists, then at most 5 matching songs.
- Pressing Enter in the field MUST block the input as a word; the field is emptied afterwards.
- The artist and song search MUST start while the host types (no "Suchen" button). Emptying the field clears the results.
- If only one of the two searches fails, the results of the other MUST still be shown.
- The page MUST be skippable via "Ohne Blocklist fortfahren".
- "Weiter" continues with the current entries and MUST be disabled (greyed out) while the blocklist has no entries.
- Both "Weiter" and "Ohne Blocklist fortfahren" continue to the go-live step (see "Host Setup Ends with a Go-Live Step").

**During the party.** The host dashboard menu MUST offer the entry "Blocklist". It opens the same page with the same capabilities: the one search field for words, artists and songs, and removing entries. In this mode the page MUST show a single button "Fertig" that returns to the host dashboard instead of "Weiter" / "Ohne Blocklist fortfahren". Every change is saved immediately.

Adding the same entry twice MUST NOT create a duplicate. During the party the host can additionally block single songs from the queue via "Song entfernen" → "Entfernen und sperren" (see "Host Blocks a Queued Song").

When a guest attempts to add a blocked song, the add MUST be rejected with "Nicht erlaubt." Blocked songs MUST NOT be added by the automatic queue refill either (see `playback/spec.md`).

#### Scenario: Blocklisted word blocks a matching song
- GIVEN the blocklist contains the word "remix"
- WHEN a guest attempts to add a song whose title is "My Song (Remix)"
- THEN the add is rejected
- AND the guest sees the message "Nicht erlaubt."

#### Scenario: Host adds a new blocklist word mid-party
- GIVEN an active party with songs in the queue
- WHEN the host opens "Blocklist" from the dashboard menu and adds the word "explicit"
- THEN future guest adds matching "explicit" as a whole word are rejected
- AND songs already in the queue are not retroactively removed

#### Scenario: Blocklisted word does not match inside another word
- GIVEN the blocklist contains the word "live"
- WHEN a guest attempts to add a song by the artist "Oliver"
- THEN the add is accepted

#### Scenario: Blocklisted artist blocks a song with that artist as a feature
- GIVEN the blocklist contains artist A
- WHEN a guest attempts to add a song by artist B featuring artist A
- THEN the add is rejected
- AND the guest sees the message "Nicht erlaubt."

#### Scenario: Blocklisted song blocks exactly that track
- GIVEN the blocklist contains song X
- WHEN a guest attempts to add song X
- THEN the add is rejected
- AND adding another song by the same artist is accepted

#### Scenario: Host configures the blocklist after picking the default playlist
- GIVEN the host has just picked a default playlist (or chose to continue without one)
- WHEN the blocklist setup page loads
- THEN the host can add the word "explicit", search for and add an artist, and search for and add a song
- AND the entries are listed on the page and can be removed again
- AND "Weiter" continues to the go-live step

#### Scenario: Host edits the full blocklist during the party
- GIVEN the party is running and the host is on the host dashboard
- WHEN the host opens the menu and chooses "Blocklist"
- THEN the blocklist page shows the current entries
- AND the host can add a word, an artist and a song, and remove entries
- AND "Fertig" returns to the host dashboard

#### Scenario: Blocklist search starts while typing
- GIVEN the host is on the blocklist page
- WHEN the host types "a" into the search field and pauses briefly
- THEN the row "Wort „a“ sperren", matching artists and matching songs are shown without pressing a button
- AND the word row comes first, then the artists, then the songs
- WHEN the host empties the search field
- THEN the results are cleared

#### Scenario: Host blocks a word from the search field
- GIVEN the host is on the blocklist page
- WHEN the host types "remix" and presses Enter
- THEN the word "remix" is added to the blocklist
- AND the search field is empty again

#### Scenario: One failed search does not hide the other results
- GIVEN the host is on the blocklist page
- WHEN the host types "abba" and the artist search fails but the song search succeeds
- THEN the matching songs are shown
- AND the row "Wort „abba“ sperren" is still available

#### Scenario: "Weiter" is disabled until something is blocked
- GIVEN the host is on the blocklist setup page and the blocklist has no entries
- THEN "Weiter" is greyed out and cannot be clicked
- WHEN the host adds the word "explicit"
- THEN "Weiter" is enabled
- WHEN the host removes the last entry again
- THEN "Weiter" is greyed out again

#### Scenario: Host skips the blocklist
- GIVEN the host is on the blocklist setup page
- WHEN the host chooses "Ohne Blocklist fortfahren"
- THEN the host continues to the go-live step
- AND the party has no word or artist entries

#### Scenario: Adding an entry twice keeps one entry
- GIVEN the blocklist already contains the word "live"
- WHEN the host adds "Live" again
- THEN the blocklist still contains exactly one entry for "live"

### Requirement: Blocklist Is Visible Only to the Host
Reading the blocklist, editing it and searching for artists to block MUST require the host credential. Requests without it MUST be rejected as unauthorized. Guests MUST NOT be shown the blocklist entries or the reason why a song is blocked. The only exception: when a guest searches for a banned artist by name, the guest search MAY say "Dieser Artist ist vom Gastgeber gesperrt." (see `search/spec.md`).

#### Scenario: Guest requests the blocklist
- GIVEN a party with blocklist entries
- WHEN a request without the host PIN asks for the party's blocklist
- THEN the request is rejected as unauthorized
- AND no blocklist entries are returned

#### Scenario: Guest attempts to add a blocklist entry
- GIVEN a guest connected to a party
- WHEN the guest sends a request to add a blocklist word
- THEN the request is rejected as unauthorized
- AND the blocklist is unchanged

#### Scenario: Guest search hint does not list other entries
- GIVEN the blocklist contains artist A, artist B and the word "live"
- WHEN a guest searches for "A"
- THEN the guest is told "Dieser Artist ist vom Gastgeber gesperrt."
- AND artist B and the word "live" are not revealed

### Requirement: Blocklist Is Removed When the Party Ends
When a party ends (by the host or by automatic expiry), all of its blocklist entries MUST be deleted. A blocklist MUST NOT carry over to another party.

#### Scenario: Party ends
- GIVEN a party with blocklist entries
- WHEN the party ends
- THEN no blocklist entries remain stored for that party

#### Scenario: New party starts with an empty blocklist
- GIVEN the host ended a party whose blocklist contained the word "live"
- WHEN the host creates a new party
- THEN the new party's blocklist is empty

### Requirement: Old Blocklist Setup Link Still Works
The blocklist setup page MUST be served at `/select-blocklist`. The former path `/select-blacklist` MUST redirect to `/select-blocklist`, so bookmarks and open tabs from before the rename keep working. The redirect MUST NOT bypass the host check of the target page.

#### Scenario: Host opens the old setup link
- GIVEN a host with a stored host PIN opens `/select-blacklist`
- WHEN the route loads
- THEN the app redirects to `/select-blocklist` and shows the blocklist setup page

#### Scenario: Old link without host PIN
- GIVEN no host PIN is stored in the browser
- WHEN someone opens `/select-blacklist`
- THEN the app redirects to `/select-blocklist`, whose host check applies as usual

## MODIFIED Requirements

### Requirement: Host Removes Songs from Queue
The host MUST be able to remove any song from the queue, including ones not yet played. Tapping "Song entfernen" MUST first ask "„<Titel>“ aus der Warteschlange entfernen?" with the choices "Entfernen und sperren", "Nur entfernen" and "Abbrechen". "Nur entfernen" removes the song from the queue on every client. "Abbrechen" closes the question and changes nothing. For the currently playing song, "Entfernen und sperren" MUST NOT be offered. Only one such question is open at a time.

#### Scenario: Host removes a queued song
- GIVEN a queue with three upcoming songs
- WHEN the host taps "Song entfernen" on the second song and chooses "Nur entfernen"
- THEN that song is gone from the queue on every client
- AND the remaining queue is re-sorted according to queue rules
- AND the blocklist is unchanged

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

### Requirement: Host-Only Actions Are Restricted
Guests MUST NOT be able to invoke pause, resume, skip, remove-from-queue, blocklist-edit, or end-party actions. Attempts by non-hosts MUST be rejected.

#### Scenario: Guest attempts to skip
- GIVEN a guest connected to a party
- WHEN the guest sends a skip request
- THEN the request is rejected as unauthorized
- AND the current playback is unaffected

### Requirement: Host Selects an Optional Default Playlist at Party Creation
After the host authenticates with Spotify while creating a party, the web host flow MUST present a playlist picker listing the host's own Spotify playlists, with an explicit option to continue without a default playlist. The chosen playlist (if any) MUST be stored as the party's default playlist and used to refill the queue when it would otherwise empty (see `playback/spec.md` "Empty Queue Behavior"). Selecting "no default playlist" MUST leave the party without one, in which case the empty-queue refill uses Spotify recommendations instead. In both cases the host MUST then continue to the blocklist setup page (see "Host Manages Party Blocklist").

#### Scenario: Host picks a default playlist
- GIVEN the host has just authenticated with Spotify while creating a party
- WHEN the playlist picker loads
- THEN the host's own Spotify playlists are listed
- AND selecting one stores it as the party's default playlist
- AND the host then continues to the blocklist setup page

#### Scenario: Host continues without a default playlist
- GIVEN the host is on the playlist picker
- WHEN the host chooses to continue without a default playlist
- THEN the party is left with no default playlist
- AND the host continues to the blocklist setup page

### Requirement: Host Blocks a Queued Song
The web host dashboard MUST NOT show a separate "Song sperren" button. The host blocks a waiting song through the removal question (see "Host Removes Songs from Queue"): choosing "Entfernen und sperren" MUST add that track to the party blocklist as a song entry and MUST remove it from the queue on every client. The currently playing song cannot be blocked.

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
- AND the blocklist is unchanged

#### Scenario: Queue rows have no separate block button
- GIVEN song X is waiting in the queue
- WHEN the host views the queue on the host dashboard
- THEN song X shows a "Song entfernen" button
- AND no "Song sperren" button

### Requirement: Host Navigation Adapts to Screen Width
From 1024 px viewport width the web host pages (dashboard, blocklist during the party) MUST show the host navigation as a permanently visible side rail with icon and text per entry; below that width it MUST stay a burger menu. Both contain the same entries, "Dashboard" and "Blocklist", and mark the current page. The rail and the slide-in menu MUST show the MusicVoting logo instead of the text "MusicVoting" and a badge "Party läuft · <Voting-PIN>".

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

### Requirement: Host Setup Ends with a Go-Live Step
After the blocklist setup page, the web host flow MUST end with the step "Deine Party ist bereit", which MUST:
- explain in one sentence that the player plays the music and belongs on the device at the TV,
- offer "Player auf diesem Gerät öffnen", opening `/startpage` for the party in a new window, and below it the instructions "Player auf anderem Gerät öffnen" (see "Go-Live Step Explains a Separate TV Device"),
- show the "Voting-PIN" so the host can share it,
- offer "Zum Dashboard", which navigates to the host dashboard,
- show "Party ist live 🎉" once a player has registered as the playback device.

#### Scenario: Host finishes setup on the same device
- GIVEN the host has completed the blocklist setup page
- WHEN the go-live step loads
- THEN "Deine Party ist bereit", the explanation, the button "Player auf diesem Gerät öffnen", the separate-device instructions and the "Voting-PIN" are shown
- WHEN the host opens the player and it registers as the playback device
- THEN "Party ist live 🎉" is shown
- AND "Zum Dashboard" navigates to the host dashboard

### Requirement: Host Search Results Show What Each Song Offers
In the host dashboard search, a result already in the queue MUST show its like count and like button instead of "+"; any other result shows "+". A blocked result stays visible, greyed out, with a disabled "+" and the text "Nicht erlaubt.", so the host knows why.

#### Scenario: Queued song in the host results
- GIVEN song X is in the queue with 2 likes
- WHEN the host searches and song X appears in the results
- THEN song X shows "2" and a like button instead of "+"

#### Scenario: Blocked song in the host results
- GIVEN the blocklist contains the word "live"
- WHEN the host searches and "Song X (Live)" appears
- THEN it is greyed out with a disabled "+" and the text "Nicht erlaubt."

## REMOVED Requirements

### Requirement: Host Manages Party Blacklist
**Reason**: Renamed: "Blacklist" is now called "Blocklist" everywhere (team decision 2026-11-23).
**Migration**: Replaced by "Host Manages Party Blocklist" with the same behaviour.

### Requirement: Blacklist Is Visible Only to the Host
**Reason**: Renamed: "Blacklist" is now called "Blocklist" everywhere (team decision 2026-11-23).
**Migration**: Replaced by "Blocklist Is Visible Only to the Host" with the same behaviour.

### Requirement: Blacklist Is Removed When the Party Ends
**Reason**: Renamed: "Blacklist" is now called "Blocklist" everywhere (team decision 2026-11-23).
**Migration**: Replaced by "Blocklist Is Removed When the Party Ends" with the same behaviour.
