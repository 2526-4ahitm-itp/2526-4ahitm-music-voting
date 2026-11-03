# Spec Delta: search

## ADDED Requirements

### Requirement: Blacklisted Search Results Cannot Be Added
Search results MUST indicate whether each track matches the party's blacklist. In the web guest and host search, a blocked result MUST still be shown but greyed out, with a disabled "+". The host search additionally shows the hint "Nicht erlaubt."; the guest search MUST NOT show any text hint, only the greyed-out result. The result MUST NOT reveal which blacklist entry caused the block.

#### Scenario: Guest sees a blocked song in search
- GIVEN the blacklist contains the word "live"
- WHEN a guest searches and "Song X (Live)" appears in the results
- THEN "Song X (Live)" is shown greyed out with a disabled "+"
- AND no hint text such as "Nicht erlaubt." is shown next to it
- AND other results remain addable

#### Scenario: Host sees a blocked song in search
- GIVEN the blacklist contains the word "live"
- WHEN the host searches and "Song X (Live)" appears in the results
- THEN "Song X (Live)" is shown greyed out with a disabled "+"
- AND the hint "Nicht erlaubt." is shown

#### Scenario: Blocked result does not reveal the reason
- GIVEN the blacklist contains artist A
- WHEN a guest searches and a song by artist A appears in the results
- THEN the result is marked as not allowed
- AND neither the blocked artist nor any other blacklist entry is shown to the guest

#### Scenario: Song blocked by the host is greyed out on the next search
- GIVEN the host blocked song X via "Song sperren"
- WHEN a guest searches and song X appears in the results
- THEN song X is shown greyed out with a disabled "+"

#### Scenario: Open search results update as soon as the host blocks a song
- GIVEN a guest has search results open in the web app and song X is shown addable
- WHEN the host blocks song X via "Song sperren"
- THEN the guest's results update without the guest searching again
- AND song X is shown greyed out with a disabled "+"
- AND the update does not tell the guest which entry was added
