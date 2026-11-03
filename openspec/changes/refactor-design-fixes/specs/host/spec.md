# Spec Delta: host

## MODIFIED Requirements

### Requirement: Host Sees PIN and QR Code After Creation
After a party is created, the host view MUST display the 5-digit PIN and a QR code image that guests can scan. The QR code MUST be loaded from `GET /api/party/{id}/qr`.

In all web host and TV views, the two codes MUST be named consistently and shown with different icons:
- The party PIN that guests use MUST be labelled "Voting-PIN".
- The host PIN MUST be labelled "Gastgeber-PIN" and carry the hint "Geheim – damit kommst du zurück ins Dashboard."

The term "Host-PIN" MUST NOT appear in the web UI. The two codes MUST NOT share the same icon.

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

### Requirement: Host Manages Party Blacklist
The host MUST be able to keep a blacklist scoped to the current party. A blacklist entry is one of three kinds:
- **Word**: blocks a song whose title or any artist name contains the word as a whole word, case-insensitively. Word boundaries are any characters other than letters and digits, so "live" matches "Song X (Live)" and "LIVE at Wembley" but not "Oliver" or "Delivery". A word may consist of several words ("radio edit").
- **Artist**: identified by the provider's artist ID; blocks every song the artist takes part in, including features.
- **Song**: identified by the provider's track URI; blocks exactly that track.

**Setup step.** The web host flow MUST offer a blacklist setup page directly after the default-playlist picker. On this page the host MUST be able to:
- add words,
- search for artists and add one,
- search for songs and add one,
- remove entries again.

Page details:
- The page MUST show the subtitle "Gesperrte Wörter, Künstler und Songs können Gäste nicht hinzufügen."
- The word input MUST have the placeholder "Wort".
- The artist and song search MUST start while the host types (no "Suchen" button). Emptying the field clears the results.
- The page MUST be skippable via "Ohne Blacklist fortfahren".
- "Weiter" continues with the current entries and MUST be disabled (greyed out) while the blacklist has no entries.
- Both "Weiter" and "Ohne Blacklist fortfahren" continue to the go-live step (see "Host Setup Ends with a Go-Live Step").

**During the party.** The host dashboard menu MUST offer the entry "Blacklist". It opens the same page with the same capabilities: words, artist search, song search, and removing entries. In this mode the page MUST show a single button "Fertig" that returns to the host dashboard instead of "Weiter" / "Ohne Blacklist fortfahren". Every change is saved immediately.

Adding the same entry twice MUST NOT create a duplicate. During the party the host can additionally block single songs from the queue via "Song sperren" (see "Host Blocks a Queued Song").

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
- GIVEN the host is on the blacklist page with the tab "Künstler" selected
- WHEN the host types "a" into the search field and pauses briefly
- THEN matching artists are shown without pressing a button
- WHEN the host empties the search field
- THEN the results are cleared

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

### Requirement: Host Removes Songs from Queue
The host MUST be able to remove any song from the queue, including ones not yet played. After tapping "Song entfernen", the song MUST disappear from the host's queue immediately and a notice "Song entfernt · Rückgängig" MUST be shown for 5 seconds. Tapping "Rückgängig" within that time MUST restore the song at its previous position. Because the removal is only sent to the backend when the notice expires or the host leaves the dashboard, the song never leaves the queue for other clients in this case.

#### Scenario: Host removes a queued song
- GIVEN a queue with three upcoming songs
- WHEN the host removes the second song and does not undo within 5 seconds
- THEN that song is gone from the queue on every client
- AND the remaining queue is re-sorted according to queue rules

#### Scenario: Host undoes a removal
- GIVEN the host has just removed song X and the notice "Song entfernt · Rückgängig" is visible
- WHEN the host taps "Rückgängig"
- THEN song X is shown in the host's queue again at its previous position
- AND no removal request for song X is sent to the backend

## ADDED Requirements

### Requirement: Host Setup Ends with a Go-Live Step
After the blacklist setup page, the web host flow MUST show a final step "Deine Party ist bereit". This step MUST:
- explain in one sentence that the player is the page that plays the music and belongs on the device connected to the TV,
- offer a button "Player auf dem TV öffnen" that opens `/startpage` for the party in a new window on the same device,
- explain how to open the player on a separate device: "Anderes Gerät am TV? Öffne dort MusicVoting → Gastgeber → Gastgeber-PIN eingeben → Player öffnen." The player route requires the host PIN, so a copied link alone would not work on another device,
- show the "Voting-PIN" so the host can share it,
- offer "Zum Dashboard", which navigates to the host dashboard.

Once a player has registered as the playback device, the step MUST show "Party ist live 🎉".

#### Scenario: Host finishes setup on the same device
- GIVEN the host has completed the blacklist setup page
- WHEN the go-live step loads
- THEN "Deine Party ist bereit", the explanation, the button "Player auf dem TV öffnen", the separate-device instructions and the "Voting-PIN" are shown
- WHEN the host opens the player and it registers as the playback device
- THEN "Party ist live 🎉" is shown
- AND "Zum Dashboard" navigates to the host dashboard

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
