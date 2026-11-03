# Spec Delta

## MODIFIED Requirements

### Requirement: Blacklisted Search Results Cannot Be Added
Search results MUST indicate whether each track matches the party's blacklist. In the web host search, a blocked result MUST still be shown but greyed out, with a disabled "+" and the hint "Nicht erlaubt.". In the web guest search, a song by a banned artist MUST NOT be shown at all; a song blocked only by a word or song entry MUST be shown greyed out with a disabled "+" and no text next to it. When the guest search removed songs or shows greyed-out songs, a hint MUST appear below the search field: "Dieser Artist ist nicht zulässig." if songs were removed and the search term is the name of a banned artist (case-insensitive, surrounding spaces ignored), otherwise "Einige Ergebnisse sind auf dieser Party nicht zulässig.". The hint MUST NOT say which result is affected or why. If every result was removed, this hint MUST replace "Keine Treffer für „…“". The result MUST NOT list or reveal any blacklist entry other than the artist the guest searched for by name.

#### Scenario: Guest sees a blocked song in search
- GIVEN the blacklist contains the word "live"
- WHEN a guest searches and "Song X (Live)" appears in the results
- THEN "Song X (Live)" is shown greyed out with a disabled "+"
- AND no hint text such as "Nicht erlaubt." is shown next to it
- AND "Einige Ergebnisse sind auf dieser Party nicht zulässig." is shown below the search field
- AND other results remain addable

#### Scenario: Host sees a blocked song in search
- GIVEN the blacklist contains the word "live"
- WHEN the host searches and "Song X (Live)" appears in the results
- THEN "Song X (Live)" is shown greyed out with a disabled "+"
- AND the hint "Nicht erlaubt." is shown

#### Scenario: Host still sees songs of a banned artist
- GIVEN the blacklist contains artist A
- WHEN the host searches for "A"
- THEN the songs of artist A are shown greyed out with "Nicht erlaubt."

#### Scenario: Guest searches for a banned artist by name
- GIVEN the blacklist contains artist "Drake"
- WHEN a guest searches for "drake"
- THEN no song by Drake is shown
- AND "Dieser Artist ist nicht zulässig." is shown below the search field
- AND songs by other artists in the results remain shown

#### Scenario: Banned artist's songs are hidden from an unrelated search
- GIVEN the blacklist contains artist A
- WHEN a guest searches for a term that is not A's name and a song by artist A is among the results
- THEN that song is not shown
- AND "Einige Ergebnisse sind auf dieser Party nicht zulässig." is shown below the search field
- AND artist A's name is not shown anywhere

#### Scenario: All results hidden
- GIVEN the blacklist contains artist "Drake"
- WHEN a guest searches for "Drake" and every result is a song by Drake
- THEN "Dieser Artist ist nicht zulässig." is shown
- AND "Keine Treffer für „Drake“" is not shown

#### Scenario: No hint when nothing was hidden or greyed out
- GIVEN the blacklist contains artist A
- WHEN a guest searches and no result is by artist A or otherwise blocked
- THEN no hint about blocked results is shown

#### Scenario: Blocked result does not reveal the reason
- GIVEN the blacklist contains the word "live"
- WHEN a guest searches and a song blocked by that word appears in the results
- THEN the result is marked as not allowed
- AND neither the word nor any other blacklist entry is shown to the guest

#### Scenario: Song blocked by the host is greyed out on the next search
- GIVEN the host blocked song X via "Song sperren"
- WHEN a guest searches and song X appears in the results
- THEN song X is shown greyed out with a disabled "+"
- AND "Einige Ergebnisse sind auf dieser Party nicht zulässig." is shown below the search field

#### Scenario: Open search results update as soon as the host blocks a song
- GIVEN a guest has search results open in the web app and song X is shown addable
- WHEN the host blocks song X via "Song sperren"
- THEN the guest's results update without the guest searching again
- AND song X is shown greyed out with a disabled "+"
- AND the update does not tell the guest which entry was added

#### Scenario: Open search results update when the host bans an artist
- GIVEN a guest has search results open in the web app that include a song by artist A
- WHEN the host adds artist A to the blacklist
- THEN the guest's results update without the guest searching again
- AND the song by artist A is no longer shown
