# Spec Delta: host

## MODIFIED Requirements

### Requirement: Host Manages Party Blacklist
The host MUST be able to keep a blacklist scoped to the current party. A blacklist entry is one of three kinds:
- **Word**: blocks a song whose title or any artist name contains the word as a whole word, case-insensitively. Word boundaries are any characters other than letters and digits, so "live" matches "Song X (Live)" and "LIVE at Wembley" but not "Oliver" or "Delivery". A word may consist of several words ("radio edit").
- **Artist**: identified by the provider's artist ID; blocks every song the artist takes part in, including features.
- **Song**: identified by the provider's track URI; blocks exactly that track.

The web host flow MUST offer a blacklist setup page directly after the default-playlist picker. On this page the host MUST be able to add words, search for artists and add one, search for songs and add one, and remove entries again. The page MUST show the subtitle "Gesperrte Wörter, Künstler und Songs können Gäste nicht hinzufügen." and the word input MUST have the placeholder "Wort". The page MUST be skippable via "Ohne Blacklist fortfahren"; "Weiter" continues with the current entries and MUST be disabled (greyed out) while the blacklist has no entries. Both continue to the host dashboard. Adding the same entry twice MUST NOT create a duplicate. Words, artists and songs can only be added during this setup step; later in the party the host blocks songs via "Song sperren" (see "Host Blocks a Queued Song").

When a guest attempts to add a blocked song, the add MUST be rejected with "Nicht erlaubt." Blocked songs MUST NOT be added by the automatic queue refill either (see `playback/spec.md`).

#### Scenario: Blacklisted word blocks a matching song
- GIVEN the blacklist contains the word "remix"
- WHEN a guest attempts to add a song whose title is "My Song (Remix)"
- THEN the add is rejected
- AND the guest sees the message "Nicht erlaubt."

#### Scenario: Host adds a new blacklist word mid-party
- GIVEN an active party with an empty blacklist
- WHEN the host adds the word "explicit" on the blacklist setup page
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
- AND "Weiter" continues to the host dashboard

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
- THEN the host continues to the host dashboard
- AND the party has no word or artist entries

#### Scenario: Adding an entry twice keeps one entry
- GIVEN the blacklist already contains the word "live"
- WHEN the host adds "Live" again
- THEN the blacklist still contains exactly one entry for "live"

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

## ADDED Requirements

### Requirement: Host Blocks a Queued Song
The web host dashboard MUST show a "Song sperren" button on every waiting song in the queue, but not on the currently playing song. After the host confirms "Diesen Song für die Party sperren?", that track MUST be added to the party blacklist as a song entry and MUST be removed from the queue on every client.

#### Scenario: Host blocks a waiting song
- GIVEN song X is waiting in the queue
- WHEN the host taps "Song sperren" on song X and confirms
- THEN song X disappears from the queue on every client
- AND a later attempt by a guest to add song X is rejected with "Nicht erlaubt."

#### Scenario: Currently playing song has no block button
- GIVEN song X is currently playing
- WHEN the host views the queue on the host dashboard
- THEN song X shows no "Song sperren" button

#### Scenario: Host cancels the confirmation
- GIVEN song X is waiting in the queue
- WHEN the host taps "Song sperren" on song X and cancels the confirmation
- THEN song X stays in the queue
- AND the blacklist is unchanged

### Requirement: Blacklist Is Visible Only to the Host
Reading the blacklist, editing it and searching for artists to block MUST require the host credential. Requests without it MUST be rejected as unauthorized. Guests MUST NOT be shown the blacklist entries or the reason why a song is blocked.

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
