# Spec Delta: search

## ADDED Requirements

### Requirement: Blacklisted Search Results Cannot Be Added
Search results MUST indicate whether each track matches the party's blacklist. In the web guest and host search, a blocked result MUST still be shown but greyed out, with a disabled "+" and the hint "Nicht erlaubt." The result MUST NOT reveal which blacklist entry caused the block.

#### Scenario: Guest sees a blocked song in search
- GIVEN the blacklist contains the word "live"
- WHEN a guest searches and "Song X (Live)" appears in the results
- THEN "Song X (Live)" is shown greyed out with a disabled "+"
- AND the hint "Nicht erlaubt." is shown
- AND other results remain addable

#### Scenario: Blocked result does not reveal the reason
- GIVEN the blacklist contains artist A
- WHEN a guest searches and a song by artist A appears in the results
- THEN the result is marked as not allowed
- AND neither the blocked artist nor any other blacklist entry is shown to the guest

#### Scenario: Song blocked by the host is greyed out on the next search
- GIVEN the host blocked song X via "Song sperren"
- WHEN a guest searches and song X appears in the results
- THEN song X is shown greyed out with a disabled "+"
