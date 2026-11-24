# Spec Delta: search

## ADDED Requirements

### Requirement: Blocklisted Search Results Cannot Be Added
Search results MUST indicate whether each track matches the party's blocklist. In the web host search, a blocked result MUST still be shown but greyed out, with a disabled "+" and the hint "Nicht erlaubt.". In the web guest search, a song by a banned artist MUST NOT be shown at all; a song blocked only by a word or song entry MUST be shown greyed out with a disabled "+" and no text next to it. When the guest search removed songs or shows greyed-out songs, a hint MUST appear below the search field: "Dieser Artist ist vom Gastgeber gesperrt." if songs were removed and the search term is the name of a banned artist (case-insensitive, surrounding spaces ignored), otherwise "Einige Ergebnisse sind vom Gastgeber gesperrt.". The hint MUST NOT say which result is affected or why. If every result was removed, this hint MUST replace "Keine Treffer für „…“". The result MUST NOT list or reveal any blocklist entry other than the artist the guest searched for by name.

#### Scenario: Guest sees a blocked song in search
- GIVEN the blocklist contains the word "live"
- WHEN a guest searches and "Song X (Live)" appears in the results
- THEN "Song X (Live)" is shown greyed out with a disabled "+"
- AND no hint text such as "Nicht erlaubt." is shown next to it
- AND "Einige Ergebnisse sind vom Gastgeber gesperrt." is shown below the search field
- AND other results remain addable

#### Scenario: Host sees a blocked song in search
- GIVEN the blocklist contains the word "live"
- WHEN the host searches and "Song X (Live)" appears in the results
- THEN "Song X (Live)" is shown greyed out with a disabled "+"
- AND the hint "Nicht erlaubt." is shown

#### Scenario: Host still sees songs of a banned artist
- GIVEN the blocklist contains artist A
- WHEN the host searches for "A"
- THEN the songs of artist A are shown greyed out with "Nicht erlaubt."

#### Scenario: Guest searches for a banned artist by name
- GIVEN the blocklist contains artist "Drake"
- WHEN a guest searches for "drake"
- THEN no song by Drake is shown
- AND "Dieser Artist ist vom Gastgeber gesperrt." is shown below the search field
- AND songs by other artists in the results remain shown

#### Scenario: Banned artist's songs are hidden from an unrelated search
- GIVEN the blocklist contains artist A
- WHEN a guest searches for a term that is not A's name and a song by artist A is among the results
- THEN that song is not shown
- AND "Einige Ergebnisse sind vom Gastgeber gesperrt." is shown below the search field
- AND artist A's name is not shown anywhere

#### Scenario: All results hidden
- GIVEN the blocklist contains artist "Drake"
- WHEN a guest searches for "Drake" and every result is a song by Drake
- THEN "Dieser Artist ist vom Gastgeber gesperrt." is shown
- AND "Keine Treffer für „Drake“" is not shown

#### Scenario: No hint when nothing was hidden or greyed out
- GIVEN the blocklist contains artist A
- WHEN a guest searches and no result is by artist A or otherwise blocked
- THEN no hint about blocked results is shown

#### Scenario: Blocked result does not reveal the reason
- GIVEN the blocklist contains the word "live"
- WHEN a guest searches and a song blocked by that word appears in the results
- THEN the result is marked as not allowed
- AND neither the word nor any other blocklist entry is shown to the guest

#### Scenario: Song blocked by the host is greyed out on the next search
- GIVEN the host blocked song X via "Song entfernen" → "Entfernen und sperren"
- WHEN a guest searches and song X appears in the results
- THEN song X is shown greyed out with a disabled "+"
- AND "Einige Ergebnisse sind vom Gastgeber gesperrt." is shown below the search field

#### Scenario: Open search results update as soon as the host blocks a song
- GIVEN a guest has search results open in the web app and song X is shown addable
- WHEN the host blocks song X via "Song entfernen" → "Entfernen und sperren"
- THEN the guest's results update without the guest searching again
- AND song X is shown greyed out with a disabled "+"
- AND the update does not tell the guest which entry was added

#### Scenario: Open search results update when the host bans an artist
- GIVEN a guest has search results open in the web app that include a song by artist A
- WHEN the host adds artist A to the blocklist
- THEN the guest's results update without the guest searching again
- AND the song by artist A is no longer shown

### Requirement: iOS Search Applies the Party Blocklist Like the Web
The iOS search MUST treat blocklisted results like the web search of the same role. For guests it MUST request guest results, so songs by banned artists are not shown, and show the same hint below the search field. Blocked results MUST be greyed out with a disabled "+"; guests MUST NOT see a reason (accessibility label "Nicht verfügbar"), the host sees "Nicht erlaubt.". An open search MUST refresh when the host changes the blocklist.

#### Scenario: iOS guest sees a blocked song greyed out
- **GIVEN** the blocklist contains the word "live"
- **WHEN** a guest searches in the iOS app and "Song X (Live)" is a result
- **THEN** "Song X (Live)" is shown greyed out with a disabled "+" and no reason next to it
- **AND** "Einige Ergebnisse sind auf dieser Party nicht zulässig." is shown below the search field

#### Scenario: iOS guest searches for a banned artist
- **GIVEN** artist A is on the blocklist
- **WHEN** a guest searches for "A" in the iOS app
- **THEN** no song by artist A is listed
- **AND** "Dieser Artist ist nicht zulässig." is shown instead of "Keine Ergebnisse gefunden." if nothing else remains

#### Scenario: iOS host sees why a song is blocked
- **GIVEN** the blocklist contains the word "live"
- **WHEN** the host searches in the iOS app and "Song X (Live)" is a result
- **THEN** it is shown greyed out with a disabled "+" and the text "Nicht erlaubt."

#### Scenario: Blocklist change refreshes an open iOS search
- **GIVEN** a guest has search results open in the iOS app
- **WHEN** the host adds or removes a blocklist entry
- **THEN** the iOS search runs again and shows the updated greyed-out results and hint

## REMOVED Requirements

### Requirement: Blacklisted Search Results Cannot Be Added
**Reason**: Renamed: "Blacklist" is now called "Blocklist" everywhere (team decision 2026-11-23).
**Migration**: Replaced by "Blocklisted Search Results Cannot Be Added" with the same behaviour.

### Requirement: iOS Search Applies the Party Blacklist Like the Web
**Reason**: Renamed: "Blacklist" is now called "Blocklist" everywhere (team decision 2026-11-23).
**Migration**: Replaced by "iOS Search Applies the Party Blocklist Like the Web" with the same behaviour.
