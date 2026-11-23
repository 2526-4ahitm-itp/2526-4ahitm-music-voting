# Spec Delta

## ADDED Requirements

### Requirement: iOS Search Applies the Party Blacklist Like the Web
The iOS search MUST treat blacklisted results like the web search of the same role. For guests it MUST request guest results, so songs by banned artists are not shown, and show the same hint below the search field. Blocked results MUST be greyed out with a disabled "+"; guests MUST NOT see a reason (accessibility label "Nicht verfügbar"), the host sees "Nicht erlaubt.". An open search MUST refresh when the host changes the blacklist.

#### Scenario: iOS guest sees a blocked song greyed out
- **GIVEN** the blacklist contains the word "live"
- **WHEN** a guest searches in the iOS app and "Song X (Live)" is a result
- **THEN** "Song X (Live)" is shown greyed out with a disabled "+" and no reason next to it
- **AND** "Einige Ergebnisse sind auf dieser Party nicht zulässig." is shown below the search field

#### Scenario: iOS guest searches for a banned artist
- **GIVEN** artist A is on the blacklist
- **WHEN** a guest searches for "A" in the iOS app
- **THEN** no song by artist A is listed
- **AND** "Dieser Artist ist nicht zulässig." is shown instead of "Keine Ergebnisse gefunden." if nothing else remains

#### Scenario: iOS host sees why a song is blocked
- **GIVEN** the blacklist contains the word "live"
- **WHEN** the host searches in the iOS app and "Song X (Live)" is a result
- **THEN** it is shown greyed out with a disabled "+" and the text "Nicht erlaubt."

#### Scenario: Blacklist change refreshes an open iOS search
- **GIVEN** a guest has search results open in the iOS app
- **WHEN** the host adds or removes a blacklist entry
- **THEN** the iOS search runs again and shows the updated greyed-out results and hint
